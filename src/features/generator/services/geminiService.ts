import type { Category } from '@/types';
import { apiFetch } from '@/lib/apiClient';

const resizeAndPadImage = async (fileOrUrl: File | string, targetAspectRatio: '16:9' | '9:16' | '1:1'): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Important for fetching from URLs

        img.onload = () => {
            const originalWidth = img.width;
            const originalHeight = img.height;

            const targetRatio = eval(targetAspectRatio.replace(':', '/'));

            let newWidth = originalWidth;
            let newHeight = originalHeight;

            if (targetRatio > originalWidth / originalHeight) {
                newWidth = originalHeight * targetRatio;
            } else {
                newHeight = originalWidth / targetRatio;
            }

            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Failed to get canvas context'));
            }

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, newWidth, newHeight);

            const x = (newWidth - originalWidth) / 2;
            const y = (newHeight - originalHeight) / 2;

            ctx.drawImage(img, x, y, originalWidth, originalHeight);

            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas to Blob conversion failed'));
                }
            }, 'image/jpeg', 0.95); // Use JPEG for smaller size
        };

        img.onerror = () => {
            reject(new Error('Image loading failed'));
        };

        if (typeof fileOrUrl === 'string') {
            img.src = fileOrUrl;
        } else { // It's a File or Blob
            img.src = URL.createObjectURL(fileOrUrl);
        }
    });
};


const fileOrUrlToBase64 = async (fileOrUrl: File | string | Blob): Promise<{ data: string; mimeType: string }> => {
  let mimeType: string;
  let data: string;

  if (typeof fileOrUrl === 'string') {
    // Handle URL
    const response = await fetch(fileOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${fileOrUrl}`);
    }
    const blob = await response.blob();
    mimeType = blob.type;
    data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // Handle File or Blob object
    mimeType = fileOrUrl.type;
    data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(fileOrUrl);
    });
  }

  return { data, mimeType };
};


export const generateProductImages = async (
  category: Category,
  formData: Record<string, string | File>
): Promise<string[]> => {

  // Check for productImage (from file upload) or presetImage (from preset selection)
  const imageFileOrUrl = formData.productImage || formData.presetImage;
  if (!imageFileOrUrl) {
    throw new Error("Image file is missing.");
  }

  const backgroundRefFile = formData.backgroundReferenceImage;
  const modelFile = formData.modelImage;
  const clothingFile = formData.clothingImage;
  const consistencyFile = formData.consistencyReferenceImage;

  const aspectRatio = formData.aspectRatio as '16:9' | '9:16' | '1:1' | undefined;
  let imageToSend: File | string | Blob = imageFileOrUrl;

  // Experiment: Resize the input image to match the target aspect ratio
  if (aspectRatio && imageFileOrUrl && aspectRatio !== '1:1') {
      try {
          console.log(`Resizing image to ${aspectRatio}...`);
          imageToSend = await resizeAndPadImage(imageFileOrUrl, aspectRatio);
      } catch (e) {
          console.error("Image resizing failed, sending original image.", e);
          // Fallback to sending the original image
      }
  }

  const imagePart = await fileOrUrlToBase64(imageToSend);

  // Check if prompt is already generated (e.g., by ProductCollageCreator)
  // If so, use it directly. Otherwise, use category template.
  let prompt: string;
  if (formData.prompt && typeof formData.prompt === 'string') {
    prompt = formData.prompt;
    console.log("Using pre-generated prompt from formData");
  } else {
    // Pass all form data to the template, including files for conditional logic
    prompt = category.promptTemplate(formData as Record<string, string>);
  }
  console.log("Generated Prompt:", prompt);

  const parts: any[] = [{ inlineData: imagePart }];

  if (backgroundRefFile) {
      const backgroundPart = await fileOrUrlToBase64(backgroundRefFile);
      parts.push({ inlineData: backgroundPart });
  }

  if (modelFile) {
      const modelPart = await fileOrUrlToBase64(modelFile);
      parts.push({ inlineData: modelPart });
  }

  if (clothingFile) {
      const clothingPart = await fileOrUrlToBase64(clothingFile);
      parts.push({ inlineData: clothingPart });
  }

  if (consistencyFile) {
      const consistencyPart = await fileOrUrlToBase64(consistencyFile);
      parts.push({ inlineData: consistencyPart });
  }

  parts.push({ text: prompt });

  try {
    // Call backend endpoint instead of direct Gemini API
    const response = await apiFetch('/api/gemini/generate', {
      method: 'POST',
      body: JSON.stringify({
        parts,
        aspectRatio
      })
    }) as { image: string };

    if (!response.image) {
      throw new Error("API did not return an image.");
    }

    return [response.image];

  } catch (error) {
    console.error("Error generating images with Gemini API:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("Failed to generate image. Please check console for details.");
  }
};

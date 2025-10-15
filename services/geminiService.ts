import { GoogleGenAI, Modality, GenerateContentResponse, Part } from "@google/genai";
import type { Category } from '../types';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set. Please add it to your environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

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


const fileOrUrlToGenerativePart = async (fileOrUrl: File | string | Blob) => {
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

  return {
    inlineData: { data, mimeType },
  };
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

  const imagePart = await fileOrUrlToGenerativePart(imageToSend);
  
  // Pass all form data to the template, including files for conditional logic
  const prompt = category.promptTemplate(formData as Record<string, string>);
  console.log("Generated Prompt:", prompt);
  
  const parts: Part[] = [imagePart];
  
  if (backgroundRefFile) {
      const backgroundPart = await fileOrUrlToGenerativePart(backgroundRefFile);
      parts.push(backgroundPart);
  }
  
  if (modelFile) {
      const modelPart = await fileOrUrlToGenerativePart(modelFile);
      parts.push(modelPart);
  }

  if (clothingFile) {
      const clothingPart = await fileOrUrlToGenerativePart(clothingFile);
      parts.push(clothingPart);
  }
  
  if (consistencyFile) {
      const consistencyPart = await fileOrUrlToGenerativePart(consistencyFile);
      parts.push(consistencyPart);
  }

  parts.push({ text: prompt });

  const contents = { parts };

  const generateSingleImage = async (): Promise<string> => {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: contents,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        ...(aspectRatio && { imageConfig: { aspectRatio } })
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    // Check for safety ratings and provide a more informative error
    const candidate = response.candidates[0];
    if (candidate.finishReason !== 'STOP' && candidate.safetyRatings) {
      const blockedRating = candidate.safetyRatings.find(rating => rating.blocked);
      if (blockedRating) {
        console.warn('Image generation blocked due to safety settings. Category:', blockedRating.category);
        throw new Error(`이미지 생성이 안전 설정에 의해 차단되었습니다. (사유: ${blockedRating.category}) 다른 이미지나 프롬프트를 시도해주세요.`);
      }
    }
    throw new Error("API가 이미지를 반환하지 않았습니다. 모델이 요청을 거부했을 수 있습니다.");
  };

  try {
    const imagePromises = [generateSingleImage()];
    const images = await Promise.all(imagePromises);
    
    if (images.length === 0) {
      throw new Error("API가 이미지를 반환하지 않았습니다.");
    }
    
    return images;

  } catch (error) {
    console.error("Error generating images with Gemini API:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("알 수 없는 오류로 이미지 생성에 실패했습니다. 콘솔을 확인해주세요.");
  }
};
import type { Category } from '@/types';
import { apiFetch } from '@/lib/apiClient';

// Helper function to convert File/Blob to base64
const fileToBase64 = async (file: File | Blob): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper function for image editing using preset image
const generateImageEdit = async (formData: Record<string, string | File>, prompt: string): Promise<string[]> => {
    const imageFile = formData.productImage as File;

    if (!imageFile) {
        throw new Error("Image file is missing for image editing.");
    }

    try {
        console.log(`Sending image edit request with file: ${imageFile.name}, type: ${imageFile.type}, size: ${imageFile.size} bytes`);
        console.log(`Prompt: ${prompt}`);

        // Convert image to base64
        const imageBase64 = await fileToBase64(imageFile);

        // Call backend endpoint instead of direct OpenAI API
        const response = await apiFetch('/api/openai/generate', {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            imageBase64,
            mode: 'edit'
          })
        }) as { image: string };

        if (!response.image) {
          throw new Error("API did not return an image.");
        }

        return [response.image];
    } catch (error) {
        console.error("Error editing image with OpenAI:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Unknown error occurred while editing image with OpenAI.");
    }
};

// Function for text-to-image generation
const generateTextToImage = async (formData: Record<string, string | File>): Promise<string[]> => {
    // Use the already formatted prompt from customRequest or prompt field
    // The prompt is already structured in ProductCollageCreator with all necessary parts
    const prompt = formData.customRequest as string || formData.prompt as string || 'Generate a professional product image';

    console.log('FormData keys:', Object.keys(formData));
    console.log('productName in formData:', formData.productName);
    console.log('Final prompt for OpenAI:', prompt);

    // Check if we have a preset image path to load
    const presetImagePath = formData.presetImage as string;
    if (presetImagePath) {
        console.log("Loading preset image from path:", presetImagePath);
        try {
            // Load the image from the path (handle both absolute and relative URLs)
            const imageUrl = presetImagePath.startsWith('http')
                ? presetImagePath
                : `${window.location.origin}${presetImagePath}`;

            console.log("Fetching image from:", imageUrl);
            const imageResponse = await fetch(imageUrl);

            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
            }

            const imageBlob = await imageResponse.blob();

            // Ensure PNG format for OpenAI images/edits
            const imageFile = new File([imageBlob], 'product.png', { type: 'image/png' });

            // Use image editing instead of generation
            console.log("Using image-to-image with preset image");
            formData.productImage = imageFile;

            // Generate using the image editing endpoint
            return await generateImageEdit(formData, prompt);
        } catch (error) {
            console.error("Failed to load preset image, falling back to text-to-image:", error);
            // Continue with text-to-image generation
        }
    }

    try {
        // Call backend endpoint instead of direct OpenAI API
        const response = await apiFetch('/api/openai/generate', {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            mode: 'generation'
          })
        }) as { image: string };

        if (!response.image) {
          throw new Error("API did not return an image.");
        }

        return [response.image];

    } catch (error) {
        console.error("Error generating text-to-image with OpenAI:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Unknown error occurred while generating text-to-image with OpenAI.");
    }
};


export const generateProductImagesOpenAI = async (
    category: Category,
    formData: Record<string, string | File>
): Promise<string[]> => {

    console.log("FormData received:", Object.keys(formData));
    console.log("Generation type:", formData.generationType);

    // Check if this is text-to-image generation
    if (formData.generationType === 'text-to-image') {
        return await generateTextToImage(formData);
    }

    // Original image editing logic
    console.log("Product image data:", formData.productImage);

    const imageFile = formData.productImage as File;
    if (!imageFile) {
        throw new Error("Image file is missing from form data.");
    }

    if (!(imageFile instanceof File)) {
        throw new Error("Product image is not a valid File object.");
    }

    if (imageFile.size === 0) {
        throw new Error("Image file is empty (0 bytes). Please select a valid image file.");
    }

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
    console.log("Generated Prompt for OpenAI:", prompt);

    try {
        console.log(`Sending request with file: ${imageFile.name}, type: ${imageFile.type}, size: ${imageFile.size} bytes`);
        console.log(`Prompt: ${prompt}`);

        // Convert image to base64
        const imageBase64 = await fileToBase64(imageFile);

        // Call backend endpoint instead of direct OpenAI API
        const response = await apiFetch('/api/openai/generate', {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            imageBase64,
            mode: 'edit'
          })
        }) as { image: string };

        if (!response.image) {
          throw new Error("API did not return an image.");
        }

        return [response.image];

    } catch (error) {
        console.error("Error generating images with OpenAI:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Unknown error occurred while generating images with OpenAI.");
    }
};

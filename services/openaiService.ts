import type { Category } from '../types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY environment variable is not set.");
}

// Helper function to determine MIME type from file extension
const getMimeTypeFromExtension = (filename: string): string => {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'webp':
            return 'image/webp';
        default:
            return 'image/png'; // Default fallback
    }
};


export const generateProductImagesOpenAI = async (
    category: Category,
    formData: Record<string, string | File>
): Promise<string[]> => {
    
    if (!OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not set. Please add OPENAI_API_KEY to your .env.local file.");
    }
    
    const imageFile = formData.productImage as File;
    if (!imageFile) {
        throw new Error("Image file is missing.");
    }
    
    // Determine correct MIME type
    const detectedMimeType = imageFile.type || getMimeTypeFromExtension(imageFile.name);
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!supportedTypes.includes(detectedMimeType)) {
        throw new Error(`Unsupported file type: ${detectedMimeType}. Supported formats: JPEG, PNG, WebP`);
    }
    
    // Generate prompt using the category template
    const prompt = category.promptTemplate(formData as Record<string, string>);
    console.log("Generated Prompt for OpenAI gpt-image-1:", prompt);
    
    try {
        // Use OpenAI gpt-image-1 for image editing/transformation
        const formDataForAPI = new FormData();
        
        // Ensure proper file type by creating a new File object with correct MIME type
        const correctedFile = new File([imageFile], imageFile.name, {
            type: detectedMimeType
        });
        
        console.log(`File MIME type: ${correctedFile.type}, Size: ${correctedFile.size} bytes`);
        
        formDataForAPI.append('image', correctedFile);
        formDataForAPI.append('prompt', prompt);
        formDataForAPI.append('model', 'gpt-image-1');
        
        const response = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: formDataForAPI
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            throw new Error("OpenAI API did not return any images.");
        }
        
        // Handle both URL and base64 responses
        const images = await Promise.all(data.data.map(async (item: any) => {
            if (item.b64_json) {
                return `data:image/png;base64,${item.b64_json}`;
            } else if (item.url) {
                // Convert URL to base64 for consistency with the app
                try {
                    const imageResponse = await fetch(item.url);
                    const imageBlob = await imageResponse.blob();
                    return new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(imageBlob);
                    });
                } catch (error) {
                    console.error('Error converting URL to base64:', error);
                    return item.url; // Fallback to URL
                }
            }
            throw new Error('No image data found in response');
        }));
        
        return images;
        
    } catch (error) {
        console.error("Error generating images with OpenAI gpt-image-1:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Unknown error occurred while generating images with OpenAI gpt-image-1.");
    }
};


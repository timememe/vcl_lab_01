import type { Category } from '../types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY environment variable is not set.");
}


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
    
    // Generate prompt using the category template
    const prompt = category.promptTemplate(formData as Record<string, string>);
    console.log("Generated Prompt for OpenAI gpt-image-1:", prompt);
    
    try {
        // Use OpenAI gpt-image-1 for image editing/transformation
        const formDataForAPI = new FormData();
        formDataForAPI.append('image', imageFile);
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


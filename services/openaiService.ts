import type { Category } from '../types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY environment variable is not set.");
}

// Helper function to determine MIME type from file extension
const getMimeTypeFromExtension = (filename: string): string => {
    if (!filename || typeof filename !== 'string') {
        return 'image/png'; // Default fallback
    }
    
    const parts = filename.toLowerCase().split('.');
    const extension = parts.length > 1 ? parts.pop() : null;
    
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

// Helper function to validate and process image for OpenAI API
const validateAndProcessImage = async (file: File): Promise<File> => {
    // Check file size (max 4MB)
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
        throw new Error(`Image file too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum size is 4MB.`);
    }
    
    // Ensure we have a valid filename
    const fileName = file.name || 'image.png';
    
    // Ensure proper MIME type
    const detectedMimeType = file.type || getMimeTypeFromExtension(fileName);
    
    // OpenAI /images/edits only supports PNG
    if (detectedMimeType !== 'image/png') {
        throw new Error(`OpenAI images/edits endpoint only supports PNG format. Please convert your ${detectedMimeType} image to PNG first.`);
    }
    
    // Create a new File object with correct type and name
    const finalFileName = fileName.endsWith('.png') ? fileName : fileName + '.png';
    const processedFile = new File([file], finalFileName, {
        type: 'image/png'
    });
    
    console.log(`Processed image: ${processedFile.name}, type: ${processedFile.type}, size: ${processedFile.size} bytes`);
    
    return processedFile;
};

// Helper function to create proper FormData for OpenAI API
const createFormDataForOpenAI = async (file: File, prompt: string): Promise<FormData> => {
    const formData = new FormData();
    
    // Validate and process the image
    const processedFile = await validateAndProcessImage(file);
    
    formData.append('image', processedFile);
    formData.append('prompt', prompt);
    formData.append('model', 'gpt-image-1');
    formData.append('n', '1'); // Number of images to generate
    formData.append('size', '1024x1024'); // Image size
    
    return formData;
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
    
    // Ensure we have a valid filename
    const fileName = imageFile.name || 'image.png';
    
    // Determine correct MIME type
    const detectedMimeType = imageFile.type || getMimeTypeFromExtension(fileName);
    
    // For OpenAI images/edits, we only support PNG
    if (detectedMimeType !== 'image/png') {
        throw new Error(`OpenAI images/edits only supports PNG format. You uploaded: ${detectedMimeType}. Please convert your image to PNG first.`);
    }
    
    // Generate prompt using the category template
    const prompt = category.promptTemplate(formData as Record<string, string>);
    console.log("Generated Prompt for OpenAI gpt-image-1:", prompt);
    
    try {
        // Create proper FormData for the API
        const formDataForAPI = await createFormDataForOpenAI(imageFile, prompt);
        
        console.log(`Sending request with file: ${imageFile.name}, type: ${imageFile.type}, size: ${imageFile.size} bytes`);
        console.log(`Prompt: ${prompt}`);
        
        // Use fetch API to call OpenAI images.edit endpoint
        const response = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
                // Don't set Content-Type header - let browser set it for FormData
            },
            body: formDataForAPI
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        console.log('Response received from OpenAI API');
        
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


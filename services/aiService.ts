import type { Category, AIModel } from '../types';
import { generateProductImages } from './geminiService';
import { generateProductImagesOpenAI } from './openaiService';

export const generateImages = async (
    model: AIModel,
    category: Category,
    formData: Record<string, string | File>
): Promise<string[]> => {
    switch (model) {
        case 'gemini':
            return await generateProductImages(category, formData);
        case 'openai':
            return await generateProductImagesOpenAI(category, formData);
        default:
            throw new Error(`Unknown AI model: ${model}`);
    }
};
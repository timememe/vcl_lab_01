import type { Category, AIModel } from '@/types';
import { generateProductImages } from './geminiService';
import { generateProductImagesOpenAI } from './openaiService';
import { incrementUsage } from '@/features/admin/services/usageService';

export const generateImages = async (
    model: AIModel,
    category: Category,
    formData: Record<string, string | File>
): Promise<string[]> => {
    let usageIncremented = false;
    try {
        await incrementUsage(category.id, 1);
        usageIncremented = true;
    } catch (error) {
        throw error;
    }

    try {
        switch (model) {
            case 'gemini':
                return await generateProductImages(category, formData);
            case 'openai':
                return await generateProductImagesOpenAI(category, formData);
            default:
                throw new Error(`Unknown AI model: ${model}`);
        }
    } catch (error) {
        if (usageIncremented) {
            try {
                await incrementUsage(category.id, -1);
            } catch (_revertError) {
                // swallow revert errors
            }
        }
        throw error;
    }
};

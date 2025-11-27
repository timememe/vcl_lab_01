import { apiFetch } from './apiClient';

export const generateVideoFromImage = async (
  imageBase64: string,
  prompt: string,
  aspectRatio?: string
): Promise<{ video: string; duration: number | null }> => {
  try {
    const response = await apiFetch('/api/veo/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        imageBase64,
        aspectRatio
      })
    }) as { video: string; duration: number | null };

    if (!response.video) {
      throw new Error('API did not return a video.');
    }

    return response;
  } catch (error) {
    console.error('Error generating video with Veo 3.1:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate video. Please check console for details.');
  }
};

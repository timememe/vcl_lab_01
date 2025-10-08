import { apiFetch } from './apiClient';

export interface SoraGenerationParams {
  prompt: string;
  imageFile?: File | null;
  size?: string;
}

export interface SoraGenerationResponse {
  videoUrl?: string | null;
  videoBase64?: string | null;
  metadata?: {
    id?: string | null;
    status?: string | null;
    created?: number | string | null;
  } | null;
  raw?: unknown;
}

const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const generateSoraVideo = async (
  params: SoraGenerationParams
): Promise<SoraGenerationResponse> => {
  const { prompt, imageFile, size } = params;

  if (!prompt.trim()) {
    throw new Error('Prompt is required');
  }

  let imageBase64: string | undefined;
  let imageName: string | undefined;

  if (imageFile) {
    imageBase64 = await fileToDataURL(imageFile);
    imageName = imageFile.name;
  }

  const payload: Record<string, unknown> = {
    prompt: prompt.trim()
  };

  const sizeValue = typeof size === 'string' ? size.trim() : '';
  if (sizeValue) {
    payload.size = sizeValue;
  }

  if (imageBase64) {
    payload.imageBase64 = imageBase64;
    payload.imageName = imageName;
  }

  const response = await apiFetch('/api/sora/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  }) as SoraGenerationResponse;

  if (!response.videoUrl && response.videoBase64) {
    response.videoUrl = `data:video/mp4;base64,${response.videoBase64}`;
  }

  return response;
};

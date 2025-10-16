import { apiFetch } from './apiClient';
import { getToken } from './authService';

export interface SoraGenerationParams {
  prompt: string;
  imageFile?: File | null;
  size?: string;
  seconds?: number;
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
  statusMessage?: string | null;
  requestId?: string | null;
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
  const { prompt, imageFile, size, seconds } = params;

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

  if (typeof seconds === 'number' && seconds > 0) {
    payload.seconds = seconds;
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

export const checkSoraVideoStatus = async (
  requestId: string
): Promise<SoraGenerationResponse> => {
  const response = await apiFetch(`/api/sora/status/${encodeURIComponent(requestId)}`);
  const parsed = response as SoraGenerationResponse;

  if (!parsed.videoUrl && parsed.videoBase64) {
    parsed.videoUrl = `data:video/mp4;base64,${parsed.videoBase64}`;
  }

  return parsed;
};

export const downloadSoraVideo = async (requestId: string): Promise<Blob> => {
  const token = getToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`/api/sora/download/${encodeURIComponent(requestId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to download video';

    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.message) {
        errorMessage = parsed.message;
      }
    } catch {
      // ignore parse errors
    }

    throw new Error(errorMessage);
  }

  return await response.blob();
};

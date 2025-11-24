import { apiFetch } from './apiClient';
import type { GeneratedImage, SaveImagePayload } from '../types/gallery';

export const galleryService = {
  // Get all images for current user
  async getGallery(limit = 50, category?: string): Promise<GeneratedImage[]> {
    const url = category
      ? `/api/gallery?limit=${limit}&category=${category}`
      : `/api/gallery?limit=${limit}`;
    return await apiFetch(url) as GeneratedImage[];
  },

  // Save generated image to gallery
  async saveImage(payload: SaveImagePayload): Promise<GeneratedImage> {
    return await apiFetch('/api/gallery', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as GeneratedImage;
  },

  // Toggle favorite status
  async toggleFavorite(imageId: number): Promise<GeneratedImage> {
    return await apiFetch(`/api/gallery/${imageId}/favorite`, {
      method: 'PATCH'
    }) as GeneratedImage;
  },

  // Delete image
  async deleteImage(imageId: number): Promise<void> {
    await apiFetch(`/api/gallery/${imageId}`, {
      method: 'DELETE'
    });
  }
};

export interface GeneratedImage {
  id: number;
  user_id: number;
  category_id: string;
  image_url: string;
  thumbnail_url?: string;
  prompt?: string;
  metadata?: Record<string, any>;
  ai_model?: string;
  media_type?: 'image' | 'video';
  duration?: number;
  is_favorite: boolean;
  created_at: string;
}

export interface SaveImagePayload {
  category_id: string;
  image_url: string;
  thumbnail_url?: string;
  prompt?: string;
  metadata?: Record<string, any>;
  ai_model?: string;
  media_type?: 'image' | 'video';
  duration?: number;
}

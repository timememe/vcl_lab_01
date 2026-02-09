export interface Setting {
  id: number;
  category: 'lighting' | 'camera_angle' | 'background';
  value: string;
  label: string;
  description: string | null;
  is_active: number; // SQLite: 0 or 1
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SettingPayload {
  category: 'lighting' | 'camera_angle' | 'background';
  value: string;
  label: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export type SettingCategory = 'lighting' | 'camera_angle' | 'background';

export const SETTING_CATEGORIES: Array<{ value: SettingCategory; label: string }> = [
  { value: 'lighting', label: 'Lighting Styles' },
  { value: 'camera_angle', label: 'Camera Angles' },
  { value: 'background', label: 'Background Types' }
];

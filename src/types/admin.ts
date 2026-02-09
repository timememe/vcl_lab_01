import type { User } from './auth';
import type { Brand, Product } from '../types';

export interface AdminUser extends User {
  assignedBrands: string[];
  dailyCreditLimit?: number;
  createdAt?: string;
}

export interface AdminUserPayload {
  username: string;
  password?: string;
  role: 'admin' | 'user';
  assignedBrandIds: string[];
  dailyCreditLimit?: number;
}

export interface AdminBrand extends Brand {
  products: Product[];
}

export interface AdminBrandCreatePayload {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  logoBase64?: string;
  logoFilename?: string;
  products?: Product[];
}

export interface AdminBrandUpdatePayload {
  name?: string;
  description?: string;
  logo?: string | null;
  logoBase64?: string;
  logoFilename?: string;
  products?: Product[];
}

export interface AdminProductCreatePayload {
  id: string;
  name: string;
  category: string;
  promptTemplate: string;
  presets?: unknown;
  image?: string | null;
  imageBase64?: string;
  imageFilename?: string;
}

export interface AdminProductUpdatePayload {
  name?: string;
  category?: string;
  promptTemplate?: string;
  presets?: unknown;
  image?: string | null;
  imageBase64?: string;
  imageFilename?: string;
}

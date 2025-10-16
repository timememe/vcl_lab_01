import type { User } from './auth';

export interface AdminUser extends User {
  assignedBrands: string[];
  createdAt?: string;
}

export interface AdminUserPayload {
  username: string;
  password?: string;
  role: 'admin' | 'user';
  assignedBrandIds: string[];
}

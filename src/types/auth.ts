export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  assignedBrands?: string[];
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

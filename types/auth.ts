export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export interface LoginResponse {
  token: string;
  user: User;
}

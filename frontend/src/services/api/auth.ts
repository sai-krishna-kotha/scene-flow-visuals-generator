import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },

  async register(email: string, password: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', { email, password });
    return data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }
};

import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  workshopId: string;
  workshopName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('rumilcar_user') || 'null'),
  token: localStorage.getItem('rumilcar_token'),
  isAuthenticated: !!localStorage.getItem('rumilcar_token'),

  login: (user, token) => {
    localStorage.setItem('rumilcar_user', JSON.stringify(user));
    localStorage.setItem('rumilcar_token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('rumilcar_user');
    localStorage.removeItem('rumilcar_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => {
    localStorage.setItem('rumilcar_user', JSON.stringify(user));
    set({ user });
  },
}));

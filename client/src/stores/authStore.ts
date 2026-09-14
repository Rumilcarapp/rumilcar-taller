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
  impersonatedFrom: { user: User; token: string } | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  startImpersonation: (targetUser: User, targetToken: string) => void;
  stopImpersonation: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('rumilcar_user') || 'null'),
  token: localStorage.getItem('rumilcar_token'),
  isAuthenticated: !!localStorage.getItem('rumilcar_token'),
  impersonatedFrom: JSON.parse(localStorage.getItem('rumilcar_impersonate_backup') || 'null'),

  login: (user, token) => {
    localStorage.setItem('rumilcar_user', JSON.stringify(user));
    localStorage.setItem('rumilcar_token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('rumilcar_user');
    localStorage.removeItem('rumilcar_token');
    localStorage.removeItem('rumilcar_impersonate_backup');
    set({ user: null, token: null, isAuthenticated: false, impersonatedFrom: null });
  },

  setUser: (user) => {
    localStorage.setItem('rumilcar_user', JSON.stringify(user));
    set({ user });
  },

  startImpersonation: (targetUser, targetToken) => {
    const currentUser = get().user;
    const currentToken = get().token;
    if (currentUser && currentToken && !get().impersonatedFrom) {
      const backup = { user: currentUser, token: currentToken };
      localStorage.setItem('rumilcar_impersonate_backup', JSON.stringify(backup));
      localStorage.setItem('rumilcar_user', JSON.stringify(targetUser));
      localStorage.setItem('rumilcar_token', targetToken);
      set({
        user: targetUser,
        token: targetToken,
        isAuthenticated: true,
        impersonatedFrom: backup,
      });
    }
  },

  stopImpersonation: () => {
    const backup = get().impersonatedFrom || JSON.parse(localStorage.getItem('rumilcar_impersonate_backup') || 'null');
    if (backup) {
      localStorage.setItem('rumilcar_user', JSON.stringify(backup.user));
      localStorage.setItem('rumilcar_token', backup.token);
      localStorage.removeItem('rumilcar_impersonate_backup');
      set({
        user: backup.user,
        token: backup.token,
        isAuthenticated: true,
        impersonatedFrom: null,
      });
    }
  },
}));

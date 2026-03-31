import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  username: string | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (userId: string, username: string, token: string) => void;
  logout: () => void;
  restore: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  username: null,
  token: null,
  isLoggedIn: false,

  login: (userId, username, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
    set({ userId, username, token, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    set({ userId: null, username: null, token: null, isLoggedIn: false });
  },

  restore: () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    if (token && userId && username) {
      set({ userId, username, token, isLoggedIn: true });
    }
  },
}));

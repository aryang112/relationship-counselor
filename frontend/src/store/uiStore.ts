import { create } from 'zustand';
import type { ThemeMode } from '../theme';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface UIState {
  themeMode: ThemeMode | 'system';
  toasts: Toast[];
  isOffline: boolean;

  setThemeMode: (mode: ThemeMode | 'system') => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  setOffline: (offline: boolean) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  themeMode: 'system',
  toasts: [],
  isOffline: false,

  setThemeMode: (themeMode) => set({ themeMode }),
  addToast: (message, type) => {
    const id = String(++toastId);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setOffline: (isOffline) => set({ isOffline }),
}));

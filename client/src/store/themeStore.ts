import { create } from 'zustand';

interface ThemeState {
  isLight: boolean;
  toggleTheme: () => void;
}

const getInitialTheme = () => {
  const stored = localStorage.getItem('theme');
  return stored === 'light';
};

export const useThemeStore = create<ThemeState>((set) => {
  const isLight = getInitialTheme();
  if (isLight) {
    document.body.classList.add('light-theme');
  }

  return {
    isLight,
    toggleTheme: () => set((state) => {
      const newIsLight = !state.isLight;
      if (newIsLight) {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
      }
      return { isLight: newIsLight };
    }),
  };
});
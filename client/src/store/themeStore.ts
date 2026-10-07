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
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.body.classList.remove('light-theme');
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  return {
    isLight,
    toggleTheme: () => set((state) => {
      const newIsLight = !state.isLight;
      if (newIsLight) {
        document.body.classList.add('light-theme');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
      return { isLight: newIsLight };
    }),
  };
});
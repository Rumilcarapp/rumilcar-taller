import { create } from 'zustand';

interface CurrencyConfig {
  anchorCurrency: string;
  vesRate: number;
  usdtSpread: number;
  autoUpdate: boolean;
  lastUpdated: string | null;
}

interface CurrencyState {
  config: CurrencyConfig;
  setConfig: (config: Partial<CurrencyConfig>) => void;
  convertToVes: (amountUsd: number) => number;
  convertToUsdt: (amountUsd: number) => number;
  convertFromVes: (amountVes: number) => number;
  formatCurrency: (amount: number, currency: string) => string;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  config: {
    anchorCurrency: 'USD',
    vesRate: 0,
    usdtSpread: 0,
    autoUpdate: false,
    lastUpdated: null,
  },

  setConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),

  convertToVes: (amountUsd) => {
    const { vesRate } = get().config;
    if (!vesRate) return 0;
    return Math.round(amountUsd * vesRate * 100) / 100;
  },

  convertToUsdt: (amountUsd) => {
    const { usdtSpread } = get().config;
    return Math.round(amountUsd * (1 + usdtSpread / 100) * 100) / 100;
  },

  convertFromVes: (amountVes) => {
    const { vesRate } = get().config;
    if (!vesRate) return 0;
    return Math.round((amountVes / vesRate) * 100) / 100;
  },

  formatCurrency: (amount, currency) => {
    const formatters: Record<string, (n: number) => string> = {
      USD: (n) => `$${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      VES: (n) => `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      USDT: (n) => `${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`,
    };
    return (formatters[currency] || formatters.USD)(amount);
  },
}));
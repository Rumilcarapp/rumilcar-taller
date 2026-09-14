import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

export interface PaymentMethodConfig {
  key: string;
  label: string;
  enabled: boolean;
}

export interface WorkshopProfile {
  name: string;
  legalName: string;
  taxId: string;
  address: string;
  website: string;
  ownerName: string;
  email: string;
  phone: string;
  anchorCurrency: 'USD' | 'VES';
  usdtSpread: string;
  logoUrl?: string;
  createdAt: string;
  lastLogin: string;
}

interface WorkshopState {
  workshop: WorkshopProfile;
  paymentMethods: PaymentMethodConfig[];
  lastSavedAt: string | null;
  isSaving: boolean;
  updateWorkshop: (updates: Partial<WorkshopProfile>) => void;
  togglePaymentMethod: (key: string) => void;
  setPaymentMethods: (methods: PaymentMethodConfig[]) => void;
  resetToCleanProfile: (customName?: string) => void;
  fetchWorkshop: () => Promise<void>;
}

const DEFAULT_WORKSHOP: WorkshopProfile = {
  name: 'Multiservicios Rumilcar',
  legalName: '',
  taxId: '',
  address: '',
  website: '',
  ownerName: '',
  email: '',
  phone: '',
  anchorCurrency: 'USD',
  usdtSpread: '0',
  createdAt: new Date().toLocaleDateString('es-VE'),
  lastLogin: 'Hoy',
};

const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { key: 'CASH_USD', label: 'Efectivo USD', enabled: true },
  { key: 'CASH_VES', label: 'Efectivo VES', enabled: true },
  { key: 'PAGO_MOVIL', label: 'Pago Móvil', enabled: true },
  { key: 'BANK_TRANSFER', label: 'Transferencia bancaria', enabled: true },
  { key: 'ZELLE', label: 'Zelle', enabled: true },
  { key: 'USDT_WALLET', label: 'USDT / Binance Pay', enabled: true },
  { key: 'POS', label: 'Punto de venta (POS)', enabled: false },
];

let saveDebounceTimer: any = null;

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set, get) => ({
      workshop: DEFAULT_WORKSHOP,
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      lastSavedAt: null,
      isSaving: false,
      fetchWorkshop: async () => {
        try {
          const data = await api.get('/workshop');
          if (data && data.name) {
            set((state) => ({
              workshop: {
                ...state.workshop,
                name: data.name || state.workshop.name,
                legalName: data.legalName || state.workshop.legalName,
                taxId: data.taxId || state.workshop.taxId,
                address: data.address || state.workshop.address,
                website: data.website || state.workshop.website,
                phone: data.phone || state.workshop.phone,
                email: data.email || state.workshop.email,
                anchorCurrency: data.anchorCurrency || state.workshop.anchorCurrency,
                usdtSpread: data.usdtSpread !== undefined ? String(data.usdtSpread) : state.workshop.usdtSpread,
              },
            }));
          }
        } catch {
          // Keep local state if offline
        }
      },
      updateWorkshop: (updates) => {
        set((state) => ({
          workshop: { ...state.workshop, ...updates },
          lastSavedAt: new Date().toISOString(),
        }));

        // Debounce sync with backend PostgreSQL
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(async () => {
          try {
            set({ isSaving: true });
            const current = get().workshop;
            await api.put('/workshop', {
              name: current.name,
              legalName: current.legalName,
              taxId: current.taxId,
              address: current.address,
              website: current.website,
              phone: current.phone,
              email: current.email,
              anchorCurrency: current.anchorCurrency,
              usdtSpread: parseFloat(current.usdtSpread) || 0,
            });
            set({ isSaving: false, lastSavedAt: new Date().toISOString() });
          } catch {
            set({ isSaving: false });
          }
        }, 800);
      },
      togglePaymentMethod: (key) => {
        const nextMethods = get().paymentMethods.map((m) =>
          m.key === key ? { ...m, enabled: !m.enabled } : m
        );
        set({
          paymentMethods: nextMethods,
          lastSavedAt: new Date().toISOString(),
        });

        // Sync with backend
        api.put('/workshop/payment-methods', {
          methods: nextMethods.map((m) => ({ method: m.key, isEnabled: m.enabled })),
        }).catch(() => {});
      },
      setPaymentMethods: (methods) => {
        set({ paymentMethods: methods, lastSavedAt: new Date().toISOString() });
        api.put('/workshop/payment-methods', {
          methods: methods.map((m) => ({ method: m.key, isEnabled: m.enabled })),
        }).catch(() => {});
      },
      resetToCleanProfile: (customName) => {
        set({
          workshop: {
            ...DEFAULT_WORKSHOP,
            name: customName || 'Multiservicios Rumilcar',
          },
          lastSavedAt: new Date().toISOString(),
        });
      },
    }),
    {
      name: 'rumilcar-workshop-profile-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const w = state.workshop;
          const isFictitious =
            !w ||
            w.name === 'Taller Don Pedro' ||
            w.taxId === 'J-12345678-9' ||
            w.email === 'contacto@tallerdonpedro.com' ||
            w.ownerName === 'Pedro Rodríguez';

          if (isFictitious) {
            state.workshop = {
              name: 'Multiservicios Rumilcar',
              legalName: '',
              taxId: '',
              address: '',
              website: '',
              ownerName: '',
              email: '',
              phone: '',
              anchorCurrency: 'USD',
              usdtSpread: '0',
              createdAt: new Date().toLocaleDateString('es-VE'),
              lastLogin: 'Hoy',
            };
          }
        }
      },
    }
  )
);

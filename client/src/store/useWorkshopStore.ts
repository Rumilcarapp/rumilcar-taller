import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  updateWorkshop: (updates: Partial<WorkshopProfile>) => void;
  togglePaymentMethod: (key: string) => void;
  setPaymentMethods: (methods: PaymentMethodConfig[]) => void;
  resetToCleanProfile: (customName?: string) => void;
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

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set) => ({
      workshop: DEFAULT_WORKSHOP,
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      lastSavedAt: null,
      updateWorkshop: (updates) => {
        set((state) => ({
          workshop: { ...state.workshop, ...updates },
          lastSavedAt: new Date().toISOString(),
        }));
      },
      togglePaymentMethod: (key) => {
        set((state) => ({
          paymentMethods: state.paymentMethods.map((m) =>
            m.key === key ? { ...m, enabled: !m.enabled } : m
          ),
          lastSavedAt: new Date().toISOString(),
        }));
      },
      setPaymentMethods: (methods) => {
        set({ paymentMethods: methods, lastSavedAt: new Date().toISOString() });
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

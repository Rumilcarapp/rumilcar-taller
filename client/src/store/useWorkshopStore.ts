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
}

const DEFAULT_WORKSHOP: WorkshopProfile = {
  name: 'Taller Don Pedro',
  legalName: 'Inversiones Don Pedro C.A.',
  taxId: 'J-12345678-9',
  address: 'Av. Principal, Centro Comercial El Mecánico, Local 5, Caracas',
  website: 'www.tallerdonpedro.com',
  ownerName: 'Pedro Rodríguez',
  email: 'contacto@tallerdonpedro.com',
  phone: '0212-5551234',
  anchorCurrency: 'USD',
  usdtSpread: '2',
  createdAt: '15 de marzo de 2024',
  lastLogin: 'Hoy, 10:45 AM',
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
    }),
    {
      name: 'rumilcar-workshop-profile-storage',
    }
  )
);

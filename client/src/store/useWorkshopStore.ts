import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

export interface PaymentMethodConfig {
  key: string;
  label: string;
  enabled: boolean;
}

export interface WorkshopPaymentDetails {
  pagoMovil: {
    banco: string;
    telefono: string;
    cedulaRif: string;
    titular: string;
  };
  transferencia: {
    banco: string;
    numeroCuenta: string;
    cedulaRif: string;
    titular: string;
  };
  zelle: {
    email: string;
    titular: string;
  };
  binanceUSDT: {
    payIdOrEmail: string;
    red: string;
  };
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
  termsAndConditions?: string;
  logoUrl?: string;
  paymentDetails?: WorkshopPaymentDetails;
  googleReviewUrl?: string;
  createdAt: string;
  lastLogin: string;
}

interface WorkshopState {
  workshop: WorkshopProfile;
  paymentMethods: PaymentMethodConfig[];
  lastSavedAt: string | null;
  isSaving: boolean;
  updateWorkshop: (updates: Partial<WorkshopProfile>) => void;
  updatePaymentDetails: (details: Partial<WorkshopPaymentDetails>) => void;
  togglePaymentMethod: (key: string) => void;
  setPaymentMethods: (methods: PaymentMethodConfig[]) => void;
  resetToCleanProfile: (customName?: string) => void;
  fetchWorkshop: () => Promise<void>;
}

export const DEFAULT_TERMS_AND_CONDITIONS = `• Garantía de 30 días o 1.000 KM sobre mano de obra mecánica efectuada en nuestras instalaciones.
• Repuestos eléctricos y electrónicos no poseen garantía una vez instalados, salvo defecto de fábrica comprobable.
• Los presupuestos tienen una vigencia máxima de 7 días continuos sujetos a variación de repuestos.
• Todo vehículo no retirado pasados 5 días hábiles luego de la notificación de entrega generará cargo por estacionamiento.`;

export const DEFAULT_WORKSHOP_PAYMENT_DETAILS: WorkshopPaymentDetails = {
  pagoMovil: {
    banco: '',
    telefono: '',
    cedulaRif: '',
    titular: '',
  },
  transferencia: {
    banco: '',
    numeroCuenta: '',
    cedulaRif: '',
    titular: '',
  },
  zelle: {
    email: '',
    titular: '',
  },
  binanceUSDT: {
    payIdOrEmail: '',
    red: 'TRC-20 (Tron) / Binance Pay',
  },
};

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
  termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS,
  paymentDetails: DEFAULT_WORKSHOP_PAYMENT_DETAILS,
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
          if (data && (data.name || data.id)) {
            set((state) => ({
              workshop: {
                ...state.workshop,
                name: data.name ?? state.workshop.name,
                legalName: data.legalName ?? '',
                taxId: data.taxId ?? '',
                address: data.address ?? '',
                website: data.website ?? '',
                phone: data.phone ?? '',
                email: data.email ?? '',
                ownerName: data.ownerName ?? state.workshop.ownerName,
                termsAndConditions: data.termsAndConditions !== undefined ? (data.termsAndConditions || '') : (state.workshop.termsAndConditions || DEFAULT_TERMS_AND_CONDITIONS),
                logoUrl: data.logoUrl !== undefined ? (data.logoUrl || '') : state.workshop.logoUrl,
                anchorCurrency: data.anchorCurrency || state.workshop.anchorCurrency,
                usdtSpread: data.usdtSpread !== undefined ? String(data.usdtSpread) : state.workshop.usdtSpread,
              },
              lastSavedAt: data.updatedAt || state.lastSavedAt,
            }));
          }
        } catch (err) {
          console.warn('Error al consultar perfil del taller en la nube:', err);
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
            const updated = await api.put('/workshop', {
              name: current.name,
              legalName: current.legalName,
              taxId: current.taxId,
              address: current.address,
              website: current.website,
              phone: current.phone,
              email: current.email,
              ownerName: current.ownerName,
              termsAndConditions: current.termsAndConditions || DEFAULT_TERMS_AND_CONDITIONS,
              logoUrl: current.logoUrl || null,
              anchorCurrency: current.anchorCurrency,
              usdtSpread: parseFloat(current.usdtSpread) || 0,
            });
            set({ isSaving: false, lastSavedAt: updated?.updatedAt || new Date().toISOString() });
          } catch {
            set({ isSaving: false });
          }
        }, 800);
      },
      updatePaymentDetails: (details) => {
        set((state) => ({
          workshop: {
            ...state.workshop,
            paymentDetails: {
              ...(state.workshop.paymentDetails || DEFAULT_WORKSHOP_PAYMENT_DETAILS),
              ...details,
            },
          },
          lastSavedAt: new Date().toISOString(),
        }));
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

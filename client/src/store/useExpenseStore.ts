import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentMethod, useCashStore } from './useCashStore';

export type ExpenseCategory = 
  | 'Repuestos & Insumos' 
  | 'Nómina' 
  | 'Alquiler' 
  | 'Electricidad' 
  | 'Agua / Aseo' 
  | 'Internet & Comunicaciones' 
  | 'Herramientas & Equipos' 
  | 'Mantenimiento Local' 
  | 'Impuestos & Tasas' 
  | 'Servicios Básico' 
  | 'Otros';

export interface Gasto {
  id: string; // EXP-2026-0001
  categoria: ExpenseCategory | string;
  descripcion: string;
  monto: number;
  moneda: 'USD' | 'VES' | 'USDT';
  tasaAplicada: number;
  montoUSD: number;
  metodoPago: PaymentMethod;
  fecha: string;
  esRecurrente?: boolean;
  frecuenciaRecurrencia?: 'semanal' | 'quincenal' | 'mensual' | 'anual';
  proximoVencimiento?: string;
  comprobanteUrl?: string;
  notas?: string;
  isPayrollAuto?: boolean;
  createdAt: string;
}

interface ExpenseState {
  gastos: Gasto[];
  customCategories: string[];
  addGasto: (gasto: Omit<Gasto, 'id' | 'createdAt'>) => void;
  updateGasto: (id: string, gasto: Partial<Gasto>) => void;
  deleteGasto: (id: string) => void;
  addCustomCategory: (cat: string) => void;
  clearGastos: () => void;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      gastos: [],
      customCategories: [],
      addGasto: (gastoData) => {
        const id = 'EXP-2026-' + Math.floor(1000 + Math.random() * 9000).toString();
        const newGasto: Gasto = {
          ...gastoData,
          id,
          createdAt: new Date().toISOString()
        };

        // If cash box is opened, record as an egreso transaction in useCashStore
        const cashStore = useCashStore.getState();
        if (cashStore.isOpened) {
          cashStore.addTransaction(
            'egreso',
            newGasto.montoUSD,
            newGasto.metodoPago,
            `Gasto [${newGasto.categoria}]: ${newGasto.descripcion}`,
            {
              montoVES: newGasto.moneda === 'VES' ? newGasto.monto : undefined,
              tasaCambio: newGasto.tasaAplicada
            }
          );
        }

        set((state) => ({
          gastos: [newGasto, ...state.gastos]
        }));
      },
      updateGasto: (id, gastoData) => set((state) => ({
        gastos: state.gastos.map(g => g.id === id ? { ...g, ...gastoData } : g)
      })),
      deleteGasto: (id) => set((state) => ({
        gastos: state.gastos.filter(g => g.id !== id)
      })),
      addCustomCategory: (cat) => set((state) => ({
        customCategories: state.customCategories.includes(cat) 
          ? state.customCategories 
          : [...state.customCategories, cat]
      })),
      clearGastos: () => set({ gastos: [] })
    }),
    {
      name: 'rumilcar-expense-storage',
      onRehydrateStorage: () => (state) => {
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('rumilcar-expenses-storage');
          }
        } catch (_) {}

        if (state && Array.isArray(state.gastos)) {
          // Remove old mock/demo expenses including the $144 expense and any fictitious records
          state.gastos = state.gastos.filter((g) => {
            const isMockId = ['EXP-2026-0001', 'EXP-2026-0002', 'EXP-2026-0003'].includes(g.id);
            const is144Expense = g.monto === 144 || g.montoUSD === 144;
            const desc = (g.descripcion || '').toLowerCase();
            const isFictitiousDesc =
              desc.includes('carlos martínez') ||
              desc.includes('carlos p.') ||
              desc.includes('corpoelec') ||
              desc.includes('alquiler mensual del local');
            return !isMockId && !is144Expense && !isFictitiousDesc;
          });
        }
      }
    }
  )
);

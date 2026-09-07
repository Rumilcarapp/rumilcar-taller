import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentMethod, useCashStore } from './useCashStore';

export type ExpenseCategory = 
  | 'Electricidad' | 'Agua' | 'Internet' | 'Teléfono'
  | 'Alquiler' | 'Mantenimiento Local'
  | 'Compras Inventario' | 'Herramientas' | 'Combustible' | 'Limpieza'
  | 'Publicidad' | 'Comisiones'
  | 'Nómina' | 'Otros';

export interface Gasto {
  id: string; // EXP-2026-0001
  categoria: ExpenseCategory | string;
  descripcion: string;
  monto: number;
  moneda: 'USD' | 'VES' | 'USDT';
  tasaAplicada: number; // Snapshot of exchange rate at registration
  montoUSD: number;
  metodoPago: PaymentMethod;
  fecha: string;
  esRecurrente: boolean;
  frecuenciaRecurrencia?: 'semanal' | 'quincenal' | 'mensual' | 'anual' | null;
  proximoVencimiento?: string | null;
  comprobanteUrl?: string | null;
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
}

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      gastos: [
        {
          id: 'EXP-2026-0001',
          categoria: 'Alquiler',
          descripcion: 'Alquiler mensual del local del taller',
          monto: 150.00,
          moneda: 'USD',
          tasaAplicada: 40.00,
          montoUSD: 150.00,
          metodoPago: 'Zelle',
          fecha: thirtyDaysAgo,
          esRecurrente: true,
          frecuenciaRecurrencia: 'mensual',
          proximoVencimiento: inTwoDays,
          createdAt: thirtyDaysAgo
        },
        {
          id: 'EXP-2026-0002',
          categoria: 'Electricidad',
          descripcion: 'Factura Corpoelec Agosto',
          monto: 180.00,
          moneda: 'USD',
          tasaAplicada: 40.00,
          montoUSD: 180.00,
          metodoPago: 'Pago Movil',
          fecha: fifteenDaysAgo,
          esRecurrente: true,
          frecuenciaRecurrencia: 'mensual',
          proximoVencimiento: inTwoDays,
          createdAt: fifteenDaysAgo
        },
        {
          id: 'EXP-2026-0003',
          categoria: 'Nómina',
          descripcion: 'Pago quincenal mecánico Carlos Martínez',
          monto: 144.00,
          moneda: 'USD',
          tasaAplicada: 40.00,
          montoUSD: 144.00,
          metodoPago: 'Efectivo',
          fecha: fiveDaysAgo,
          esRecurrente: false,
          isPayrollAuto: true,
          createdAt: fiveDaysAgo
        }
      ],
      customCategories: ['Publicidad RRSS', 'Catering Taller'],
      addGasto: (gastoData) => {
        const state = get();
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

        set({ gastos: [newGasto, ...state.gastos] });
      },
      updateGasto: (id, data) => set((state) => ({
        gastos: state.gastos.map(g => g.id === id ? { ...g, ...data } : g)
      })),
      deleteGasto: (id) => set((state) => ({
        gastos: state.gastos.filter(g => g.id !== id)
      })),
      addCustomCategory: (cat) => set((state) => ({
        customCategories: [...new Set([...state.customCategories, cat])]
      }))
    }),
    {
      name: 'rumilcar-expenses-storage'
    }
  )
);

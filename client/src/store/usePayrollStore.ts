import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentMethod, useCashStore } from './useCashStore';
import { useExpenseStore } from './useExpenseStore';

export type PayrollSchemeType = 'porcentaje' | 'fijo' | 'mixto';

export interface ConfigNominaMecanico {
  mecanicoId: string;
  mecanicoNombre: string;
  esquema: PayrollSchemeType;
  porcentajeServicios?: number; // e.g. 30%
  montoFijo?: number;
  monedaFijo?: 'USD' | 'VES' | 'USDT';
  frecuenciaFijo?: 'semanal' | 'quincenal' | 'mensual';
  montoBaseMixto?: number;
  porcentajeMixtoServicios?: number;
}

export interface PagoMecanico {
  id: string; // PAYROLL-2026-001
  mecanicoId: string;
  mecanicoNombre: string;
  periodoInicio: string;
  periodoFin: string;
  montoDevengadoUSD: number;
  montoPagadoUSD: number;
  moneda: 'USD' | 'VES' | 'USDT';
  tasaAplicada: number;
  metodoPago: PaymentMethod;
  fechaPago: string;
  notas?: string;
  gastoId?: string;
  createdAt: string;
}

interface PayrollState {
  configs: ConfigNominaMecanico[];
  payments: PagoMecanico[];
  saveMechanicConfig: (config: ConfigNominaMecanico) => void;
  addPayrollPayment: (payment: Omit<PagoMecanico, 'id' | 'createdAt'>) => void;
  deletePayrollPayment: (id: string) => void;
  clearPayroll: () => void;
}

export const usePayrollStore = create<PayrollState>()(
  persist(
    (set, get) => ({
      configs: [],
      payments: [],
      saveMechanicConfig: (configData) => set((state) => ({
        configs: [
          ...state.configs.filter(c => c.mecanicoId !== configData.mecanicoId),
          configData
        ]
      })),
      addPayrollPayment: (paymentData) => {
        const state = get();
        const id = 'PAYROLL-2026-' + Math.floor(100 + Math.random() * 900).toString();

        // 1. Create automatic Expense in useExpenseStore
        const expenseStore = useExpenseStore.getState();
        const expenseId = 'EXP-2026-' + Math.floor(1000 + Math.random() * 9000).toString();
        
        const newExpense = {
          id: expenseId,
          categoria: 'Nómina',
          descripcion: `Pago Nómina Mecánico: ${paymentData.mecanicoNombre}`,
          monto: paymentData.montoPagadoUSD,
          moneda: paymentData.moneda,
          tasaAplicada: paymentData.tasaAplicada,
          montoUSD: paymentData.montoPagadoUSD,
          metodoPago: paymentData.metodoPago,
          fecha: paymentData.fechaPago,
          esRecurrente: false,
          notas: paymentData.notas,
          isPayrollAuto: true,
          createdAt: new Date().toISOString()
        };

        // Add expense without double-triggering alert
        expenseStore.addGasto(newExpense);

        const newPaymentRecord: PagoMecanico = {
          ...paymentData,
          id,
          gastoId: expenseId,
          createdAt: new Date().toISOString()
        };

        set({ payments: [newPaymentRecord, ...state.payments] });
      },
      deletePayrollPayment: (id) => set((state) => ({
        payments: state.payments.filter(p => p.id !== id)
      })),
      clearPayroll: () => set({ configs: [], payments: [] })
    }),
    {
      name: 'rumilcar-payroll-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (Array.isArray(state.payments)) {
            state.payments = state.payments.filter(
              (p) =>
                p.id !== 'PAYROLL-2026-001' &&
                p.montoDevengadoUSD !== 144 &&
                p.montoPagadoUSD !== 144 &&
                !p.mecanicoNombre?.toLowerCase().includes('carlos martínez') &&
                !p.mecanicoNombre?.toLowerCase().includes('pedro rodríguez') &&
                !p.mecanicoNombre?.toLowerCase().includes('luis garcía')
            );
          }
          if (Array.isArray(state.configs)) {
            state.configs = state.configs.filter(
              (c) =>
                !['Carlos P.', 'Pedro R.', 'Luis G.'].includes(c.mecanicoId) &&
                !c.mecanicoNombre?.toLowerCase().includes('carlos martínez') &&
                !c.mecanicoNombre?.toLowerCase().includes('pedro rodríguez') &&
                !c.mecanicoNombre?.toLowerCase().includes('luis garcía')
            );
          }
        }
      }
    }
  )
);

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
}

export const usePayrollStore = create<PayrollState>()(
  persist(
    (set, get) => ({
      configs: [
        {
          mecanicoId: 'Carlos P.',
          mecanicoNombre: 'Carlos Martínez (Carlos P.)',
          esquema: 'porcentaje',
          porcentajeServicios: 30
        },
        {
          mecanicoId: 'Pedro R.',
          mecanicoNombre: 'Pedro Rodríguez (Pedro R.)',
          esquema: 'fijo',
          montoFijo: 200,
          monedaFijo: 'USD',
          frecuenciaFijo: 'quincenal'
        },
        {
          mecanicoId: 'Luis G.',
          mecanicoNombre: 'Luis García (Luis G.)',
          esquema: 'mixto',
          montoBaseMixto: 100,
          porcentajeMixtoServicios: 15
        }
      ],
      payments: [
        {
          id: 'PAYROLL-2026-001',
          mecanicoId: 'Carlos P.',
          mecanicoNombre: 'Carlos Martínez (Carlos P.)',
          periodoInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          periodoFin: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          montoDevengadoUSD: 144.00,
          montoPagadoUSD: 100.00,
          moneda: 'USD',
          tasaAplicada: 40.00,
          metodoPago: 'Efectivo',
          fechaPago: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          notas: 'Abono parcial quincena',
          gastoId: 'EXP-2026-0003',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
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
      }))
    }),
    {
      name: 'rumilcar-payroll-storage'
    }
  )
);

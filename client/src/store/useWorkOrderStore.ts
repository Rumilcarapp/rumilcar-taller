import { create } from 'zustand';
import { useInventoryStore } from './useInventoryStore';
import { useCashStore, PaymentMethod } from './useCashStore';
import { persist } from 'zustand/middleware';

export type OrderStatus = 'Presupuesto' | 'Rechazado' | 'Recibido' | 'En Proceso' | 'Listo' | 'Finalizado';

export interface PaymentRecord {
  id?: string;
  method: PaymentMethod;
  amountUSD: number;
  amountVES?: number;
  rate?: number;
  reference?: string;
  note?: string;
  date: string;
}

export interface WorkOrder {
  id: string;
  client: any;
  vehicle: any;
  services: any[];
  parts: any[];
  date: string;
  deliveredAt?: string;
  totalUSD: number;
  status: OrderStatus;
  mechanicName?: string;
  partsDeducted?: boolean;
  paymentMethod?: PaymentMethod | 'Mixto';
  payments?: PaymentRecord[];
  paidAt?: string;
  mileage?: number | string;
  mileageUnit?: 'km' | 'mi';
  fuelPercentage?: number;
  fuelLevel?: string;
  belongings?: string[];
  inspectionNotes?: string;
  photos?: any[];
}

interface WorkOrderState {
  workOrders: WorkOrder[];
  addWorkOrder: (order: WorkOrder) => void;
  updateWorkOrder: (id: string, order: Partial<WorkOrder>) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  payAndFinalizeOrder: (id: string, payments: PaymentRecord[]) => void;
  addPartialPayment: (id: string, payment: Omit<PaymentRecord, 'id'>) => void;
  deleteWorkOrder: (id: string) => void;
  convertToWorkOrder: (id: string) => void;
}

const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
const todayIso = new Date().toISOString();

export const useWorkOrderStore = create<WorkOrderState>()(
  persist(
    (set, get) => ({
      workOrders: [],
      addWorkOrder: (order) => set((state) => ({ workOrders: [order, ...state.workOrders] })),
      updateWorkOrder: (id, order) => set((state) => ({ workOrders: state.workOrders.map(wo => wo.id === id ? { ...wo, ...order } : wo) })),
      
      addPartialPayment: (id: string, paymentData: Omit<PaymentRecord, 'id'>) => {
        const state = get();
        const wo = state.workOrders.find(w => w.id === id);
        if (!wo) return;

        const newPayment: PaymentRecord = {
          ...paymentData,
          id: 'PAY-' + Date.now().toString().slice(-6)
        };

        const updatedPayments = [...(wo.payments || []), newPayment];
        const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amountUSD, 0);
        const isFullyPaid = totalPaid >= (wo.totalUSD - 0.01);

        // Record in cash register if opened
        if (useCashStore.getState().isOpened) {
          const refText = newPayment.reference ? ` [Ref: ${newPayment.reference}]` : '';
          useCashStore.getState().addTransaction(
            'ingreso',
            newPayment.amountUSD,
            newPayment.method,
            `Abono/Cobro Orden ${wo.id} - ${wo.client?.nombre || ''} ${wo.client?.apellido || ''}${refText}`,
            {
              montoVES: newPayment.amountVES,
              tasaCambio: newPayment.rate,
              referencia: newPayment.reference,
              orderId: wo.id
            }
          );
        }

        const primaryMethod = updatedPayments.length === 1 ? updatedPayments[0].method : 'Mixto';

        set({
          workOrders: state.workOrders.map(w =>
            w.id === id
              ? {
                  ...w,
                  payments: updatedPayments,
                  status: isFullyPaid ? 'Finalizado' : w.status,
                  paymentMethod: primaryMethod,
                  paidAt: isFullyPaid ? new Date().toISOString() : w.paidAt
                }
              : w
          )
        });
      },

      payAndFinalizeOrder: (id: string, paymentsData: PaymentRecord[]) => {
        const state = get();
        const wo = state.workOrders.find(w => w.id === id);
        if (!wo) return;

        // 1. Deduct parts if not yet deducted
        if (!wo.partsDeducted && wo.parts?.length > 0) {
          wo.parts.forEach(p => {
            const invItem = useInventoryStore.getState().items.find(i => i.nombre === p.name && i.tipo === 'PRODUCTO');
            if (invItem) {
              useInventoryStore.getState().adjustStock(invItem.id, -p.quantity);
            }
          });
        }

        // 2. Register payments in cash register
        if (useCashStore.getState().isOpened) {
          paymentsData.forEach(p => {
            const refText = p.reference ? ` [Ref: ${p.reference}]` : '';
            useCashStore.getState().addTransaction(
              'ingreso',
              p.amountUSD,
              p.method,
              `Cobro Orden ${wo.id} - ${wo.client?.nombre || ''} ${wo.client?.apellido || ''}${refText}`,
              {
                montoVES: p.amountVES,
                tasaCambio: p.rate,
                referencia: p.reference,
                orderId: wo.id
              }
            );
          });
        }

        const updatedPayments = [...(wo.payments || []), ...paymentsData];
        const primaryMethod = updatedPayments.length === 1 ? updatedPayments[0].method : 'Mixto';

        set({
          workOrders: state.workOrders.map(w =>
            w.id === id
              ? {
                  ...w,
                  status: 'Finalizado',
                  partsDeducted: true,
                  paymentMethod: primaryMethod,
                  payments: updatedPayments,
                  paidAt: new Date().toISOString()
                }
              : w
          )
        });
      },

      updateOrderStatus: (id, status) => set((state) => {
        const wo = state.workOrders.find(w => w.id === id);
        let deductParts = false;
        let addCash = false;

        if (wo) {
          if ((status === 'Listo' || status === 'Finalizado') && !wo.partsDeducted) {
            deductParts = true;
          }
          if (status === 'Finalizado' && wo.status !== 'Finalizado' && (!wo.payments || wo.payments.length === 0)) {
            addCash = true;
          }
        }

        if (deductParts && wo) {
          wo.parts?.forEach(p => {
            const invItem = useInventoryStore.getState().items.find(i => i.nombre === p.name && i.tipo === 'PRODUCTO');
            if (invItem) {
              useInventoryStore.getState().adjustStock(invItem.id, -p.quantity);
            }
          });
        }

        if (addCash && wo) {
          if (useCashStore.getState().isOpened) {
            useCashStore.getState().addTransaction(
              'ingreso',
              wo.totalUSD,
              'Efectivo',
              `Cobro Orden de Trabajo ${wo.id} - Cliente: ${wo.client?.nombre || ''} ${wo.client?.apellido || ''}`,
              { orderId: wo.id }
            );
          }
        }

        return {
          workOrders: state.workOrders.map(w => 
            w.id === id 
              ? { 
                  ...w, 
                  status, 
                  deliveredAt: (status === 'Listo' || status === 'Finalizado') ? (w.deliveredAt || new Date().toISOString()) : w.deliveredAt,
                  partsDeducted: w.partsDeducted || deductParts 
                } 
              : w
          )
        };
      }),
      deleteWorkOrder: (id) => set((state) => ({
        workOrders: state.workOrders.filter(wo => wo.id !== id)
      })),
      convertToWorkOrder: (id) => set((state) => ({
        workOrders: state.workOrders.map(wo => wo.id === id ? { ...wo, status: 'Recibido' } : wo)
      }))
    }),
    {
      name: 'rumilcar-workorders-storage',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.workOrders)) {
          state.workOrders = state.workOrders.filter(
            (wo) => !['RMC-2026-1001', 'RMC-2026-1002', 'RMC-2026-1003', 'RMC-2026-1004'].includes(wo.id)
          );
        }
      },
    }
  )
);
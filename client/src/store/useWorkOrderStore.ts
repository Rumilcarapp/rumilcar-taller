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
      workOrders: [
        {
          id: 'RMC-2026-1001',
          client: { nombre: 'Luis', apellido: 'Perez', documento: 'V-12345678', telefono: '04141234567' },
          vehicle: { marca: 'Toyota', modelo: 'Corolla', placa: 'AA11BB' },
          services: [{ id: 's1', name: 'Cambio de Aceite y Filtro', price: 35, currency: 'USD' }],
          parts: [{ id: 'p1', name: 'Filtro de Aceite', quantity: 1, price: 15, currency: 'USD' }],
          date: tenDaysAgo,
          deliveredAt: tenDaysAgo,
          totalUSD: 150.00,
          status: 'Listo',
          mechanicName: 'Carlos P.',
          partsDeducted: true,
          payments: [
            { id: 'PAY-1001', method: 'Efectivo', amountUSD: 50.00, date: tenDaysAgo, note: 'Abono inicial en taller' }
          ]
        },
        {
          id: 'RMC-2026-1002',
          client: { nombre: 'Ana', apellido: 'Gomez', documento: 'V-87654321', telefono: '04247654321' },
          vehicle: { marca: 'Ford', modelo: 'Fiesta', placa: 'XAE123' },
          services: [{ id: 's2', name: 'Revision de Frenos', price: 40, currency: 'USD' }],
          parts: [{ id: 'p2', name: 'Pastillas de Freno', quantity: 1, price: 45.50, currency: 'USD' }],
          date: todayIso,
          deliveredAt: todayIso,
          totalUSD: 85.50,
          status: 'En Proceso',
          mechanicName: 'Pedro R.',
          partsDeducted: false,
          payments: []
        },
        {
          id: 'RMC-2026-1003',
          client: { nombre: 'Roberto', apellido: 'Mendoza', documento: 'V-15987432', telefono: '04129876543' },
          vehicle: { marca: 'Chevrolet', modelo: 'Aveo', placa: 'AB998CD' },
          services: [{ id: 's3', name: 'Mantenimiento de Alternador', price: 180, currency: 'USD' }],
          parts: [{ id: 'p3', name: 'Batería 800AMP', quantity: 1, price: 200, currency: 'USD' }],
          date: thirtyFiveDaysAgo,
          deliveredAt: thirtyFiveDaysAgo,
          totalUSD: 380.00,
          status: 'Listo',
          mechanicName: 'Carlos P.',
          partsDeducted: true,
          payments: []
        },
        {
          id: 'RMC-2026-1004',
          client: { nombre: 'María', apellido: 'Rojas', documento: 'V-20112233', telefono: '04163344556' },
          vehicle: { marca: 'Hyundai', modelo: 'Tucson', placa: 'KZZ441' },
          services: [{ id: 's4', name: 'Limpieza de Inyectores', price: 95, currency: 'USD' }],
          parts: [],
          date: todayIso,
          deliveredAt: todayIso,
          totalUSD: 95.00,
          status: 'Finalizado',
          mechanicName: 'Pedro R.',
          partsDeducted: true,
          payments: [
            { id: 'PAY-1004', method: 'Pago Movil', amountUSD: 95.00, date: todayIso, reference: '887612', note: 'Pago completo' }
          ],
          paymentMethod: 'Pago Movil',
          paidAt: todayIso
        }
      ],
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
    }
  )
);
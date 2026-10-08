import { create } from 'zustand';
import { useInventoryStore } from './useInventoryStore';
import { useCashStore, PaymentMethod } from './useCashStore';
import { useUserManagementStore } from './useUserManagementStore';
import { useAuthStore } from '../stores/authStore';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

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
  orderNumber?: number;
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
  notes?: string;
  photos?: any[];
}

interface WorkOrderState {
  workOrders: WorkOrder[];
  fetchWorkOrders: () => Promise<void>;
  addWorkOrder: (order: WorkOrder) => void;
  updateWorkOrder: (id: string, order: Partial<WorkOrder>) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  payAndFinalizeOrder: (id: string, payments: PaymentRecord[]) => void;
  addPartialPayment: (id: string, payment: Omit<PaymentRecord, 'id'>) => void;
  deleteWorkOrder: (id: string) => void;
  convertToWorkOrder: (id: string) => void;
}

const statusMapFromBackend: Record<string, OrderStatus> = {
  RECEIVED: 'Recibido',
  IN_PROGRESS: 'En Proceso',
  READY: 'Listo',
  DELIVERED: 'Finalizado',
  CANCELLED: 'Rechazado',
};

export const useWorkOrderStore = create<WorkOrderState>()(
  persist(
    (set, get) => ({
      workOrders: [],
      fetchWorkOrders: async () => {
        try {
          const data = await api.get('/work-orders');
          if (Array.isArray(data)) {
            const mapped: WorkOrder[] = data.map((o: any) => {
              const services = (o.items || [])
                .filter((i: any) => i.type === 'SERVICE')
                .map((i: any) => ({
                  id: i.id,
                  name: i.description,
                  price: i.unitPriceAnchor,
                  quantity: i.quantity,
                  currency: 'USD',
                }));

              const parts = (o.items || [])
                .filter((i: any) => i.type === 'PART')
                .map((i: any) => ({
                  id: i.id,
                  name: i.description,
                  price: i.unitPriceAnchor,
                  quantity: i.quantity,
                  currency: 'USD',
                }));

              const itemsTotalUSD = [
                ...services.map((s: any) => (s.price || 0) * (s.quantity || 1)),
                ...parts.map((p: any) => (p.price || 0) * (p.quantity || 1)),
              ].reduce((a: number, b: number) => a + b, 0);

              const safeTotalUSD = (itemsTotalUSD > 0 && (!o.totalAnchor || (o.totalAnchor < 1 && itemsTotalUSD >= 1)))
                ? itemsTotalUSD
                : (o.totalAnchor || itemsTotalUSD || 0);

              return {
                id: o.id,
                client: o.client
                  ? {
                      id: o.client.id,
                      nombre: o.client.name,
                      documento: o.client.taxId || '',
                      telefono: o.client.phone || '',
                      direccion: o.client.address || '',
                    }
                  : {},
                vehicle: o.vehicle
                  ? {
                      id: o.vehicle.id,
                      marca: o.vehicle.make || '',
                      modelo: o.vehicle.model || '',
                      placa: o.vehicle.licensePlate || '',
                      ano: o.vehicle.year ? String(o.vehicle.year) : '',
                      color: o.vehicle.color || '',
                    }
                  : {},
                services,
                parts,
                date: o.receivedAt || o.createdAt,
                deliveredAt: o.deliveredAt,
                totalUSD: safeTotalUSD,
                status: statusMapFromBackend[o.status] || 'Recibido',
                orderNumber: o.orderNumber,
                inspectionNotes: o.inspectionNotes || '',
                notes: o.notes || '',
              };
            });
            set({ workOrders: mapped });
          }
        } catch {
          // Keep local state if offline
        }
      },
      addWorkOrder: (order) => {
        const itemsTotalUSD = [
          ...(order.services || []).map((s: any) => (s.price || 0) * (s.quantity || 1)),
          ...(order.parts || []).map((p: any) => (p.price || 0) * (p.quantity || 1)),
        ].reduce((a: number, b: number) => a + b, 0);

        const safeTotalUSD = (itemsTotalUSD > 0 && (!order.totalUSD || (order.totalUSD < 1 && itemsTotalUSD >= 1)))
          ? itemsTotalUSD
          : (order.totalUSD || itemsTotalUSD || 0);

        const normalizedOrder = { ...order, totalUSD: safeTotalUSD };
        set((state) => ({ workOrders: [normalizedOrder, ...state.workOrders] }));

        const currentUser = useAuthStore.getState().user;
        useUserManagementStore.getState().addAuditLog({
          workshopId: currentUser?.workshopId,
          userId: currentUser?.id || 'gestor',
          userName: currentUser?.name || 'Gestor',
          userRole: currentUser?.role || 'ASESOR',
          action: 'Creación de Orden de Trabajo',
          module: 'workOrders',
          details: `Creó orden #${order.id} (${order.status}) para cliente ${order.client?.nombre || 'General'} - Monto: $${Number(safeTotalUSD).toFixed(2)} USD`,
        });

        // Map items for backend
        const items = [
          ...(order.services || []).map((s) => ({
            type: 'SERVICE' as const,
            description: s.name || s.description || 'Servicio',
            quantity: s.quantity || 1,
            unitPriceAnchor: s.price || 0,
          })),
          ...(order.parts || []).map((p) => ({
            type: 'PART' as const,
            description: p.name || p.description || 'Repuesto',
            quantity: p.quantity || 1,
            unitPriceAnchor: p.price || 0,
          })),
        ];

        api.post('/work-orders', {
          clientId: order.client?.id || order.client?.documento,
          vehicleId: order.vehicle?.id || order.vehicle?.placa,
          status: order.status,
          notes: order.notes,
          inspectionNotes: order.inspectionNotes,
          totalAnchor: safeTotalUSD,
          items,
        }).then((saved) => {
          if (saved && saved.id) {
            set((state) => ({
              workOrders: state.workOrders.map((wo) => (wo.id === order.id ? { ...wo, id: saved.id } : wo)),
            }));
          }
        }).catch(() => {});
      },
      updateWorkOrder: (id, order) => {
        const currentOrder = get().workOrders.find(wo => wo.id === id);
        const mergedServices = order.services !== undefined ? order.services : currentOrder?.services || [];
        const mergedParts = order.parts !== undefined ? order.parts : currentOrder?.parts || [];
        const itemsTotalUSD = [
          ...mergedServices.map((s: any) => (s.price || 0) * (s.quantity || 1)),
          ...mergedParts.map((p: any) => (p.price || 0) * (p.quantity || 1)),
        ].reduce((a: number, b: number) => a + b, 0);

        let safeTotalUSD = order.totalUSD;
        if (order.totalUSD !== undefined) {
          if (itemsTotalUSD > 0 && (order.totalUSD < 1 && itemsTotalUSD >= 1)) {
            safeTotalUSD = itemsTotalUSD;
          }
        }

        const normalizedOrder = safeTotalUSD !== undefined ? { ...order, totalUSD: safeTotalUSD } : order;
        set((state) => ({ workOrders: state.workOrders.map(wo => wo.id === id ? { ...wo, ...normalizedOrder } : wo) }));

        api.put(`/work-orders/${id}`, {
          ...(order.status !== undefined && { status: order.status }),
          ...(order.notes !== undefined && { notes: order.notes }),
          ...(order.inspectionNotes !== undefined && { inspectionNotes: order.inspectionNotes }),
          ...(safeTotalUSD !== undefined && { totalAnchor: safeTotalUSD }),
          ...(order.deliveredAt !== undefined && { deliveredAt: order.deliveredAt }),
        }).catch(() => {});
      },
      
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

        const currentUser = useAuthStore.getState().user;
        useUserManagementStore.getState().addAuditLog({
          workshopId: currentUser?.workshopId,
          userId: currentUser?.id || 'cajero',
          userName: currentUser?.name || 'Cajero',
          userRole: currentUser?.role || 'CASHIER',
          action: 'Cobro y Cierre de Orden',
          module: 'workOrders',
          details: `Cobró y finalizó orden #${wo.id} - Total: $${Number(wo.totalUSD || 0).toFixed(2)} USD`,
        });

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

        api.put(`/work-orders/${id}`, {
          status,
          ...((status === 'Listo' || status === 'Finalizado') && { deliveredAt: new Date().toISOString() }),
        }).catch(() => {});

        const currentUser = useAuthStore.getState().user;
        useUserManagementStore.getState().addAuditLog({
          workshopId: currentUser?.workshopId,
          userId: currentUser?.id || 'gestor',
          userName: currentUser?.name || 'Gestor',
          userRole: currentUser?.role || 'MECANICO',
          action: 'Cambio de Estado de Orden',
          module: 'workOrders',
          details: `Cambió estado de la orden #${id} a "${status}"`,
        });

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
      deleteWorkOrder: (id) => {
        set((state) => ({
          workOrders: state.workOrders.filter(wo => wo.id !== id)
        }));

        api.delete(`/work-orders/${id}`).catch(() => {});
      },
      convertToWorkOrder: (id) => {
        set((state) => ({
          workOrders: state.workOrders.map(wo => wo.id === id ? { ...wo, status: 'Recibido' } : wo)
        }));

        api.put(`/work-orders/${id}`, { status: 'Recibido' }).catch(() => {});
      }
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
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useInventoryStore } from './useInventoryStore';

export interface Supplier {
  id: string;
  nombre: string;
  rif: string; // J-12345678-0, V-12345678-0, etc.
  telefono: string;
  direccion?: string;
  categorias: string[]; // e.g. ['Repuestos', 'Lubricantes', 'Frenos', 'Eléctrico']
  notas?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  inventoryItemId?: string; // If matched with an existing inventory item
  nombre: string;
  cantidad: number;
  cantidadRecibida?: number;
  costoUnitarioUSD: number;
  currency: 'USD' | 'VES' | 'USDT';
  subtotalUSD: number;
}

export type PurchaseOrderStatus = 'Pendiente' | 'Recibida' | 'Parcial' | 'Cancelada';

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierRif?: string;
  date: string;
  estimatedArrivalDate?: string;
  items: PurchaseItem[];
  applyIva: boolean;
  subtotalUSD: number;
  ivaUSD: number;
  totalUSD: number;
  status: PurchaseOrderStatus;
  notes?: string;
  receivedAt?: string;
}

interface PurchaseState {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addPurchaseOrder: (order: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, order: Partial<PurchaseOrder>) => void;
  receivePurchaseOrder: (id: string, updateInventory: boolean, receivedItems?: { itemId: string; qtyReceived: number }[]) => void;
  cancelPurchaseOrder: (id: string) => void;
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      suppliers: [],
      purchaseOrders: [],
      addSupplier: (supplier) => set((state) => ({ suppliers: [supplier, ...state.suppliers] })),
      updateSupplier: (id, supplier) => set((state) => ({ suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...supplier } : s) })),
      deleteSupplier: (id) => set((state) => ({ suppliers: state.suppliers.filter(s => s.id !== id) })),
      
      addPurchaseOrder: (order) => set((state) => ({ purchaseOrders: [order, ...state.purchaseOrders] })),
      updatePurchaseOrder: (id, order) => set((state) => ({ purchaseOrders: state.purchaseOrders.map(po => po.id === id ? { ...po, ...order } : po) })),
      
      receivePurchaseOrder: (id: string, updateInventory: boolean, receivedItems?: { itemId: string; qtyReceived: number }[]) => {
        const state = get();
        const po = state.purchaseOrders.find(p => p.id === id);
        if (!po) return;

        let isAllReceived = true;
        let isPartial = false;

        const updatedItems = po.items.map(item => {
          const matchedRec = receivedItems?.find(r => r.itemId === item.id);
          const newlyReceived = matchedRec ? matchedRec.qtyReceived : item.cantidad;
          const totalRec = (item.cantidadRecibida || 0) + newlyReceived;

          if (totalRec < item.cantidad) {
            isAllReceived = false;
            if (totalRec > 0) isPartial = true;
          }

          // Automatically update inventory stock and unit cost if requested
          if (updateInventory && newlyReceived > 0) {
            const invStore = useInventoryStore.getState();
            const invItem = invStore.items.find(i => 
              (item.inventoryItemId && i.id === item.inventoryItemId) || 
              i.nombre.toLowerCase() === item.nombre.toLowerCase()
            );

            if (invItem) {
              invStore.adjustStock(invItem.id, newlyReceived);
              invStore.updateItem(invItem.id, { costo: item.costoUnitarioUSD });
            } else {
              // Create new item in inventory if missing
              invStore.addItem({
                id: 'INV-' + Date.now().toString().slice(-6),
                nombre: item.nombre,
                tipo: 'PRODUCTO',
                costo: item.costoUnitarioUSD,
                precio: item.costoUnitarioUSD * 1.3, // 30% margin default
                currency: 'USD',
                stock: newlyReceived,
                stockMinimo: 5,
                isActive: true
              });
            }
          }

          return {
            ...item,
            cantidadRecibida: totalRec
          };
        });

        const newStatus: PurchaseOrderStatus = isAllReceived ? 'Recibida' : (isPartial ? 'Parcial' : po.status);

        set({
          purchaseOrders: state.purchaseOrders.map(p =>
            p.id === id
              ? {
                  ...p,
                  items: updatedItems,
                  status: newStatus,
                  receivedAt: isAllReceived ? new Date().toISOString() : p.receivedAt
                }
              : p
          )
        });
      },

      cancelPurchaseOrder: (id) => set((state) => ({
        purchaseOrders: state.purchaseOrders.map(po => po.id === id ? { ...po, status: 'Cancelada' } : po)
      }))
    }),
    {
      name: 'rumilcar-purchases-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (Array.isArray(state.suppliers)) {
            state.suppliers = state.suppliers.filter(s => !['SUP-001', 'SUP-002'].includes(s.id));
          }
          if (Array.isArray(state.purchaseOrders)) {
            state.purchaseOrders = state.purchaseOrders.filter(po => !['OC-2026-001', 'OC-2026-002'].includes(po.id));
          }
        }
      },
    }
  )
);

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
      suppliers: [
        {
          id: 'SUP-001',
          nombre: 'Distribuidora Automotriz Caracas C.A.',
          rif: 'J-30123456-7',
          telefono: '04149998877',
          direccion: 'Av. Las Acacias, Los Chaguaramos, Caracas',
          categorias: ['Repuestos', 'Frenos', 'Filtros'],
          notas: 'Crédito a 15 días. Entrega en taller sin costo adicional.',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'SUP-002',
          nombre: 'Lubricantes y Fluidos VZLA S.A.',
          rif: 'J-40987654-3',
          telefono: '04245551234',
          direccion: 'Zona Industrial La Yaguara',
          categorias: ['Lubricantes', 'Fluidos'],
          notas: 'Descuento del 5% por pago de contado en USDT o Efectivo.',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ],
      purchaseOrders: [
        {
          id: 'OC-2026-001',
          supplierId: 'SUP-001',
          supplierName: 'Distribuidora Automotriz Caracas C.A.',
          supplierRif: 'J-30123456-7',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedArrivalDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              id: 'pi-1',
              nombre: 'Filtro de Aceite Purolator',
              cantidad: 20,
              cantidadRecibida: 20,
              costoUnitarioUSD: 8.50,
              currency: 'USD',
              subtotalUSD: 170.00
            },
            {
              id: 'pi-2',
              nombre: 'Pastillas de Freno Delanteras Toyota',
              cantidad: 10,
              cantidadRecibida: 10,
              costoUnitarioUSD: 22.00,
              currency: 'USD',
              subtotalUSD: 220.00
            }
          ],
          applyIva: true,
          subtotalUSD: 390.00,
          ivaUSD: 62.40,
          totalUSD: 452.40,
          status: 'Recibida',
          receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'OC-2026-002',
          supplierId: 'SUP-002',
          supplierName: 'Lubricantes y Fluidos VZLA S.A.',
          supplierRif: 'J-40987654-3',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedArrivalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              id: 'pi-3',
              nombre: 'Aceite 20W50 Mineral Shell Helix (Tambor)',
              cantidad: 2,
              cantidadRecibida: 0,
              costoUnitarioUSD: 120.00,
              currency: 'USD',
              subtotalUSD: 240.00
            }
          ],
          applyIva: false,
          subtotalUSD: 240.00,
          ivaUSD: 0,
          totalUSD: 240.00,
          status: 'Pendiente'
        }
      ],
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
      name: 'rumilcar-purchases-storage'
    }
  )
);

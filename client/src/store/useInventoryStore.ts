import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

export interface InventoryItem {
  id: string;
  codigo?: string;          // SKU / Barcode
  tipo: 'PRODUCTO' | 'SERVICIO';
  nombre: string;
  descripcion?: string;
  marca?: string;
  costo: number;             // Shop cost
  precio: number;            // Selling price
  currency: 'USD' | 'VES' | 'USDT';
  stock: number;             // Infinity for services
  stockMinimo?: number;
  categoria?: string;
  isActive: boolean;
}

interface InventoryState {
  items: InventoryItem[];
  fetchInventory: () => Promise<void>;
  addItem: (item: InventoryItem) => void;
  updateItem: (id: string, updated: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  adjustStock: (id: string, quantity: number, reason?: string) => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: [],
      fetchInventory: async () => {
        try {
          const data = await api.get('/inventory');
          if (Array.isArray(data)) {
            const mapped: InventoryItem[] = data.map((item: any) => {
              const isService = item.unit === 'servicio' || item.category?.toUpperCase() === 'SERVICIO';
              return {
                id: item.id,
                codigo: item.sku || '',
                tipo: isService ? 'SERVICIO' : 'PRODUCTO',
                nombre: item.name,
                descripcion: item.description || '',
                marca: '',
                costo: item.costPriceAnchor || 0,
                precio: item.unitPriceAnchor || 0,
                currency: 'USD',
                stock: isService ? Infinity : (item.currentStock ?? 0),
                stockMinimo: item.minStock || 0,
                categoria: item.category || 'General',
                isActive: true,
              };
            });
            set({ items: mapped });
          }
        } catch {
          // Keep local state if offline
        }
      },
      addItem: (item) => {
        if (item.codigo && get().items.some(i => i.codigo === item.codigo)) {
          alert('El código de barras ya está registrado.');
          return;
        }

        set((state) => ({ items: [item, ...state.items] }));

        api.post('/inventory', {
          sku: item.codigo || null,
          name: item.nombre,
          description: item.descripcion || null,
          category: item.categoria || null,
          unitPriceAnchor: item.precio,
          costPriceAnchor: item.costo,
          currentStock: item.tipo === 'SERVICIO' ? 0 : item.stock,
          minStock: item.stockMinimo || 0,
          unit: item.tipo === 'SERVICIO' ? 'servicio' : 'unidad',
        }).then((saved) => {
          if (saved && saved.id) {
            set((state) => ({
              items: state.items.map((i) => (i.id === item.id ? { ...i, id: saved.id } : i)),
            }));
          }
        }).catch(() => {});
      },
      updateItem: (id, updated) => {
        set((state) => ({
          items: state.items.map(i => i.id === id ? { ...i, ...updated } : i)
        }));

        api.put(`/inventory/${id}`, {
          ...(updated.codigo !== undefined && { sku: updated.codigo || null }),
          ...(updated.nombre !== undefined && { name: updated.nombre }),
          ...(updated.descripcion !== undefined && { description: updated.descripcion }),
          ...(updated.categoria !== undefined && { category: updated.categoria }),
          ...(updated.precio !== undefined && { unitPriceAnchor: updated.precio }),
          ...(updated.costo !== undefined && { costPriceAnchor: updated.costo }),
          ...(updated.stock !== undefined && { currentStock: updated.stock === Infinity ? 0 : updated.stock }),
          ...(updated.stockMinimo !== undefined && { minStock: updated.stockMinimo }),
          ...(updated.tipo !== undefined && { unit: updated.tipo === 'SERVICIO' ? 'servicio' : 'unidad' }),
        }).catch(() => {});
      },
      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter(i => i.id !== id)
        }));

        api.delete(`/inventory/${id}`).catch(() => {});
      },
      adjustStock: (id, quantity, reason) => {
        set((state) => ({
          items: state.items.map(i => {
            if (i.id !== id || i.tipo === 'SERVICIO') return i;
            const newStock = Math.max(0, i.stock + quantity);
            return { ...i, stock: newStock };
          })
        }));

        api.post(`/inventory/${id}/adjust`, {
          quantity,
          reason: reason || (quantity >= 0 ? 'Ajuste de inventario (+)' : 'Ajuste de inventario (-)'),
        }).catch(() => {});
      }
    }),
    {
      name: 'rumilcar-inventory-storage',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.items)) {
          state.items = state.items.filter(
            (i) => !['INV-001', 'INV-002', 'INV-003', 'INV-004'].includes(i.id)
          );
        }
      },
    }
  )
);
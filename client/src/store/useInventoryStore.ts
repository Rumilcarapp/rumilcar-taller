import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addItem: (item: InventoryItem) => void;
  updateItem: (id: string, updated: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  adjustStock: (id: string, quantity: number) => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      items: [
        {
          id: 'INV-001',
          codigo: '759123456789',
          tipo: 'PRODUCTO',
          nombre: 'Filtro de Aceite Purolator L14670',
          descripcion: 'Filtro de aceite roscado para motores Toyota/Ford.',
          marca: 'Purolator',
          costo: 4,
          precio: 8,
          currency: 'USD',
          stock: 12,
          stockMinimo: 3,
          categoria: 'Filtros',
          isActive: true
        },
        {
          id: 'INV-002',
          codigo: '759987654321',
          tipo: 'PRODUCTO',
          nombre: 'Pastillas de Freno Delanteras Toyota Corolla',
          descripcion: 'Juego de pastillas de cerámica delanteras.',
          marca: 'Shimano / Kross',
          costo: 15,
          precio: 30,
          currency: 'USD',
          stock: 6,
          stockMinimo: 2,
          categoria: 'Frenos',
          isActive: true
        },
        {
          id: 'INV-003',
          tipo: 'SERVICIO',
          nombre: 'Alineación y Balanceo de Ruedas',
          descripcion: 'Alineación del tren delantero e inspección de suspensión.',
          costo: 10,
          precio: 25,
          currency: 'USD',
          stock: Infinity,
          categoria: 'Tren Delantero',
          isActive: true
        },
        {
          id: 'INV-004',
          tipo: 'SERVICIO',
          nombre: 'Cambio de Aceite y Filtro de Motor',
          descripcion: 'Servicio express de reemplazo de lubricante.',
          costo: 5,
          precio: 15,
          currency: 'USD',
          stock: Infinity,
          categoria: 'Mantenimiento',
          isActive: true
        }
      ],
      addItem: (item) => set((state) => {
        if (item.codigo && state.items.some(i => i.codigo === item.codigo)) {
          alert('El código de barras ya está registrado.');
          return state;
        }
        return { items: [item, ...state.items] };
      }),
      updateItem: (id, updated) => set((state) => ({
        items: state.items.map(i => i.id === id ? { ...i, ...updated } : i)
      })),
      deleteItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),
      adjustStock: (id, quantity) => set((state) => ({
        items: state.items.map(i => {
          if (i.id !== id || i.tipo === 'SERVICIO') return i;
          const newStock = Math.max(0, i.stock + quantity);
          return { ...i, stock: newStock };
        })
      }))
    }),
    {
      name: 'rumilcar-inventory-storage'
    }
  )
);
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CatalogService {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currency: 'USD' | 'VES' | 'USDT';
  estimatedTime?: number;
  timeUnit?: 'minutes' | 'hours';
  isActive: boolean;
}

interface CatalogState {
  services: CatalogService[];
  addService: (service: CatalogService) => void;
  updateService: (id: string, service: Partial<CatalogService>) => void;
  deleteService: (id: string) => void;
  toggleServiceStatus: (id: string) => void;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      services: [
        {
          id: 'CAT-001',
          name: 'Cambio de Aceite y Filtro',
          description: 'Mano de obra para cambio de aceite de motor y filtro. (No incluye materiales)',
          basePrice: 20,
          currency: 'USD',
          estimatedTime: 45,
          timeUnit: 'minutes',
          isActive: true
        }
      ],
      addService: (service) => set((state) => ({
        services: [...state.services, service]
      })),
      updateService: (id, data) => set((state) => ({
        services: state.services.map(s => s.id === id ? { ...s, ...data } : s)
      })),
      deleteService: (id) => set((state) => ({
        services: state.services.filter(s => s.id !== id)
      })),
      toggleServiceStatus: (id) => set((state) => ({
        services: state.services.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s)
      }))
    }),
    {
      name: 'rumilcar-catalog-storage'
    }
  )
);
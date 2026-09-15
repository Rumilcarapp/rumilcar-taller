import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';
import { useClientStore } from './useClientStore';

export interface Vehicle {
  id: string;
  placa: string; // unique key
  marca: string;
  modelo: string;
  ano?: string;
  color?: string;
  ownerDocumento: string; // Foreign Key to Client
}

interface VehicleState {
  vehicles: Vehicle[];
  fetchVehicles: () => Promise<void>;
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
}

export const useVehicleStore = create<VehicleState>()(
  persist(
    (set, get) => ({
      vehicles: [],
      fetchVehicles: async () => {
        try {
          const data = await api.get('/vehicles');
          if (Array.isArray(data)) {
            const mapped: Vehicle[] = data.map((v: any) => ({
              id: v.id,
              placa: v.licensePlate || '',
              marca: v.make || '',
              modelo: v.model || '',
              ano: v.year ? String(v.year) : '',
              color: v.color || '',
              ownerDocumento: v.client?.taxId || '',
            }));
            set({ vehicles: mapped });
          }
        } catch {
          // Keep local state if offline
        }
      },
      addVehicle: (vehicle) => {
        set((state) => {
          if (state.vehicles.some((v) => v.placa === vehicle.placa)) return state;
          return { vehicles: [vehicle, ...state.vehicles] };
        });

        // Resolve clientId from useClientStore
        const clients = useClientStore.getState().clients;
        const owner = clients.find((c) => c.documento === vehicle.ownerDocumento);
        const clientId = owner?.id;

        if (clientId) {
          api.post('/vehicles', {
            clientId,
            make: vehicle.marca,
            model: vehicle.modelo,
            year: vehicle.ano ? parseInt(vehicle.ano, 10) : null,
            licensePlate: vehicle.placa,
            color: vehicle.color || null,
          }).then((saved) => {
            if (saved && saved.id) {
              set((state) => ({
                vehicles: state.vehicles.map((v) => (v.id === vehicle.id ? { ...v, id: saved.id } : v)),
              }));
            }
          }).catch(() => {});
        }
      },
      updateVehicle: (id, updated) => {
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...updated } : v)),
        }));

        api.put(`/vehicles/${id}`, {
          ...(updated.marca !== undefined && { make: updated.marca }),
          ...(updated.modelo !== undefined && { model: updated.modelo }),
          ...(updated.ano !== undefined && { year: updated.ano ? parseInt(updated.ano, 10) : null }),
          ...(updated.placa !== undefined && { licensePlate: updated.placa }),
          ...(updated.color !== undefined && { color: updated.color }),
        }).catch(() => {});
      },
      deleteVehicle: (id) => {
        set((state) => ({
          vehicles: state.vehicles.filter((v) => v.id !== id),
        }));

        api.delete(`/vehicles/${id}`).catch(() => {});
      },
    }),
    {
      name: 'rumilcar-vehicles-storage',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.vehicles)) {
          state.vehicles = state.vehicles.filter(
            (v) => !['VEH-001', 'VEH-002'].includes(v.id)
          );
        }
      },
    }
  )
);
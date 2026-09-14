import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
}

export const useVehicleStore = create<VehicleState>()(
  persist(
    (set) => ({
      vehicles: [],
      addVehicle: (vehicle) => set((state) => {
        if (state.vehicles.some(v => v.placa === vehicle.placa)) return state;
        return { vehicles: [vehicle, ...state.vehicles] };
      }),
      updateVehicle: (id, updated) => set((state) => ({
        vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...updated } : v)
      })),
      deleteVehicle: (id) => set((state) => ({
        vehicles: state.vehicles.filter(v => v.id !== id)
      }))
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
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';
import { useClientStore } from './useClientStore';
import { useVehicleStore } from './useVehicleStore';

export interface AppointmentItem {
  id: string;
  clientId?: string;
  clientName: string;
  vehicleId?: string;
  vehicleDesc: string;
  mechanicId?: string | null;
  mechanic?: string | null;
  service: string;
  modality: string;
  date: string;
  startAt: string;
  endAt: string;
  startTime: string;
  endTime: string;
  internalNotes?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

interface AppointmentState {
  appointments: AppointmentItem[];
  fetchAppointments: (date?: string) => Promise<void>;
  addAppointment: (apt: AppointmentItem) => void;
  updateAppointment: (id: string, updated: Partial<AppointmentItem>) => void;
  deleteAppointment: (id: string) => void;
}

export const useAppointmentStore = create<AppointmentState>()(
  persist(
    (set, get) => ({
      appointments: [],
      fetchAppointments: async (date?: string) => {
        try {
          const endpoint = date ? `/appointments?date=${date}` : '/appointments';
          const data = await api.get(endpoint);
          if (Array.isArray(data)) {
            const mapped: AppointmentItem[] = data.map((a: any) => {
              const start = new Date(a.startAt);
              const end = new Date(a.endAt);
              const startTime = start.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
              const endTime = end.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

              return {
                id: a.id,
                clientId: a.clientId,
                clientName: a.client?.name || 'Cliente',
                vehicleId: a.vehicleId,
                vehicleDesc: a.vehicle ? `${a.vehicle.make} ${a.vehicle.model} - ${a.vehicle.licensePlate}` : 'Vehículo',
                mechanicId: a.mechanicId,
                mechanic: a.mechanic?.name || null,
                service: a.serviceMotif,
                modality: a.modality || 'TALLER',
                date: a.startAt.split('T')[0],
                startAt: a.startAt,
                endAt: a.endAt,
                startTime,
                endTime,
                internalNotes: a.internalNotes || '',
                status: a.status || 'PENDING',
              };
            });
            set({ appointments: mapped });
          }
        } catch {
          // Offline fallback
        }
      },
      addAppointment: (apt) => {
        set((state) => ({ appointments: [apt, ...state.appointments] }));

        // Resolve client and vehicle IDs if not provided
        const clients = useClientStore.getState().clients;
        const matchedClient = clients.find(c => c.nombre.toLowerCase() === apt.clientName.toLowerCase()) || clients[0];

        const vehicles = useVehicleStore.getState().vehicles;
        const matchedVehicle = vehicles.find(v => apt.vehicleDesc.toLowerCase().includes(v.placa.toLowerCase())) || vehicles[0];

        if (matchedClient && matchedVehicle) {
          api.post('/appointments', {
            clientId: matchedClient.id,
            vehicleId: matchedVehicle.id,
            mechanicId: apt.mechanicId || null,
            startAt: apt.startAt,
            endAt: apt.endAt,
            modality: apt.modality,
            serviceMotif: apt.service,
            internalNotes: apt.internalNotes,
            status: apt.status,
          }).then((saved) => {
            if (saved && saved.id) {
              set((state) => ({
                appointments: state.appointments.map((a) => (a.id === apt.id ? { ...a, id: saved.id } : a)),
              }));
            }
          }).catch(() => {});
        }
      },
      updateAppointment: (id, updated) => {
        set((state) => ({
          appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...updated } : a)),
        }));

        api.put(`/appointments/${id}`, {
          ...(updated.clientId && { clientId: updated.clientId }),
          ...(updated.vehicleId && { vehicleId: updated.vehicleId }),
          ...(updated.mechanicId !== undefined && { mechanicId: updated.mechanicId }),
          ...(updated.startAt && { startAt: updated.startAt }),
          ...(updated.endAt && { endAt: updated.endAt }),
          ...(updated.modality && { modality: updated.modality }),
          ...(updated.service && { serviceMotif: updated.service }),
          ...(updated.internalNotes !== undefined && { internalNotes: updated.internalNotes }),
          ...(updated.status && { status: updated.status }),
        }).catch(() => {});
      },
      deleteAppointment: (id) => {
        set((state) => ({
          appointments: state.appointments.filter((a) => a.id !== id),
        }));

        api.delete(`/appointments/${id}`).catch(() => {});
      },
    }),
    {
      name: 'rumilcar-appointments-storage',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.appointments)) {
          state.appointments = state.appointments.filter(
            (a) => !['1', '2'].includes(a.id)
          );
        }
      },
    }
  )
);

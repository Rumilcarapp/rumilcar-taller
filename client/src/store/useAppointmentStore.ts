import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';
import { useClientStore } from './useClientStore';
import { useVehicleStore } from './useVehicleStore';
import { safeDate, formatLocalDateStr, safeToISOString } from '../lib/dateUtils';

export interface AppointmentItem {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
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
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'RECEIVED';
}

interface AppointmentState {
  appointments: AppointmentItem[];
  fetchAppointments: (date?: string) => Promise<void>;
  addAppointment: (apt: AppointmentItem) => Promise<AppointmentItem>;
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
              const start = safeDate(a.startAt);
              const end = safeDate(a.endAt || a.startAt);
              const startTime = start.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
              const endTime = end.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

              return {
                id: a.id,
                clientId: a.clientId,
                clientName: a.client?.name || 'Cliente',
                clientPhone: a.client?.phone || '',
                vehicleId: a.vehicleId,
                vehicleDesc: a.vehicle ? `${a.vehicle.make} ${a.vehicle.model} - ${a.vehicle.licensePlate}` : 'Vehículo',
                mechanicId: a.mechanicId,
                mechanic: a.mechanic?.name || null,
                service: a.serviceMotif,
                modality: a.modality || 'TALLER',
                date: a.startAt ? formatLocalDateStr(a.startAt) : formatLocalDateStr(start),
                startAt: a.startAt ? String(a.startAt) : safeToISOString(start),
                endAt: a.endAt ? String(a.endAt) : safeToISOString(end),
                startTime: a.startTime || startTime,
                endTime: a.endTime || endTime,
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
      addAppointment: async (apt) => {
        set((state) => ({ appointments: [apt, ...state.appointments] }));

        try {
          const saved = await api.post('/appointments', {
            clientId: apt.clientId || null,
            clientName: apt.clientName,
            clientPhone: apt.clientPhone || null,
            vehicleId: apt.vehicleId || null,
            vehicleDesc: apt.vehicleDesc,
            mechanicId: apt.mechanicId || null,
            startAt: apt.startAt,
            endAt: apt.endAt,
            modality: apt.modality,
            serviceMotif: apt.service,
            internalNotes: apt.internalNotes,
            status: apt.status,
          });

          if (saved && saved.id) {
            const fullApt: AppointmentItem = {
              ...apt,
              id: saved.id,
              clientId: saved.clientId,
              clientName: saved.client?.name || apt.clientName,
              clientPhone: saved.client?.phone || apt.clientPhone,
              vehicleId: saved.vehicleId,
              vehicleDesc: saved.vehicle
                ? `${saved.vehicle.make} ${saved.vehicle.model} - ${saved.vehicle.licensePlate}`
                : apt.vehicleDesc,
            };
            set((state) => ({
              appointments: state.appointments.map((a) => (a.id === apt.id ? fullApt : a)),
            }));
            return fullApt;
          }
        } catch (err) {
          console.error('[Appointments] Error al guardar cita en el servidor:', err);
        }
        return apt;
      },
      updateAppointment: (id, updated) => {
        set((state) => ({
          appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...updated } : a)),
        }));

        api.put(`/appointments/${id}`, {
          ...(updated.clientId && { clientId: updated.clientId }),
          ...(updated.clientName && { clientName: updated.clientName }),
          ...(updated.clientPhone && { clientPhone: updated.clientPhone }),
          ...(updated.vehicleId && { vehicleId: updated.vehicleId }),
          ...(updated.vehicleDesc && { vehicleDesc: updated.vehicleDesc }),
          ...(updated.mechanicId !== undefined && { mechanicId: updated.mechanicId }),
          ...(updated.startAt && { startAt: updated.startAt }),
          ...(updated.endAt && { endAt: updated.endAt }),
          ...(updated.modality && { modality: updated.modality }),
          ...(updated.service && { serviceMotif: updated.service }),
          ...(updated.internalNotes !== undefined && { internalNotes: updated.internalNotes }),
          ...(updated.status && { status: updated.status }),
        }).catch((err) => {
          console.error('[Appointments] Error al actualizar cita:', err);
        });
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

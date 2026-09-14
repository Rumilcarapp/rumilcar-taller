import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

export interface PersonnelMember {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  isActive: boolean;
  activeOrders: number;
  completedOrders: number;
  avgTime: string;
  esquema: 'porcentaje' | 'fijo' | 'mixto';
  porcentajeServicios?: number;
  montoFijo?: number;
  createdAt: string;
}

interface PersonnelState {
  personnel: PersonnelMember[];
  fetchPersonnel: () => Promise<void>;
  addPersonnel: (member: Omit<PersonnelMember, 'id' | 'createdAt' | 'activeOrders' | 'completedOrders' | 'avgTime'> & Partial<Pick<PersonnelMember, 'activeOrders' | 'completedOrders' | 'avgTime'>>) => PersonnelMember;
  updatePersonnel: (id: string, updates: Partial<PersonnelMember>) => void;
  deletePersonnel: (id: string) => void;
  togglePersonnelStatus: (id: string) => void;
  clearPersonnel: () => void;
}

const DEFAULT_PERSONNEL: PersonnelMember[] = [];

export const usePersonnelStore = create<PersonnelState>()(
  persist(
    (set, get) => ({
      personnel: DEFAULT_PERSONNEL,
      fetchPersonnel: async () => {
        try {
          const data = await api.get('/mechanics');
          if (Array.isArray(data)) {
            const mapped: PersonnelMember[] = data.map((m: any) => ({
              id: m.id,
              name: m.name,
              specialty: m.specialty || 'Mecánica general',
              phone: m.phone || '',
              isActive: m.isActive ?? true,
              activeOrders: m.activeOrders ?? 0,
              completedOrders: m.completedOrders ?? 0,
              avgTime: '1.0 día',
              esquema: 'porcentaje',
              porcentajeServicios: 30,
              createdAt: m.createdAt || new Date().toISOString(),
            }));
            set({ personnel: mapped });
          }
        } catch {
          // Keep local state if offline
        }
      },
      addPersonnel: (data) => {
        const newMember: PersonnelMember = {
          ...data,
          id: 'mech-' + Date.now(),
          activeOrders: data.activeOrders ?? 0,
          completedOrders: data.completedOrders ?? 0,
          avgTime: data.avgTime ?? '1.0 día',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ personnel: [newMember, ...state.personnel] }));

        // Sync with backend
        api.post('/mechanics', {
          name: newMember.name,
          specialty: newMember.specialty,
          phone: newMember.phone,
        }).then((saved) => {
          if (saved && saved.id) {
            set((state) => ({
              personnel: state.personnel.map((p) => (p.id === newMember.id ? { ...p, id: saved.id } : p)),
            }));
          }
        }).catch(() => {});

        return newMember;
      },
      updatePersonnel: (id, updates) => {
        set((state) => ({
          personnel: state.personnel.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));

        api.put(`/mechanics/${id}`, {
          ...(updates.name && { name: updates.name }),
          ...(updates.specialty !== undefined && { specialty: updates.specialty }),
          ...(updates.phone !== undefined && { phone: updates.phone }),
          ...(updates.isActive !== undefined && { isActive: updates.isActive }),
        }).catch(() => {});
      },
      deletePersonnel: (id) => {
        set((state) => ({
          personnel: state.personnel.filter((p) => p.id !== id),
        }));

        api.delete(`/mechanics/${id}`).catch(() => {});
      },
      togglePersonnelStatus: (id) => {
        set((state) => ({
          personnel: state.personnel.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)),
        }));

        api.put(`/mechanics/${id}/toggle`).catch(() => {});
      },
      clearPersonnel: () => {
        set({ personnel: [] });
      },
    }),
    {
      name: 'rumilcar-personnel-storage',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.personnel)) {
          // Remove old fictitious seed mechanics
          state.personnel = state.personnel.filter(
            (p) =>
              !['mech-1', 'mech-2', 'mech-3', 'mech-4'].includes(p.id) &&
              !['carlos martínez', 'pedro rodríguez', 'luis garcía'].includes(p.name?.toLowerCase().trim())
          );
        }
      },
    }
  )
);

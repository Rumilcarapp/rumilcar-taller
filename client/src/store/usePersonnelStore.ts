import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addPersonnel: (member: Omit<PersonnelMember, 'id' | 'createdAt' | 'activeOrders' | 'completedOrders' | 'avgTime'> & Partial<Pick<PersonnelMember, 'activeOrders' | 'completedOrders' | 'avgTime'>>) => PersonnelMember;
  updatePersonnel: (id: string, updates: Partial<PersonnelMember>) => void;
  deletePersonnel: (id: string) => void;
  togglePersonnelStatus: (id: string) => void;
  clearPersonnel: () => void;
}

const DEFAULT_PERSONNEL: PersonnelMember[] = [];

export const usePersonnelStore = create<PersonnelState>()(
  persist(
    (set) => ({
      personnel: DEFAULT_PERSONNEL,
      addPersonnel: (data) => {
        const newMember: PersonnelMember = {
          ...data,
          id: 'mech-' + Date.now(),
          activeOrders: data.activeOrders ?? 0,
          completedOrders: data.completedOrders ?? 0,
          avgTime: data.avgTime ?? '1.0 día',
          createdAt: new Date().toISOString()
        };
        set(state => ({ personnel: [newMember, ...state.personnel] }));
        return newMember;
      },
      updatePersonnel: (id, updates) => {
        set(state => ({
          personnel: state.personnel.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
      },
      deletePersonnel: (id) => {
        set(state => ({
          personnel: state.personnel.filter(p => p.id !== id)
        }));
      },
      togglePersonnelStatus: (id) => {
        set(state => ({
          personnel: state.personnel.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)
        }));
      },
      clearPersonnel: () => {
        set({ personnel: [] });
      }
    }),
    {
      name: 'rumilcar-personnel-storage',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.personnel)) {
          // Remove old fictitious seed mechanics (mech-1, mech-2, mech-3, mech-4)
          state.personnel = state.personnel.filter(
            (p) => !['mech-1', 'mech-2', 'mech-3', 'mech-4'].includes(p.id)
          );
        }
      }
    }
  )
);

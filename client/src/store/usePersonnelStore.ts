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
}

const DEFAULT_PERSONNEL: PersonnelMember[] = [
  {
    id: 'mech-1',
    name: 'Carlos Martínez (Carlos P.)',
    specialty: 'Mecánica general',
    phone: '0412-5551234',
    isActive: true,
    activeOrders: 3,
    completedOrders: 47,
    avgTime: '2.5 días',
    esquema: 'porcentaje',
    porcentajeServicios: 30,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mech-2',
    name: 'Pedro Rodríguez (Pedro R.)',
    specialty: 'Electricidad automotriz',
    phone: '0414-5554567',
    isActive: true,
    activeOrders: 2,
    completedOrders: 35,
    avgTime: '1.8 días',
    esquema: 'fijo',
    montoFijo: 200,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mech-3',
    name: 'Luis García (Luis G.)',
    specialty: 'Frenos y suspensión',
    phone: '0424-5557890',
    isActive: true,
    activeOrders: 1,
    completedOrders: 52,
    avgTime: '1.2 días',
    esquema: 'mixto',
    montoFijo: 100,
    porcentajeServicios: 15,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mech-4',
    name: 'José Hernández (José H.)',
    specialty: 'Aire acondicionado',
    phone: '0416-5550123',
    isActive: false,
    activeOrders: 0,
    completedOrders: 28,
    avgTime: '3.1 días',
    esquema: 'porcentaje',
    porcentajeServicios: 25,
    createdAt: new Date().toISOString()
  },
];

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
      }
    }),
    {
      name: 'rumilcar-personnel-storage'
    }
  )
);

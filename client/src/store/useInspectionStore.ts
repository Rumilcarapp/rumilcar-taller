import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DamageMark {
  id: string;
  x: number;      // Percentage X
  y: number;      // Percentage Y
  type: 'R' | 'A' | 'G'; // Rayón, Abolladura, Golpe
}

export interface ChecklistItem {
  id: string;
  name: string;
  status: 'good' | 'warning' | 'danger'; // Verde / Amarillo / Rojo
  photoUrl?: string; // Base64 or mock URL
}

export interface Inspection {
  id: string;
  vehiclePlaca: string;
  date: string;
  fuelLevel: 'Vacio' | '1/4' | '1/2' | '3/4' | 'Lleno';
  notes: string;
  checklist: ChecklistItem[];
  damages: DamageMark[];
}

interface InspectionState {
  inspections: Inspection[];
  addInspection: (ins: Inspection) => void;
}

export const useInspectionStore = create<InspectionState>()(
  persist(
    (set) => ({
      inspections: [
        {
          id: 'INS-001',
          vehiclePlaca: 'AA11BB',
          date: new Date().toISOString(),
          fuelLevel: '1/2',
          notes: 'Vehiculo ingresa con leve rayón en puerta trasera izquierda.',
          checklist: [
            { id: '1', name: 'Luces principales y cruces', status: 'good' },
            { id: '2', name: 'Presion y estado de cauchos', status: 'good' },
            { id: '3', name: 'Nivel de fluidos', status: 'good' },
            { id: '4', name: 'Caucho de repuesto', status: 'good' },
            { id: '5', name: 'Gato y kit de herramientas', status: 'warning', photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100' },
            { id: '6', name: 'Carroceria libre de rayones', status: 'danger' }
          ],
          damages: [
            { id: 'd1', x: 25, y: 70, type: 'R' },
            { id: 'd2', x: 75, y: 30, type: 'A' }
          ]
        }
      ],
      addInspection: (ins) => set((state) => ({
        inspections: [ins, ...state.inspections]
      }))
    }),
    {
      name: 'rumilcar-inspections-storage'
    }
  )
);
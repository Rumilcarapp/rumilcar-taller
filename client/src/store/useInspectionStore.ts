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
  fuelLevel: string;
  fuelPercentage?: number;
  mileage?: number | string;
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
      inspections: [],
      addInspection: (ins) => set((state) => ({
        inspections: [ins, ...state.inspections]
      }))
    }),
    {
      name: 'rumilcar-inspections-storage'
    }
  )
);

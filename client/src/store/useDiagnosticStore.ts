import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Diagnostic {
  id: string;
  vehiclePlaca: string;
  date: string;
  clientReport: string;
  mechanicReport: string;
  checkedSystems: {
    motor: 'good' | 'warning' | 'danger';
    frenos: 'good' | 'warning' | 'danger';
    suspension: 'good' | 'warning' | 'danger';
    electrico: 'good' | 'warning' | 'danger';
  };
}

interface DiagnosticState {
  diagnostics: Diagnostic[];
  addDiagnostic: (diag: Diagnostic) => void;
}

export const useDiagnosticStore = create<DiagnosticState>()(
  persist(
    (set) => ({
      diagnostics: [],
      addDiagnostic: (diag) => set((state) => ({
        diagnostics: [diag, ...state.diagnostics]
      }))
    }),
    {
      name: 'rumilcar-diagnostics-storage'
    }
  )
);

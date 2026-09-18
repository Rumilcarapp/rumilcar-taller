import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useWorkOrderStore } from './useWorkOrderStore';
import { useClientStore } from './useClientStore';
import { useVehicleStore } from './useVehicleStore';
import { useInventoryStore } from './useInventoryStore';
import { useCashStore } from './useCashStore';
import { useDiagnosticStore } from './useDiagnosticStore';
import { useExpenseStore } from './useExpenseStore';
import { usePayrollStore } from './usePayrollStore';
import { usePersonnelStore } from './usePersonnelStore';
import { useWorkshopStore } from './useWorkshopStore';
import { useAntiInflationStore } from './useAntiInflationStore';
import { useInspectionStore } from './useInspectionStore';
import { usePrePurchaseStore } from './usePrePurchaseStore';
import { useAppointmentStore } from './useAppointmentStore';
import { useCRMStore } from './useCRMStore';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  actionText: string;
  route: string;
  iconName: string;
  completed: boolean;
}

interface OnboardingState {
  showWelcomeModal: boolean;
  hasSeenWelcome: boolean;
  isChecklistDismissed: boolean;
  completedStepIds: string[];
  isCleanSlate: boolean;

  openWelcomeModal: () => void;
  dismissWelcomeModal: () => void;
  toggleChecklist: () => void;
  completeStep: (stepId: string) => void;
  resetSteps: () => void;
  clearAllMockData: () => void;
  loadMockData: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      showWelcomeModal: true,
      hasSeenWelcome: false,
      isChecklistDismissed: false,
      completedStepIds: [],
      isCleanSlate: true,

      openWelcomeModal: () => set({ showWelcomeModal: true }),
      dismissWelcomeModal: () => set({ showWelcomeModal: false, hasSeenWelcome: true }),
      toggleChecklist: () => set((state) => ({ isChecklistDismissed: !state.isChecklistDismissed })),

      completeStep: (stepId: string) =>
        set((state) => ({
          completedStepIds: state.completedStepIds.includes(stepId)
            ? state.completedStepIds
            : [...state.completedStepIds, stepId],
        })),

      resetSteps: () => set({ completedStepIds: [] }),

      // 🧹 Dejar taller completamente limpio en blanco
      clearAllMockData: () => {
        useWorkOrderStore.setState({ workOrders: [] });
        useClientStore.setState({ clients: [] });
        useVehicleStore.setState({ vehicles: [] });
        useInventoryStore.setState({ items: [] });
        useCashStore.setState({ transactions: [], closureHistory: [], currentBalanceUSD: 0, openingBalanceUSD: 0 });
        useDiagnosticStore.setState({ diagnostics: [] });
        useInspectionStore.setState({ inspections: [] });
        usePrePurchaseStore.setState({ inspections: [] });
        useAppointmentStore.setState({ appointments: [] });
        useCRMStore.setState({ opportunities: [], interactions: [] });
        useExpenseStore.getState().clearGastos();
        usePayrollStore.getState().clearPayroll();
        usePersonnelStore.getState().clearPersonnel();
        const currentName = useWorkshopStore.getState().workshop.name || 'Mi Taller Mecánico';
        useWorkshopStore.getState().resetToCleanProfile(currentName);
        useAntiInflationStore.setState({
          saldoVES: { monto_ves: 0, valor_usd_ingreso: 0, tasa_ingreso: 0, fecha_ingreso: new Date().toISOString().split('T')[0] },
          conversiones: [],
          tasasHistorial: [],
        });

        set({
          isCleanSlate: true,
          showWelcomeModal: false,
          hasSeenWelcome: true,
        });
      },

      // No inyecta datos ficticios para garantizar producción 100% limpia
      loadMockData: () => {
        console.log('[Onboarding] Carga de datos demo deshabilitada para producción.');
        set({ isCleanSlate: true, showWelcomeModal: false, hasSeenWelcome: true });
      },
    }),
    {
      name: 'rumilcar-onboarding-storage',
    }
  )
);

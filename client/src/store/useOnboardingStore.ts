import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useWorkOrderStore } from './useWorkOrderStore';
import { useClientStore } from './useClientStore';
import { useVehicleStore } from './useVehicleStore';
import { useInventoryStore } from './useInventoryStore';
import { useCashStore } from './useCashStore';
import { useDiagnosticStore } from './useDiagnosticStore';

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
      isCleanSlate: false,

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

        set({
          isCleanSlate: true,
          showWelcomeModal: false,
          hasSeenWelcome: true,
        });
      },

      // 🧪 Cargar datos de demostración para pruebas
      loadMockData: () => {
        useWorkOrderStore.setState({
          workOrders: [
            {
              id: 'RMC-2026-1001',
              client: { nombre: 'Luis', apellido: 'Perez', documento: 'V-12345678', telefono: '04141234567' },
              vehicle: { marca: 'Toyota', modelo: 'Corolla', placa: 'AA11BB' },
              services: [{ id: 's1', name: 'Cambio de Aceite y Filtro', price: 35, currency: 'USD' }],
              parts: [{ id: 'p1', name: 'Filtro de Aceite', quantity: 1, price: 15, currency: 'USD' }],
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              totalUSD: 50,
              status: 'Listo',
              mechanicName: 'Carlos Martinez',
            },
            {
              id: 'RMC-2026-1002',
              client: { nombre: 'Ana', apellido: 'Gomez', documento: 'V-87654321', telefono: '04247654321' },
              vehicle: { marca: 'Ford', modelo: 'Fiesta', placa: 'XAE123' },
              services: [{ id: 's2', name: 'Revisión de Frenos', price: 40, currency: 'USD' }],
              parts: [],
              date: new Date().toISOString(),
              totalUSD: 40,
              status: 'En Proceso',
              mechanicName: 'Carlos Martinez',
            },
          ],
        });

        useClientStore.setState({
          clients: [
            {
              id: 'CLI-001',
              type: 'persona',
              nombre: 'Luis',
              apellido: 'Perez',
              documento: 'V-12345678',
              telefono: '04141234567',
              direccion: 'Chacao, Caracas',
            },
            {
              id: 'CLI-002',
              type: 'persona',
              nombre: 'Ana',
              apellido: 'Gomez',
              documento: 'V-87654321',
              telefono: '04247654321',
              direccion: 'Las Mercedes, Caracas',
            },
          ],
        });

        useVehicleStore.setState({
          vehicles: [
            {
              id: 'VEH-001',
              placa: 'AA11BB',
              marca: 'Toyota',
              modelo: 'Corolla',
              ano: '2015',
              color: 'Gris',
              ownerDocumento: 'V-12345678',
            },
            {
              id: 'VEH-002',
              placa: 'XAE123',
              marca: 'Ford',
              modelo: 'Fiesta',
              ano: '2012',
              color: 'Negro',
              ownerDocumento: 'V-87654321',
            },
          ],
        });

        useInventoryStore.setState({
          items: [
            {
              id: 'INV-001',
              codigo: '759123456789',
              tipo: 'PRODUCTO',
              nombre: 'Filtro de Aceite Purolator L14670',
              descripcion: 'Filtro de aceite roscado para motores Toyota/Ford.',
              marca: 'Purolator',
              costo: 4,
              precio: 8,
              currency: 'USD',
              stock: 12,
              stockMinimo: 3,
              categoria: 'Filtros',
              isActive: true,
            },
            {
              id: 'INV-002',
              codigo: '759987654321',
              tipo: 'PRODUCTO',
              nombre: 'Aceite Motor 15W40 Mineral (Paila)',
              descripcion: 'Lubricante para motores a gasolina y diesel.',
              marca: 'Inca',
              costo: 35,
              precio: 55,
              currency: 'USD',
              stock: 4,
              stockMinimo: 1,
              categoria: 'Lubricantes',
              isActive: true,
            },
          ],
        });

        set({ isCleanSlate: false, showWelcomeModal: false, hasSeenWelcome: true });
      },
    }),
    {
      name: 'rumilcar-onboarding-storage',
    }
  )
);

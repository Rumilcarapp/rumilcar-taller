import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TechnicalItemStatus = 'ok' | 'warning' | 'danger' | 'unchecked';
export type VerdictType = 'APTO' | 'PRECAUCION' | 'NO_RECOMENDADO';
export type InspectionStatus = 'Pendiente' | 'En proceso' | 'Completada' | 'Entregada';

export interface ChecklistItem {
  id: string;
  label: string;
  status: TechnicalItemStatus;
  notes?: string;
}

export interface ChecklistCategory {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface PrePurchaseInspection {
  id: string; // PC-2026-0001
  date: string;
  client: any;
  broughtBy?: string;
  vehicle: {
    placa?: string;
    marca: string;
    modelo: string;
    year: number;
    color?: string;
    km?: number;
    photos?: { url: string; note?: string }[];
  };
  categories: ChecklistCategory[];
  generalDiagnosis: string;
  verdict: VerdictType;
  priceUSD: number;
  currency: 'USD' | 'VES' | 'USDT';
  mechanicName: string;
  status: InspectionStatus;
}

interface PrePurchaseState {
  inspections: PrePurchaseInspection[];
  addInspection: (inspection: PrePurchaseInspection) => void;
  updateInspection: (id: string, inspection: Partial<PrePurchaseInspection>) => void;
  deleteInspection: (id: string) => void;
}

const defaultChecklistCategories: ChecklistCategory[] = [
  {
    id: 'motor',
    title: 'MOTOR',
    items: [
      { id: 'm1', label: 'Nivel y estado del aceite', status: 'ok' },
      { id: 'm2', label: 'Nivel y estado del refrigerante', status: 'ok' },
      { id: 'm3', label: 'Correa de distribución / cadena', status: 'ok' },
      { id: 'm4', label: 'Fugas visibles (aceite, agua, combustible)', status: 'ok' },
      { id: 'm5', label: 'Estado de mangueras y abrazaderas', status: 'ok' },
      { id: 'm6', label: 'Funcionamiento general del motor (ruidos, vibraciones)', status: 'ok' }
    ]
  },
  {
    id: 'transmision',
    title: 'TRANSMISIÓN',
    items: [
      { id: 't1', label: 'Caja de velocidades (manual o automática)', status: 'ok' },
      { id: 't2', label: 'Embrague (si aplica)', status: 'ok' },
      { id: 't3', label: 'Diferencial', status: 'ok' }
    ]
  },
  {
    id: 'frenos',
    title: 'FRENOS',
    items: [
      { id: 'f1', label: 'Pastillas y discos delanteros', status: 'ok' },
      { id: 'f2', label: 'Pastillas y discos traseros', status: 'ok' },
      { id: 'f3', label: 'Líquido de frenos (nivel y color)', status: 'ok' },
      { id: 'f4', label: 'Freno de mano', status: 'ok' }
    ]
  },
  {
    id: 'suspension',
    title: 'SUSPENSIÓN Y DIRECCIÓN',
    items: [
      { id: 's1', label: 'Amortiguadores delanteros y traseros', status: 'ok' },
      { id: 's2', label: 'Rótulas y terminales', status: 'ok' },
      { id: 's3', label: 'Cremallera de dirección', status: 'ok' },
      { id: 's4', label: 'Alineación y balanceo (visual)', status: 'ok' }
    ]
  },
  {
    id: 'electrico',
    title: 'SISTEMA ELÉCTRICO',
    items: [
      { id: 'e1', label: 'Batería (carga y estado)', status: 'ok' },
      { id: 'e2', label: 'Alternador', status: 'ok' },
      { id: 'e3', label: 'Luces delanteras, traseras y de giro', status: 'ok' },
      { id: 'e4', label: 'Aire acondicionado', status: 'ok' },
      { id: 'e5', label: 'Panel de instrumentos (testigos encendidos)', status: 'ok' }
    ]
  },
  {
    id: 'carroceria',
    title: 'CARROCERÍA Y CHASIS',
    items: [
      { id: 'c1', label: 'Estado general de la carrocería (golpes, óxido, pintura)', status: 'ok' },
      { id: 'c2', label: 'Piso y chasis (corrosión, dobleces)', status: 'ok' },
      { id: 'c3', label: 'Vidrios y espejos', status: 'ok' },
      { id: 'c4', label: 'Cauchos (estado y medida)', status: 'ok' }
    ]
  },
  {
    id: 'interior',
    title: 'INTERIOR',
    items: [
      { id: 'i1', label: 'Tapicería y alfombras', status: 'ok' },
      { id: 'i2', label: 'Funcionamiento de elevavidrios', status: 'ok' },
      { id: 'i3', label: 'Cinturones de seguridad', status: 'ok' },
      { id: 'i4', label: 'Estado general del tablero', status: 'ok' }
    ]
  }
];

export const getDefaultChecklistCategories = (): ChecklistCategory[] => 
  JSON.parse(JSON.stringify(defaultChecklistCategories));

export const usePrePurchaseStore = create<PrePurchaseState>()(
  persist(
    (set) => ({
      inspections: [
        {
          id: 'PC-2026-0001',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          client: { nombre: 'Carlos', apellido: 'Benitez', documento: 'V-18456123', telefono: '04141112233' },
          broughtBy: 'Vendedor particular (Pedro G.)',
          vehicle: {
            placa: 'AB123CD',
            marca: 'Toyota',
            modelo: 'Yaris',
            year: 2014,
            color: 'Plata',
            km: 125000
          },
          categories: defaultChecklistCategories,
          generalDiagnosis: 'Vehículo en excelente estado mecánico general. Compresión de motor óptima (160 PSI parejo). Requiere pronto reemplazo de amortiguadores traseros por leve fuga.',
          verdict: 'PRECAUCION',
          priceUSD: 45.00,
          currency: 'USD',
          mechanicName: 'Carlos P.',
          status: 'Completada'
        }
      ],
      addInspection: (inspection) => set((state) => ({ inspections: [inspection, ...state.inspections] })),
      updateInspection: (id, inspection) => set((state) => ({ inspections: state.inspections.map(i => i.id === id ? { ...i, ...inspection } : i) })),
      deleteInspection: (id) => set((state) => ({ inspections: state.inspections.filter(i => i.id !== id) }))
    }),
    {
      name: 'rumilcar-prepurchase-storage'
    }
  )
);

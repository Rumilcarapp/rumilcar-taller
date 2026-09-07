import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PipelineStage = 
  | 'POR_CONTACTAR' 
  | 'CONTACTADO' 
  | 'NEGOCIACION' 
  | 'AGENDADO' 
  | 'COMPLETADO' 
  | 'PERDIDO';

export interface CRMOpportunity {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  title: string;
  serviceType: string;
  stage: PipelineStage;
  estimatedValueUSD: number;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  notes?: string;
  lastContactDate: string;
  nextFollowUpDate?: string;
  createdAt: string;
}

export type InteractionType = 'WHATSAPP' | 'LLAMADA' | 'EMAIL' | 'VISITA' | 'NOTA_INTERNA';

export interface CRMInteraction {
  id: string;
  clientId: string;
  clientName?: string;
  type: InteractionType;
  summary: string;
  details?: string;
  sentiment?: 'POSITIVO' | 'NEUTRO' | 'URGENTE' | 'INSATISFECHO';
  date: string;
  user: string;
}

export interface CRMTemplate {
  id: string;
  category: 'MANTENIMIENTO' | 'COTIZACION' | 'POST_VENTA' | 'RECORDATORIO' | 'CUMPLEANOS' | 'GENERAL';
  title: string;
  description: string;
  template: string;
  isDefault?: boolean;
}

export interface MaintenanceRule {
  id: string;
  name: string;
  intervalKm: number;
  intervalDays: number;
  description: string;
  iconName: string;
  defaultTemplateId: string;
}

interface CRMState {
  opportunities: CRMOpportunity[];
  interactions: CRMInteraction[];
  templates: CRMTemplate[];
  maintenanceRules: MaintenanceRule[];

  addOpportunity: (opp: Omit<CRMOpportunity, 'id' | 'createdAt'>) => void;
  updateOpportunityStage: (id: string, stage: PipelineStage) => void;
  updateOpportunity: (id: string, updates: Partial<CRMOpportunity>) => void;
  deleteOpportunity: (id: string) => void;

  addInteraction: (interaction: Omit<CRMInteraction, 'id' | 'date'>) => void;
  deleteInteraction: (id: string) => void;

  addTemplate: (tpl: Omit<CRMTemplate, 'id'>) => void;
  updateTemplate: (id: string, updates: Partial<CRMTemplate>) => void;
  deleteTemplate: (id: string) => void;
}

const DEFAULT_TEMPLATES: CRMTemplate[] = [
  {
    id: 'tpl-mantenimiento-aceite',
    category: 'MANTENIMIENTO',
    title: '🛢️ Recordatorio Cambio de Aceite y Filtros',
    description: 'Aviso amigable cuando el cliente está próximo o cumplió el tiempo/km de servicio.',
    template: 'Hola [nombre] 👋, te saludamos de [nombre_taller]. Notamos que a tu vehículo [vehiculo] (Placa: [placa]) le corresponde su servicio preventivo de cambio de aceite y filtros. ¡Cuidar tu motor a tiempo previene averías costosas! ¿Te gustaría que te reservemos un turno para esta semana?',
    isDefault: true,
  },
  {
    id: 'tpl-frenos-seguridad',
    category: 'MANTENIMIENTO',
    title: '🛑 Revisión de Frenos y Seguridad',
    description: 'Alerta preventiva para chequeo de pastillas, discos y líquido de frenos.',
    template: 'Estimado/a [nombre], en [nombre_taller] tu seguridad es lo primero. Han pasado varios meses desde la última revisión de frenos de tu [vehiculo] ([placa]). Te ofrecemos una inspección visual de frenos y suspensión 100% bonificada. Contáctanos al [telefono_taller] para agendar.',
    isDefault: true,
  },
  {
    id: 'tpl-distribucion',
    category: 'MANTENIMIENTO',
    title: '⚙️ Cambio de Kit de Distribución / Correa',
    description: 'Aviso crucial para mantenimiento de alto kilometraje.',
    template: 'Hola [nombre], un saludo de [nombre_taller]. De acuerdo con el kilometraje estimado de tu [vehiculo] ([placa]), es momento de revisar el kit de distribución/correa de tiempo para garantizar el óptimo funcionamiento de tu motor. ¿Deseas que te preparemos un presupuesto a medida?',
    isDefault: true,
  },
  {
    id: 'tpl-cotizacion-pendiente',
    category: 'COTIZACION',
    title: '📋 Seguimiento de Presupuesto / Cotización',
    description: 'Reactivar clientes que cotizaron pero aún no aprobaron el trabajo.',
    template: 'Hola [nombre] 👋, te escribe el equipo de [nombre_taller]. Queríamos saber si tuviste oportunidad de revisar el presupuesto que te enviamos para tu [vehiculo] ([placa]). Con gusto aclaramos cualquier duda o podemos coordinar facilidades de pago para atender tu auto.',
    isDefault: true,
  },
  {
    id: 'tpl-vehiculo-listo',
    category: 'POST_VENTA',
    title: '🚗 Vehículo Listo para Retiro',
    description: 'Notificar al cliente que su vehículo ha sido finalizado con éxito.',
    template: '¡Buenas noticias [nombre]! 🎉 Tu vehículo [vehiculo] ([placa]) ya está completamente listo en [nombre_taller]. Puedes pasar a retirarlo en nuestro horario habitual. Si necesitas el detalle del monto o métodos de pago, avísanos con gusto. ¡Te esperamos!',
    isDefault: true,
  },
  {
    id: 'tpl-encuesta-calidad',
    category: 'POST_VENTA',
    title: '⭐ Encuesta de Calidad & Reseña en Google',
    description: 'Fidelización y reputación post-entrega del vehículo.',
    template: 'Hola [nombre] 👋, fue un placer atender tu [vehiculo] en [nombre_taller]. Nos esforzamos por dar el mejor servicio. ¿Cómo calificarías tu experiencia del 1 al 5 ⭐? Tu opinión nos ayuda a seguir mejorando cada día. ¡Muchas gracias por confiar en nosotros!',
    isDefault: true,
  },
  {
    id: 'tpl-cumpleanos',
    category: 'CUMPLEANOS',
    title: '🎂 Saludo de Cumpleaños + Regalo Especial',
    description: 'Felicitar al cliente con un beneficio exclusivo.',
    template: '¡Feliz Cumpleaños [nombre]! 🎂🥳 De parte de todo el equipo de [nombre_taller] te deseamos un día extraordinario. Queremos celebrarlo contigo obsequiándote un 15% de descuento en mano de obra para tu [vehiculo] durante este mes. ¡Que pases un excelente día!',
    isDefault: true,
  },
  {
    id: 'tpl-saldo-amigable',
    category: 'RECORDATORIO',
    title: '💸 Recordatorio Amigable de Saldo Pendiente',
    description: 'Notificación respetuosa para gestión de cobranza.',
    template: 'Hola [nombre], un saludo cordial de [nombre_taller]. Te escribimos para recordarte que tienes un saldo pendiente por los servicios realizados a tu vehículo [placa]. Puedes realizar tu pago en caja o mediante transferencia/pago móvil. Escríbenos para enviarte los datos bancarios.',
    isDefault: true,
  },
];

const DEFAULT_MAINTENANCE_RULES: MaintenanceRule[] = [
  {
    id: 'rule-aceite',
    name: 'Cambio de Aceite y Filtros',
    intervalKm: 5000,
    intervalDays: 90,
    description: 'Reemplazo de lubricante sintético/mineral y filtros de aceite/aire.',
    iconName: 'Droplet',
    defaultTemplateId: 'tpl-mantenimiento-aceite',
  },
  {
    id: 'rule-frenos',
    name: 'Revisión y Pastillas de Frenos',
    intervalKm: 15000,
    intervalDays: 180,
    description: 'Inspección de desgaste de pastillas, discos, zapatas y líquido de frenos.',
    iconName: 'ShieldAlert',
    defaultTemplateId: 'tpl-frenos-seguridad',
  },
  {
    id: 'rule-alineacion',
    name: 'Alineación, Balanceo y Rotación',
    intervalKm: 10000,
    intervalDays: 120,
    description: 'Geometría de dirección y rotación de neumáticos para desgaste uniforme.',
    iconName: 'Compass',
    defaultTemplateId: 'tpl-mantenimiento-aceite',
  },
  {
    id: 'rule-distribucion',
    name: 'Kit de Distribución / Banda',
    intervalKm: 50000,
    intervalDays: 730,
    description: 'Cambio preventivo de correa de distribución, tensor y bomba de agua.',
    iconName: 'Cog',
    defaultTemplateId: 'tpl-distribucion',
  },
  {
    id: 'rule-inspeccion-general',
    name: 'Inspección General y Diagnóstico',
    intervalKm: 20000,
    intervalDays: 180,
    description: 'Escaneo computarizado, revisión de suspensión, luces y fluidos.',
    iconName: 'CheckSquare',
    defaultTemplateId: 'tpl-frenos-seguridad',
  },
];

export const useCRMStore = create<CRMState>()(
  persist(
    (set) => ({
      opportunities: [
        {
          id: 'opp-1',
          clientId: 'CLI-001',
          clientName: 'Luis Perez',
          clientPhone: '04141234567',
          vehiclePlate: 'ABC-123',
          vehicleModel: 'Toyota Corolla 2018',
          title: 'Cambio de amortiguadores delanteros',
          serviceType: 'Suspensión',
          stage: 'CONTACTADO',
          estimatedValueUSD: 240,
          priority: 'ALTA',
          notes: 'Se le envió presupuesto por WhatsApp. Esperando confirmación para el viernes.',
          lastContactDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'opp-2',
          clientId: 'CLI-002',
          clientName: 'Ana Gomez',
          clientPhone: '04247654321',
          vehiclePlate: 'XYZ-789',
          vehicleModel: 'Ford Fiesta 2015',
          title: 'Mantenimiento Preventivo 50.000 KM',
          serviceType: 'Mantenimiento General',
          stage: 'NEGOCIACION',
          estimatedValueUSD: 180,
          priority: 'MEDIA',
          notes: 'Consultó por cambio de correa y afinación. Interesada en agendar el lunes.',
          lastContactDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      interactions: [
        {
          id: 'int-1',
          clientId: 'CLI-001',
          clientName: 'Luis Perez',
          type: 'WHATSAPP',
          summary: 'Envío de recordatorio de servicio de suspensión',
          details: 'Se contactó para recordarle revisión de amortiguadores presupuestados.',
          sentiment: 'POSITIVO',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          user: 'Asesor Técnico',
        },
        {
          id: 'int-2',
          clientId: 'CLI-002',
          clientName: 'Ana Gomez',
          type: 'LLAMADA',
          summary: 'Consulta sobre costo de mano de obra para frenos',
          details: 'La clienta llamó preguntando por disponibilidad de turnos en las mañanas.',
          sentiment: 'POSITIVO',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          user: 'Recepción',
        },
      ],
      templates: DEFAULT_TEMPLATES,
      maintenanceRules: DEFAULT_MAINTENANCE_RULES,

      addOpportunity: (opp) => set((state) => ({
        opportunities: [
          {
            ...opp,
            id: 'opp-' + Date.now(),
            createdAt: new Date().toISOString(),
          },
          ...state.opportunities,
        ],
      })),

      updateOpportunityStage: (id, stage) => set((state) => ({
        opportunities: state.opportunities.map((o) =>
          o.id === id ? { ...o, stage, lastContactDate: new Date().toISOString() } : o
        ),
      })),

      updateOpportunity: (id, updates) => set((state) => ({
        opportunities: state.opportunities.map((o) =>
          o.id === id ? { ...o, ...updates } : o
        ),
      })),

      deleteOpportunity: (id) => set((state) => ({
        opportunities: state.opportunities.filter((o) => o.id !== id),
      })),

      addInteraction: (interaction) => set((state) => ({
        interactions: [
          {
            ...interaction,
            id: 'int-' + Date.now(),
            date: new Date().toISOString(),
          },
          ...state.interactions,
        ],
      })),

      deleteInteraction: (id) => set((state) => ({
        interactions: state.interactions.filter((i) => i.id !== id),
      })),

      addTemplate: (tpl) => set((state) => ({
        templates: [
          ...state.templates,
          { ...tpl, id: 'tpl-' + Date.now() },
        ],
      })),

      updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      })),

      deleteTemplate: (id) => set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
      })),
    }),
    {
      name: 'rumilcar-crm-storage',
    }
  )
);

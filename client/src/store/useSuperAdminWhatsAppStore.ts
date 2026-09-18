import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SuperAdminWATemplate {
  id: string;
  title: string;
  category: 'BIENVENIDA' | 'VENCIMIENTO' | 'SOPORTE' | 'PAGO' | 'PROMOCION' | 'GENERAL';
  text: string;
  isDefault?: boolean;
}

export interface WorkshopTemplateData {
  nombre_dueno: string;
  nombre_taller: string;
  dias_restantes: string | number;
  plan: string;
  email: string;
  telefono: string;
  fecha_registro?: string;
}

interface SuperAdminWhatsAppState {
  templates: SuperAdminWATemplate[];
  addTemplate: (tpl: Omit<SuperAdminWATemplate, 'id'>) => SuperAdminWATemplate;
  updateTemplate: (id: string, updates: Partial<SuperAdminWATemplate>) => void;
  deleteTemplate: (id: string) => void;
  resetToDefaults: () => void;
  replaceVariables: (text: string, data: WorkshopTemplateData) => string;
}

export const DEFAULT_SUPERADMIN_TEMPLATES: SuperAdminWATemplate[] = [
  {
    id: 'tpl-bienvenida',
    title: 'Bienvenida e Inducción al Software',
    category: 'BIENVENIDA',
    isDefault: true,
    text: `Hola {nombre_dueno}, te saluda el equipo de Soporte y Éxito de Rumilcarapp 🚗🔧.

¡Bienvenido a bordo con tu taller {nombre_taller}! Tu cuenta está activa en período de prueba gratuita ({dias_restantes} días).

Estamos aquí para ayudarte a poner a punto tu taller: registrar tus clientes, mecánicos e inventario, y emitir tus primeras órdenes de trabajo.

¿Tienes unos minutos para coordinar una breve inducción o deseas que te asistamos con alguna duda inicial?

Plataforma: https://rumilcarapp.vercel.app`,
  },
  {
    id: 'tpl-vencimiento',
    title: 'Recordatorio de Vencimiento de Prueba',
    category: 'VENCIMIENTO',
    isDefault: true,
    text: `Hola {nombre_dueno}, un cordial saludo de parte de Rumilcarapp.

Te escribimos para recordarte que a tu taller {nombre_taller} le restan {dias_restantes} día(s) de prueba gratuita.

Queremos asegurar que tu equipo continúe operando sin interrupciones. ¿Te gustaría coordinar la activación formal de tu plan ({plan}) o revisar facilidades de pago (Pago Móvil, Zelle o Transferencia)?

Quedamos atentos para apoyarte.`,
  },
  {
    id: 'tpl-soporte-inmediato',
    title: 'Soporte Técnico Rápido',
    category: 'SOPORTE',
    isDefault: true,
    text: `Hola {nombre_dueno}, te saluda Luark Padilla del equipo de Soporte Técnico de Rumilcarapp.

Nos comunicamos respecto a la cuenta de tu taller {nombre_taller}. ¿Hay algún proceso, reporte o duda técnica en la que requieras asistencia en este momento?

Estamos a tu entera disposición para resolverla de inmediato.`,
  },
  {
    id: 'tpl-pago-pendiente',
    title: 'Aviso de Acceso Suspendido / Pago Pendiente',
    category: 'PAGO',
    isDefault: true,
    text: `Estimado/a {nombre_dueno}, un cordial saludo desde Rumilcarapp.

Te informamos que el acceso al software para el taller {nombre_taller} se encuentra temporalmente en pausa por período vencido.

Para reactivar el acceso de inmediato para ti y tus mecánicos, puedes respondernos a este mensaje para coordinar la renovación.

¡Tu información y órdenes de trabajo están 100% seguras y listas para continuar!`,
  },
  {
    id: 'tpl-promocion-pro',
    title: 'Oferta Especial Renovación Plan PRO',
    category: 'PROMOCION',
    isDefault: true,
    text: `¡Hola {nombre_dueno}! Esperamos que todo marche excelente en {nombre_taller} 🚀.

Queremos ofrecerte un beneficio exclusivo para tu taller: al contratar o renovar tu membresía anual de Rumilcarapp, obtienes 2 meses adicionales de regalo y soporte VIP prioritario.

¿Deseas que te enviemos la propuesta ajustada a las necesidades de tu taller?`,
  },
];

export const useSuperAdminWhatsAppStore = create<SuperAdminWhatsAppState>()(
  persist(
    (set, get) => ({
      templates: DEFAULT_SUPERADMIN_TEMPLATES,

      addTemplate: (tpl) => {
        const newTemplate: SuperAdminWATemplate = {
          ...tpl,
          id: `tpl-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          isDefault: false,
        };
        set((state) => ({
          templates: [newTemplate, ...state.templates],
        }));
        return newTemplate;
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates, isDefault: false } : t
          ),
        }));
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      },

      resetToDefaults: () => {
        set({ templates: DEFAULT_SUPERADMIN_TEMPLATES });
      },

      replaceVariables: (text, data) => {
        if (!text) return '';
        let result = text;
        result = result.replace(/\{nombre_dueno\}/gi, data.nombre_dueno || 'Estimado/a');
        result = result.replace(/\{nombre_taller\}/gi, data.nombre_taller || 'tu taller');
        result = result.replace(/\{dias_restantes\}/gi, String(data.dias_restantes ?? 0));
        result = result.replace(/\{plan\}/gi, data.plan || 'Plan Estándar');
        result = result.replace(/\{email\}/gi, data.email || '');
        result = result.replace(/\{telefono\}/gi, data.telefono || '');
        if (data.fecha_registro) {
          result = result.replace(/\{fecha_registro\}/gi, data.fecha_registro);
        }
        return result;
      },
    }),
    {
      name: 'rumilcar_superadmin_wa_templates',
    }
  )
);

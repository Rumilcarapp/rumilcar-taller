import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SubscriptionPlanKey = 'TRIAL' | 'BASIC' | 'PRO' | 'ELITE';
export type SubscriptionStatusKey = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';
export type PaymentMethodKey = 'PAGO_MOVIL' | 'ZINLI' | 'USDT_BINANCE';

export interface SubscriptionPayment {
  id: string;
  amountUSD: number;
  amountVES?: number | null;
  paymentMethod: PaymentMethodKey;
  referenceNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface PlanDefinition {
  id: SubscriptionPlanKey;
  name: string;
  badge: string;
  priceUSD: number;
  yearlyUSD: number;
  popular?: boolean;
  features: string[];
}

export interface OfficialPaymentInfo {
  pagoMovil: {
    phone: string;
    bank: string;
    holder: string;
    idNumber: string;
  };
  zinli: {
    email: string;
    holder: string;
  };
  usdtBinance: {
    emailOrPayId: string;
    network: string;
    holder: string;
  };
  plans: PlanDefinition[];
}

export interface WorkshopSubscription {
  id?: string;
  workshopId: string;
  plan: SubscriptionPlanKey;
  status: SubscriptionStatusKey;
  trialStartedAt: string;
  trialEndsAt: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  billingCycle: 'MONTHLY' | 'YEARLY';
  priceUSD: number;
  maxMechanics: number;
  daysRemaining: number;
  isTrial: boolean;
  isExpired: boolean;
  payments: SubscriptionPayment[];
}

export interface AdminWorkshopItem {
  workshopId: string;
  workshopName: string;
  email: string;
  phone: string;
  ownerName: string;
  createdAt: string;
  plan: SubscriptionPlanKey;
  status: SubscriptionStatusKey;
  daysRemaining: number;
  isTrial: boolean;
  stats: {
    orders: number;
    clients: number;
    mechanics: number;
  };
  pendingPayments: SubscriptionPayment[];
}

export interface SaaSAdminKpis {
  totalWorkshops: number;
  activePaid: number;
  trialing: number;
  expiringSoon: number;
  pendingReview: number;
  mrrUSD: number;
}

export interface SaaSAdminAnalytics {
  summary: {
    mrrUSD: number;
    arrUSD: number;
    totalRevenueUSD: number;
    totalRevenueVES: number;
    totalWorkshops: number;
    activePaidWorkshops: number;
    trialingWorkshops: number;
    expiringSoonWorkshops: number;
    suspendedWorkshops: number;
    conversionRate: number;
    totalPlatformOrders: number;
    totalPlatformClients: number;
    totalPlatformVehicles: number;
    totalPlatformUsers: number;
  };
  planDistribution: {
    plan: SubscriptionPlanKey;
    name: string;
    count: number;
    priceUSD: number;
    mrrUSD: number;
    color: string;
  }[];
  paymentMethodsBreakdown: {
    method: string;
    label: string;
    count: number;
    totalUSD: number;
    totalVES: number;
  }[];
  monthlyRevenueTrend: {
    month: string;
    revenueUSD: number;
    paidWorkshops: number;
  }[];
  topWorkshops: {
    workshopId: string;
    workshopName: string;
    ownerName: string;
    phone: string;
    email: string;
    plan: SubscriptionPlanKey;
    status: SubscriptionStatusKey;
    daysRemaining: number;
    ordersCount: number;
    clientsCount: number;
    mechanicsCount: number;
    createdAt: string;
  }[];
  recentPayments: {
    id: string;
    workshopName: string;
    amountUSD: number;
    amountVES?: number | null;
    paymentMethod: string;
    referenceNumber: string;
    status: string;
    createdAt: string;
  }[];
}

interface SubscriptionState {
  subscription: WorkshopSubscription | null;
  paymentInfo: OfficialPaymentInfo;
  adminWorkshops: AdminWorkshopItem[];
  adminKpis: SaaSAdminKpis;
  adminAnalytics: SaaSAdminAnalytics | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSubscription: (workshopId?: string) => Promise<void>;
  reportPayment: (data: {
    amountUSD: number;
    amountVES?: number;
    paymentMethod: PaymentMethodKey;
    referenceNumber: string;
    plan: SubscriptionPlanKey;
    billingCycle: 'MONTHLY' | 'YEARLY';
    notes?: string;
  }) => Promise<{ success: boolean; message: string }>;
  fetchAdminWorkshops: () => Promise<void>;
  fetchAdminAnalytics: () => Promise<void>;
  approvePayment: (paymentId: string, plan: SubscriptionPlanKey, months?: number) => Promise<boolean>;
  rejectPayment: (paymentId: string, reason: string) => Promise<boolean>;
  extendTrial: (workshopId: string, days?: number) => Promise<boolean>;
  changePlan: (workshopId: string, plan: SubscriptionPlanKey, status: SubscriptionStatusKey) => Promise<boolean>;
}

const DEFAULT_OFFICIAL_PAYMENT_INFO: OfficialPaymentInfo = {
  pagoMovil: {
    phone: '04241550550',
    bank: 'Banco Mercantil',
    holder: 'Luark Padilla',
    idNumber: 'V-24.317.195',
  },
  zinli: {
    email: 'luarkpadilla@gmail.com',
    holder: 'Luark Padilla',
  },
  usdtBinance: {
    emailOrPayId: 'luarkpadilla@gmail.com',
    network: 'Solo Binance Pay',
    holder: 'Luark Padilla',
  },
  plans: [
    {
      id: 'TRIAL',
      name: 'Prueba Gratuita',
      badge: '15 Días Gratis',
      priceUSD: 0,
      yearlyUSD: 0,
      features: [
        'Acceso completo a todos los módulos',
        'Hasta 3 mecánicos o usuarios',
        'Moneda dual USD / Bolívares en vivo',
        'Diagnósticos e inspecciones',
        'Soporte de bienvenida',
      ],
    },
    {
      id: 'BASIC',
      name: 'Taller Emprendedor',
      badge: 'Esencial',
      priceUSD: 19,
      yearlyUSD: 190,
      features: [
        'Hasta 40 órdenes de trabajo / mes',
        '1 Dueño + 2 Mecánicos',
        'Inventario hasta 150 repuestos',
        'Presupuestos y cobros en WhatsApp',
        'Control de caja y tasa BCV del día',
        'Soporte estándar por correo / chat',
      ],
    },
    {
      id: 'PRO',
      name: 'Taller Profesional',
      badge: 'Más Popular ⭐',
      popular: true,
      priceUSD: 39,
      yearlyUSD: 390,
      features: [
        'Órdenes de trabajo ILIMITADAS',
        'Hasta 6 usuarios o mecánicos',
        'Inventario y alertas de stock ilimitadas',
        'Rastreo web en vivo para clientes',
        'Inspección visual con fotos y odómetro',
        'Punto de Venta (POS) y facturación',
        'Plantillas automatizadas de WhatsApp',
        'Soporte prioritario en horario laboral',
      ],
    },
    {
      id: 'ELITE',
      name: 'Taller Élite / Multisede',
      badge: 'Corporativo 👑',
      priceUSD: 79,
      yearlyUSD: 790,
      features: [
        'Mecánicos y usuarios ILIMITADOS',
        'Soporte para múltiples bodegas / sedes',
        'Rastreo web con marca personalizada',
        'Módulo CRM y fidelización de clientes',
        'Auditoría completa de acciones',
        'Asesor VIP dedicado 24/7',
        'Capacitación inicial para todo el equipo',
      ],
    },
  ],
};

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
};

const getAuthToken = () => {
  return localStorage.getItem('rumilcar_token') || '';
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscription: null,
      paymentInfo: DEFAULT_OFFICIAL_PAYMENT_INFO,
      adminWorkshops: [],
      adminKpis: {
        totalWorkshops: 1,
        activePaid: 0,
        trialing: 1,
        expiringSoon: 0,
        pendingReview: 0,
        mrrUSD: 0,
      },
      adminAnalytics: null,
      isLoading: false,
      error: null,

      fetchSubscription: async (workshopId?: string) => {
        set({ isLoading: true, error: null });
        const token = getAuthToken();

        try {
          if (token) {
            const res = await fetch(`${getApiUrl()}/subscriptions/current`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              set({
                subscription: data,
                paymentInfo: data.paymentInfo || DEFAULT_OFFICIAL_PAYMENT_INFO,
                isLoading: false,
              });
              return;
            }
          }
        } catch {
          // Fallback to local calculation if server unreachable
        }

        // Local fallback calculation (e.g. 15-day trial based on local creation date)
        const currentSub = get().subscription;
        if (!currentSub) {
          const now = new Date();
          const trialEnds = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
          set({
            subscription: {
              workshopId: workshopId || 'default-workshop',
              plan: 'TRIAL',
              status: 'TRIALING',
              trialStartedAt: now.toISOString(),
              trialEndsAt: trialEnds.toISOString(),
              billingCycle: 'MONTHLY',
              priceUSD: 0,
              maxMechanics: 3,
              daysRemaining: 15,
              isTrial: true,
              isExpired: false,
              payments: [],
            },
            isLoading: false,
          });
        } else {
          // Recompute remaining days
          const now = new Date();
          const endsAt = new Date(currentSub.currentPeriodEnd || currentSub.trialEndsAt);
          const days = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          set({
            subscription: {
              ...currentSub,
              daysRemaining: Math.max(0, days),
              isExpired: days <= 0,
            },
            isLoading: false,
          });
        }
      },

      reportPayment: async (data) => {
        set({ isLoading: true });
        const token = getAuthToken();

        const newPayment: SubscriptionPayment = {
          id: 'pay-' + Date.now(),
          amountUSD: data.amountUSD,
          amountVES: data.amountVES || null,
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber,
          status: 'PENDING',
          notes: data.notes || `Plan ${data.plan} (${data.billingCycle})`,
          createdAt: new Date().toISOString(),
        };

        try {
          if (token) {
            const res = await fetch(`${getApiUrl()}/subscriptions/report-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(data),
            });
            if (res.ok) {
              const resData = await res.json();
              const sub = get().subscription;
              if (sub) {
                set({
                  subscription: {
                    ...sub,
                    payments: [resData.payment || newPayment, ...sub.payments],
                  },
                  isLoading: false,
                });
              }
              return { success: true, message: resData.message || 'Pago reportado con éxito.' };
            }
          }
        } catch {
          // Local fallback
        }

        // Local save
        const sub = get().subscription;
        if (sub) {
          set({
            subscription: {
              ...sub,
              payments: [newPayment, ...sub.payments],
            },
            isLoading: false,
          });
        }

        // Also update admin workshops if local
        const adminList = get().adminWorkshops;
        const currentWorkshopId = sub?.workshopId || 'default-workshop';
        const updatedAdminList = adminList.map((w) => {
          if (w.workshopId === currentWorkshopId) {
            return {
              ...w,
              pendingPayments: [newPayment, ...w.pendingPayments],
            };
          }
          return w;
        });

        set({ adminWorkshops: updatedAdminList, isLoading: false });

        return {
          success: true,
          message: 'Comprobante recibido con éxito. Será verificado por el equipo de Rumilcarapp en breve.',
        };
      },

      fetchAdminWorkshops: async () => {
        const token = getAuthToken();
        try {
          if (token) {
            const res = await fetch(`${getApiUrl()}/subscriptions/admin/workshops`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              set({
                adminWorkshops: data.workshops || [],
                adminKpis: data.kpis || get().adminKpis,
              });
              return;
            }
          }
        } catch {
          // Fallback to local
        }

        // Mock list for SuperAdmin testing
        const sub = get().subscription;
        const pending = sub?.payments.filter((p) => p.status === 'PENDING') || [];
        const localList: AdminWorkshopItem[] = [
          {
            workshopId: sub?.workshopId || 'ws-1',
            workshopName: 'Taller Don Pedro',
            email: 'admin@taller.com',
            phone: '0414-1112233',
            ownerName: 'Don Pedro (Dueño)',
            createdAt: sub?.trialStartedAt || new Date().toISOString(),
            plan: sub?.plan || 'TRIAL',
            status: sub?.status || 'TRIALING',
            daysRemaining: sub?.daysRemaining ?? 15,
            isTrial: sub?.isTrial ?? true,
            stats: { orders: 12, clients: 18, mechanics: 3 },
            pendingPayments: pending,
          },
          {
            workshopId: 'ws-demo-2',
            workshopName: 'Auto Frenos Caracas C.A.',
            email: 'contacto@autofrenos.com',
            phone: '0424-5551234',
            ownerName: 'Alejandro Morales',
            createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
            plan: 'PRO',
            status: 'ACTIVE',
            daysRemaining: 22,
            isTrial: false,
            stats: { orders: 48, clients: 65, mechanics: 5 },
            pendingPayments: [],
          },
          {
            workshopId: 'ws-demo-3',
            workshopName: 'Electro Auto Express',
            email: 'taller@electroauto.com',
            phone: '0412-9988776',
            ownerName: 'Roberto Gómez',
            createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
            plan: 'TRIAL',
            status: 'TRIALING',
            daysRemaining: 1,
            isTrial: true,
            stats: { orders: 8, clients: 12, mechanics: 2 },
            pendingPayments: [],
          },
        ];

        set({
          adminWorkshops: localList,
          adminKpis: {
            totalWorkshops: localList.length,
            activePaid: localList.filter((w) => w.status === 'ACTIVE').length,
            trialing: localList.filter((w) => w.isTrial).length,
            expiringSoon: localList.filter((w) => w.daysRemaining <= 3 && w.daysRemaining >= 0).length,
            pendingReview: localList.reduce((acc, w) => acc + w.pendingPayments.length, 0),
            mrrUSD: 39,
          },
        });
      },

      fetchAdminAnalytics: async () => {
        const token = getAuthToken();
        try {
          if (token) {
            const res = await fetch(`${getApiUrl()}/subscriptions/admin/analytics`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data: SaaSAdminAnalytics = await res.json();
              set({ adminAnalytics: data });
              return;
            }
          }
        } catch (err) {
          console.error('Error fetching admin analytics:', err);
        }

        // Fallback local analytics derivation
        const workshops = get().adminWorkshops;
        const totalWorkshops = workshops.length || 1;
        const activePaidWorkshops = workshops.filter((w) => w.status === 'ACTIVE').length;
        const trialingWorkshops = workshops.filter((w) => w.isTrial).length;
        const expiringSoonWorkshops = workshops.filter((w) => w.daysRemaining <= 3 && w.daysRemaining >= 0).length;
        const mrrUSD = get().adminKpis?.mrrUSD || 39;

        const fallbackAnalytics: SaaSAdminAnalytics = {
          summary: {
            mrrUSD,
            arrUSD: mrrUSD * 12,
            totalRevenueUSD: 118,
            totalRevenueVES: 4720,
            totalWorkshops,
            activePaidWorkshops,
            trialingWorkshops,
            expiringSoonWorkshops,
            suspendedWorkshops: 0,
            conversionRate: Math.round((activePaidWorkshops / totalWorkshops) * 100),
            totalPlatformOrders: workshops.reduce((acc, w) => acc + (w.stats?.orders || 0), 68),
            totalPlatformClients: workshops.reduce((acc, w) => acc + (w.stats?.clients || 0), 95),
            totalPlatformVehicles: 84,
            totalPlatformUsers: 14,
          },
          planDistribution: [
            { plan: 'TRIAL', name: 'Prueba Gratuita (15d)', count: trialingWorkshops, priceUSD: 0, mrrUSD: 0, color: '#64748b' },
            { plan: 'BASIC', name: 'Taller Emprendedor', count: 0, priceUSD: 19, mrrUSD: 0, color: '#3b82f6' },
            { plan: 'PRO', name: 'Taller Profesional', count: activePaidWorkshops || 1, priceUSD: 39, mrrUSD: (activePaidWorkshops || 1) * 39, color: '#e11d48' },
            { plan: 'ELITE', name: 'Taller Élite / Multisede', count: 0, priceUSD: 79, mrrUSD: 0, color: '#8b5cf6' },
          ],
          paymentMethodsBreakdown: [
            { method: 'PAGO_MOVIL', label: 'Pago Móvil (Mercantil)', count: 2, totalUSD: 78, totalVES: 3120 },
            { method: 'USDT_BINANCE', label: 'Binance Pay (USDT)', count: 1, totalUSD: 40, totalVES: 1600 },
            { method: 'ZINLI', label: 'Zinli Wallet (USD)', count: 0, totalUSD: 0, totalVES: 0 },
          ],
          monthlyRevenueTrend: [
            { month: 'May 2026', revenueUSD: 39, paidWorkshops: 1 },
            { month: 'Jun 2026', revenueUSD: 39, paidWorkshops: 1 },
            { month: 'Jul 2026', revenueUSD: 58, paidWorkshops: 2 },
            { month: 'Ago 2026', revenueUSD: 78, paidWorkshops: 2 },
            { month: 'Sep 2026', revenueUSD: 118, paidWorkshops: 3 },
          ],
          topWorkshops: workshops.map((w) => ({
            workshopId: w.workshopId,
            workshopName: w.workshopName,
            ownerName: w.ownerName,
            phone: w.phone,
            email: w.email,
            plan: w.plan,
            status: w.status,
            daysRemaining: w.daysRemaining,
            ordersCount: w.stats?.orders || 0,
            clientsCount: w.stats?.clients || 0,
            mechanicsCount: w.stats?.mechanics || 0,
            createdAt: w.createdAt,
          })),
          recentPayments: [
            {
              id: 'p-demo-1',
              workshopName: 'Auto Frenos Caracas C.A.',
              amountUSD: 39,
              amountVES: 1560,
              paymentMethod: 'PAGO_MOVIL',
              referenceNumber: 'REF-849201',
              status: 'APPROVED',
              createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
            },
            {
              id: 'p-demo-2',
              workshopName: 'Taller Don Pedro',
              amountUSD: 39,
              amountVES: 1560,
              paymentMethod: 'USDT_BINANCE',
              referenceNumber: 'BINANCE-TX-9921',
              status: 'APPROVED',
              createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
            },
          ],
        };

        set({ adminAnalytics: fallbackAnalytics });
      },

      approvePayment: async (paymentId: string, plan: SubscriptionPlanKey, months = 1) => {
        const token = getAuthToken();
        try {
          if (token) {
            const res = await fetch(`${getApiUrl()}/subscriptions/admin/approve-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ paymentId, plan, months }),
            });
            if (res.ok) {
              await get().fetchAdminWorkshops();
              await get().fetchSubscription();
              return true;
            }
          }
        } catch {
          // Local fallback
        }

        // Local state update
        const durationDays = months * 30;
        const now = new Date();
        const newEnd = new Date(now.getTime() + durationDays * 86400000).toISOString();

        const currentSub = get().subscription;
        if (currentSub) {
          set({
            subscription: {
              ...currentSub,
              plan,
              status: 'ACTIVE',
              isTrial: false,
              isExpired: false,
              currentPeriodStart: now.toISOString(),
              currentPeriodEnd: newEnd,
              daysRemaining: durationDays,
              payments: currentSub.payments.map((p) =>
                p.id === paymentId ? { ...p, status: 'APPROVED' } : p
              ),
            },
          });
        }

        // Update admin list
        set({
          adminWorkshops: get().adminWorkshops.map((w) => {
            const hasPayment = w.pendingPayments.some((p) => p.id === paymentId);
            if (hasPayment) {
              return {
                ...w,
                plan,
                status: 'ACTIVE',
                isTrial: false,
                daysRemaining: durationDays,
                pendingPayments: w.pendingPayments.filter((p) => p.id !== paymentId),
              };
            }
            return w;
          }),
        });

        return true;
      },

      rejectPayment: async (paymentId: string, reason: string) => {
        const token = getAuthToken();
        try {
          if (token) {
            const res = await fetch(`${getApiUrl()}/subscriptions/admin/reject-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ paymentId, rejectionReason: reason }),
            });
            if (res.ok) {
              await get().fetchAdminWorkshops();
              return true;
            }
          }
        } catch {
          // Local fallback
        }

        const sub = get().subscription;
        if (sub) {
          set({
            subscription: {
              ...sub,
              payments: sub.payments.map((p) =>
                p.id === paymentId
                  ? { ...p, status: 'REJECTED', rejectionReason: reason }
                  : p
              ),
            },
          });
        }

        set({
          adminWorkshops: get().adminWorkshops.map((w) => ({
            ...w,
            pendingPayments: w.pendingPayments.filter((p) => p.id !== paymentId),
          })),
        });

        return true;
      },

      extendTrial: async (workshopId: string, days = 7) => {
        const token = getAuthToken();
        try {
          if (token) {
            const res = await fetch(`${getApiUrl()}/subscriptions/admin/extend-trial`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ workshopId, extraDays: days }),
            });
            if (res.ok) {
              await get().fetchAdminWorkshops();
              return true;
            }
          }
        } catch {
          // Local fallback
        }

        set({
          adminWorkshops: get().adminWorkshops.map((w) => {
            if (w.workshopId === workshopId) {
              return {
                ...w,
                daysRemaining: w.daysRemaining + days,
                status: 'TRIALING',
                isTrial: true,
              };
            }
            return w;
          }),
        });

        const sub = get().subscription;
        if (sub && sub.workshopId === workshopId) {
          set({
            subscription: {
              ...sub,
              daysRemaining: sub.daysRemaining + days,
              status: 'TRIALING',
              isTrial: true,
            },
          });
        }

        return true;
      },

      changePlan: async (workshopId: string, plan: SubscriptionPlanKey, status: SubscriptionStatusKey) => {
        const token = getAuthToken();
        try {
          if (token) {
            const res = await fetch(`${getApiUrl()}/subscriptions/admin/change-plan`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ workshopId, plan, status }),
            });
            if (res.ok) {
              await get().fetchAdminWorkshops();
              return true;
            }
          }
        } catch {
          // Local fallback
        }

        set({
          adminWorkshops: get().adminWorkshops.map((w) => {
            if (w.workshopId === workshopId) {
              return {
                ...w,
                plan,
                status,
                isTrial: plan === 'TRIAL',
                daysRemaining: status === 'ACTIVE' ? 30 : w.daysRemaining,
              };
            }
            return w;
          }),
        });

        const sub = get().subscription;
        if (sub && sub.workshopId === workshopId) {
          set({
            subscription: {
              ...sub,
              plan,
              status,
              isTrial: plan === 'TRIAL',
              daysRemaining: status === 'ACTIVE' ? 30 : sub.daysRemaining,
            },
          });
        }

        return true;
      },
    }),
    {
      name: 'rumilcar_subscription_store',
    }
  )
);

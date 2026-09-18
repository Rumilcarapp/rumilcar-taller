import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { JWT_SECRET } from '../../config/jwt';

export const subscriptionsRouter = Router();

// Middleware: Require SuperAdmin role
const requireSuperAdmin = (req: AuthRequest, res: Response, next: () => void): void => {
  if (req.userRole !== 'SUPERADMIN') {
    res.status(403).json({ error: 'Acceso restringido a Super Administrador' });
    return;
  }
  next();
};

// Official Payment Information & Plan Catalog
export const OFFICIAL_PAYMENT_INFO = {
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
    network: 'Binance Pay',
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

// ==========================================
// PUBLIC / WORKSHOP ENDPOINTS
// ==========================================

// GET /api/subscriptions/payment-info
subscriptionsRouter.get('/payment-info', (_req, res) => {
  res.json(OFFICIAL_PAYMENT_INFO);
});

// GET /api/subscriptions/current — Get current workshop subscription
subscriptionsRouter.get('/current', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const workshopId = req.workshopId;
    if (!workshopId) {
      res.status(400).json({ error: 'workshopId no encontrado en sesión' });
      return;
    }

    let sub = await prisma.subscription.findUnique({
      where: { workshopId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    // Auto-create 15-day trial if no record exists yet
    if (!sub) {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

      sub = await prisma.subscription.create({
        data: {
          workshopId,
          plan: 'TRIAL',
          status: 'TRIALING',
          trialStartedAt: now,
          trialEndsAt,
          billingCycle: 'MONTHLY',
          priceUSD: 0,
          maxMechanics: 3,
        },
        include: {
          payments: true,
        },
      });
    }

    // Calculate remaining days
    const now = new Date();
    let daysRemaining = 0;
    let isExpired = false;

    if (sub.status === 'ACTIVE' && sub.currentPeriodEnd) {
      const diffTime = sub.currentPeriodEnd.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) {
        isExpired = true;
      }
    } else {
      // Trialing or past due
      const diffTime = sub.trialEndsAt.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) {
        isExpired = true;
      }
    }

    res.json({
      ...sub,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired,
      isTrial: sub.plan === 'TRIAL' || sub.status === 'TRIALING',
      paymentInfo: OFFICIAL_PAYMENT_INFO,
    });
  } catch (error: any) {
    console.error('Error in /subscriptions/current:', error);
    res.status(500).json({ error: 'Error al consultar suscripción' });
  }
});

// POST /api/subscriptions/report-payment — Workshop reports a paid membership
subscriptionsRouter.post('/report-payment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const workshopId = req.workshopId;
    if (!workshopId) {
      res.status(400).json({ error: 'workshopId no válido' });
      return;
    }

    const {
      amountUSD,
      amountVES,
      paymentMethod,
      referenceNumber,
      notes,
      plan = 'PRO',
      billingCycle = 'MONTHLY',
    } = req.body;

    if (!paymentMethod || !referenceNumber || !amountUSD) {
      res.status(400).json({ error: 'Faltan campos obligatorios (método, referencia, monto)' });
      return;
    }

    // Ensure subscription exists
    let sub = await prisma.subscription.findUnique({
      where: { workshopId },
    });

    if (!sub) {
      const now = new Date();
      sub = await prisma.subscription.create({
        data: {
          workshopId,
          plan: 'TRIAL',
          status: 'TRIALING',
          trialStartedAt: now,
          trialEndsAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Create payment record
    const payment = await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: sub.id,
        workshopId,
        amountUSD: Number(amountUSD),
        amountVES: amountVES ? Number(amountVES) : null,
        paymentMethod,
        referenceNumber: String(referenceNumber).trim(),
        status: 'PENDING',
        notes: notes || `Membresía plan ${plan} (${billingCycle})`,
      },
    });

    res.status(201).json({
      message: 'Comprobante recibido con éxito. Será verificado por el equipo de Rumilcarapp en breve.',
      payment,
    });
  } catch (error: any) {
    console.error('Error reporting payment:', error);
    res.status(500).json({ error: 'Error al procesar el reporte de pago' });
  }
});

// ==========================================
// SUPERADMIN ENDPOINTS (Plataforma Rumilcarapp)
// ==========================================

// GET /api/subscriptions/admin/workshops — List all workshops with subscription details
subscriptionsRouter.get('/admin/workshops', authenticate, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const workshops = await prisma.workshop.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
        subscription: {
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        _count: {
          select: {
            workOrders: true,
            clients: true,
            mechanics: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    // Map and compute metrics
    const list = workshops.map((w) => {
      const sub = w.subscription;
      let daysRemaining = 0;
      let status = sub?.status || 'TRIALING';
      const plan = sub?.plan || 'TRIAL';

      if (sub?.currentPeriodEnd && status === 'ACTIVE') {
        daysRemaining = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else if (sub?.trialEndsAt) {
        daysRemaining = Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      const pendingPayments = sub?.payments.filter((p) => p.status === 'PENDING') || [];

      return {
        workshopId: w.id,
        workshopName: w.name,
        email: w.email || w.users[0]?.email,
        phone: w.phone || '',
        ownerName: w.users.find((u) => u.role === 'OWNER')?.name || w.users[0]?.name || 'Dueño',
        createdAt: w.createdAt,
        plan,
        status,
        daysRemaining: Math.max(0, daysRemaining),
        isTrial: plan === 'TRIAL' || status === 'TRIALING',
        stats: {
          orders: w._count.workOrders,
          clients: w._count.clients,
          mechanics: w._count.mechanics,
        },
        subscription: sub,
        pendingPayments,
      };
    });

    // Calculate Platform SaaS KPIs
    const totalWorkshops = list.length;
    const activePaid = list.filter((w) => w.status === 'ACTIVE').length;
    const trialing = list.filter((w) => w.isTrial).length;
    const expiringSoon = list.filter((w) => w.daysRemaining <= 3 && w.daysRemaining >= 0).length;
    const pendingReview = list.reduce((acc, w) => acc + w.pendingPayments.length, 0);

    const mrrUSD = list.reduce((acc, w) => {
      if (w.status === 'ACTIVE') {
        if (w.plan === 'BASIC') return acc + 19;
        if (w.plan === 'PRO') return acc + 39;
        if (w.plan === 'ELITE') return acc + 79;
      }
      return acc;
    }, 0);

    res.json({
      kpis: {
        totalWorkshops,
        activePaid,
        trialing,
        expiringSoon,
        pendingReview,
        mrrUSD,
      },
      workshops: list,
    });
  } catch (error: any) {
    console.error('Error fetching admin workshops:', error);
    res.status(500).json({ error: 'Error al consultar listado de talleres' });
  }
});

// POST /api/subscriptions/admin/approve-payment — SuperAdmin approves payment and extends period
subscriptionsRouter.post('/admin/approve-payment', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId, plan = 'PRO', months = 1 } = req.body;

    if (!paymentId) {
      res.status(400).json({ error: 'paymentId es requerido' });
      return;
    }

    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });

    if (!payment) {
      res.status(404).json({ error: 'Pago no encontrado' });
      return;
    }

    const now = new Date();
    // If subscription already active and in future, extend from currentPeriodEnd
    let startDate = now;
    if (payment.subscription.currentPeriodEnd && payment.subscription.currentPeriodEnd > now) {
      startDate = payment.subscription.currentPeriodEnd;
    }

    const durationDays = Number(months) * 30;
    const newEnd = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Update payment and subscription in transaction
    await prisma.$transaction([
      prisma.subscriptionPayment.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          reviewedBy: req.userId || 'SuperAdmin',
          reviewedAt: now,
        },
      }),
      prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          plan,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: newEnd,
          priceUSD: payment.amountUSD,
        },
      }),
    ]);

    res.json({
      message: `Pago aprobado con éxito. Membresía extendida por ${durationDays} días.`,
      newEnd,
      plan,
    });
  } catch (error: any) {
    console.error('Error approving payment:', error);
    res.status(500).json({ error: 'Error al aprobar el pago' });
  }
});

// POST /api/subscriptions/admin/reject-payment — SuperAdmin rejects payment
subscriptionsRouter.post('/admin/reject-payment', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId, rejectionReason } = req.body;

    if (!paymentId) {
      res.status(400).json({ error: 'paymentId es requerido' });
      return;
    }

    await prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason || 'Referencia bancaria no encontrada o monto no coincide',
        reviewedBy: req.userId || 'SuperAdmin',
        reviewedAt: new Date(),
      },
    });

    res.json({ message: 'Pago rechazado correctamente' });
  } catch (error: any) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ error: 'Error al rechazar el pago' });
  }
});

// POST /api/subscriptions/admin/extend-trial — SuperAdmin grants courtesy days
subscriptionsRouter.post('/admin/extend-trial', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workshopId, extraDays = 7 } = req.body;

    const sub = await prisma.subscription.findUnique({
      where: { workshopId },
    });

    if (!sub) {
      res.status(404).json({ error: 'Suscripción no encontrada' });
      return;
    }

    const now = new Date();
    const baseDate = sub.trialEndsAt > now ? sub.trialEndsAt : now;
    const newTrialEnds = new Date(baseDate.getTime() + Number(extraDays) * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscription.update({
      where: { workshopId },
      data: {
        trialEndsAt: newTrialEnds,
        status: 'TRIALING',
      },
    });

    res.json({
      message: `Se han añadido ${extraDays} días de cortesía al taller.`,
      trialEndsAt: updated.trialEndsAt,
    });
  } catch (error: any) {
    console.error('Error extending trial:', error);
    res.status(500).json({ error: 'Error al otorgar días de cortesía' });
  }
});

// POST /api/subscriptions/admin/change-plan — SuperAdmin changes plan manually
subscriptionsRouter.post('/admin/change-plan', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workshopId, plan, status, durationDays = 30 } = req.body;

    const now = new Date();
    const newEnd = new Date(now.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscription.update({
      where: { workshopId },
      data: {
        plan,
        status,
        currentPeriodStart: now,
        currentPeriodEnd: newEnd,
      },
    });

    res.json({
      message: `Plan actualizado a ${plan} (${status}) hasta el ${newEnd.toLocaleDateString('es-VE')}`,
      subscription: updated,
    });
  } catch (error: any) {
    console.error('Error changing plan:', error);
    res.status(500).json({ error: 'Error al modificar plan de taller' });
  }
});

// GET /api/subscriptions/admin/analytics — Comprehensive SaaS Platform Intelligence & Metrics for SuperAdmin
subscriptionsRouter.get('/admin/analytics', authenticate, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [
      workshops,
      totalOrders,
      totalClients,
      totalVehicles,
      totalUsers,
      allPayments,
    ] = await Promise.all([
      prisma.workshop.findMany({
        include: {
          users: { select: { id: true, name: true, email: true, role: true } },
          subscription: {
            include: {
              payments: true,
            },
          },
          _count: {
            select: {
              workOrders: true,
              clients: true,
              mechanics: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.workOrder.count(),
      prisma.client.count(),
      prisma.vehicle.count(),
      prisma.user.count(),
      prisma.subscriptionPayment.findMany({
        include: { workshop: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const now = new Date();

    const totalWorkshops = workshops.length;
    let activePaidWorkshops = 0;
    let trialingWorkshops = 0;
    let expiringSoonWorkshops = 0;
    let suspendedWorkshops = 0;
    let mrrUSD = 0;

    const planCounts: Record<string, number> = {
      TRIAL: 0,
      BASIC: 0,
      PRO: 0,
      ELITE: 0,
    };

    workshops.forEach((w) => {
      const sub = w.subscription;
      const plan = sub?.plan || 'TRIAL';
      const status = sub?.status || 'TRIALING';

      if (planCounts[plan] !== undefined) {
        planCounts[plan]++;
      } else {
        planCounts[plan] = 1;
      }

      let daysRemaining = 0;
      if (sub?.currentPeriodEnd && status === 'ACTIVE') {
        daysRemaining = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else if (sub?.trialEndsAt) {
        daysRemaining = Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (status === 'ACTIVE') {
        activePaidWorkshops++;
        if (plan === 'BASIC') mrrUSD += 19;
        else if (plan === 'PRO') mrrUSD += 39;
        else if (plan === 'ELITE') mrrUSD += 79;
        else mrrUSD += (sub?.priceUSD || 0);
      } else if (status === 'TRIALING' || plan === 'TRIAL') {
        trialingWorkshops++;
      } else if (status === 'SUSPENDED' || status === 'PAST_DUE') {
        suspendedWorkshops++;
      }

      if (daysRemaining <= 3 && daysRemaining >= 0) {
        expiringSoonWorkshops++;
      }
    });

    const arrUSD = mrrUSD * 12;
    const conversionRate = totalWorkshops > 0 ? (activePaidWorkshops / totalWorkshops) * 100 : 0;

    // Payments calculations
    const approvedPayments = allPayments.filter((p) => p.status === 'APPROVED');
    const totalRevenueUSD = approvedPayments.reduce((acc, p) => acc + (p.amountUSD || 0), 0);
    const totalRevenueVES = approvedPayments.reduce((acc, p) => acc + (p.amountVES || 0), 0);

    // Payment methods breakdown
    const methodsMap: Record<string, { count: number; totalUSD: number; totalVES: number; label: string }> = {
      PAGO_MOVIL: { count: 0, totalUSD: 0, totalVES: 0, label: 'Pago Móvil (Mercantil)' },
      USDT_BINANCE: { count: 0, totalUSD: 0, totalVES: 0, label: 'Binance Pay (USDT)' },
      ZINLI: { count: 0, totalUSD: 0, totalVES: 0, label: 'Zinli Wallet (USD)' },
    };

    approvedPayments.forEach((p) => {
      const m = p.paymentMethod || 'PAGO_MOVIL';
      if (!methodsMap[m]) {
        methodsMap[m] = { count: 0, totalUSD: 0, totalVES: 0, label: m };
      }
      methodsMap[m].count++;
      methodsMap[m].totalUSD += p.amountUSD || 0;
      methodsMap[m].totalVES += p.amountVES || 0;
    });

    const paymentMethodsBreakdown = Object.keys(methodsMap).map((key) => ({
      method: key,
      label: methodsMap[key].label,
      count: methodsMap[key].count,
      totalUSD: methodsMap[key].totalUSD,
      totalVES: methodsMap[key].totalVES,
    }));

    // Plan distribution
    const planDistribution = [
      { plan: 'TRIAL', name: 'Prueba Gratuita (15d)', count: planCounts['TRIAL'] || 0, priceUSD: 0, mrrUSD: 0, color: '#64748b' },
      { plan: 'BASIC', name: 'Taller Emprendedor', count: planCounts['BASIC'] || 0, priceUSD: 19, mrrUSD: (planCounts['BASIC'] || 0) * 19, color: '#3b82f6' },
      { plan: 'PRO', name: 'Taller Profesional', count: planCounts['PRO'] || 0, priceUSD: 39, mrrUSD: (planCounts['PRO'] || 0) * 39, color: '#e11d48' },
      { plan: 'ELITE', name: 'Taller Élite / Multisede', count: planCounts['ELITE'] || 0, priceUSD: 79, mrrUSD: (planCounts['ELITE'] || 0) * 79, color: '#8b5cf6' },
    ];

    // Monthly revenue trend (last 6 months)
    const monthlyRevenueTrend: { month: string; revenueUSD: number; paidWorkshops: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const inMonth = approvedPayments.filter((p) => {
        const pDate = new Date(p.createdAt);
        return pDate >= d && pDate < nextMonth;
      });

      const rev = inMonth.reduce((acc, p) => acc + (p.amountUSD || 0), 0);
      monthlyRevenueTrend.push({
        month: monthLabel,
        revenueUSD: rev,
        paidWorkshops: inMonth.length,
      });
    }

    // Top workshops by activity
    const topWorkshops = workshops
      .map((w) => {
        const owner = w.users.find((u) => u.role === 'OWNER') || w.users[0];
        let daysRemaining = 0;
        const sub = w.subscription;
        if (sub?.currentPeriodEnd && sub.status === 'ACTIVE') {
          daysRemaining = Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        } else if (sub?.trialEndsAt) {
          daysRemaining = Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        return {
          workshopId: w.id,
          workshopName: w.name,
          ownerName: owner?.name || 'Dueño',
          phone: w.phone || '',
          email: w.email || owner?.email || '',
          plan: (w.subscription?.plan || 'TRIAL'),
          status: (w.subscription?.status || 'TRIALING'),
          daysRemaining,
          ordersCount: w._count.workOrders,
          clientsCount: w._count.clients,
          mechanicsCount: w._count.mechanics,
          createdAt: w.createdAt.toISOString(),
        };
      })
      .sort((a, b) => b.ordersCount - a.ordersCount)
      .slice(0, 15);

    // Recent payments ledger
    const recentPayments = allPayments.slice(0, 20).map((p) => ({
      id: p.id,
      workshopName: p.workshop?.name || 'Taller',
      amountUSD: p.amountUSD,
      amountVES: p.amountVES,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }));

    res.json({
      summary: {
        mrrUSD,
        arrUSD,
        totalRevenueUSD,
        totalRevenueVES,
        totalWorkshops,
        activePaidWorkshops,
        trialingWorkshops,
        expiringSoonWorkshops,
        suspendedWorkshops,
        conversionRate: Math.round(conversionRate * 10) / 10,
        totalPlatformOrders: totalOrders,
        totalPlatformClients: totalClients,
        totalPlatformVehicles: totalVehicles,
        totalPlatformUsers: totalUsers,
      },
      planDistribution,
      paymentMethodsBreakdown,
      monthlyRevenueTrend,
      topWorkshops,
      recentPayments,
    });
  } catch (error: any) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ error: 'Error al calcular métricas analíticas del SaaS' });
  }
});

// POST /api/subscriptions/admin/create-workshop — SuperAdmin creates a new client workshop
subscriptionsRouter.post('/admin/create-workshop', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workshopName, ownerName, email, password, phone, address, plan = 'TRIAL', durationDays = 15 } = req.body;

    if (!workshopName || !ownerName || !email || !password) {
      res.status(400).json({ error: 'Faltan campos requeridos (nombre taller, nombre dueño, correo, contraseña)' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    const endsAt = new Date(now.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);

    const isTrial = plan === 'TRIAL';
    const status = isTrial ? 'TRIALING' : 'ACTIVE';

    const result = await prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.create({
        data: {
          name: workshopName,
          phone: phone || null,
          email: email,
          address: address || null,
          paymentMethods: {
            createMany: {
              data: [
                { method: 'CASH_USD', isEnabled: true },
                { method: 'CASH_VES', isEnabled: true },
                { method: 'PAGO_MOVIL', isEnabled: true },
                { method: 'BANK_TRANSFER', isEnabled: true },
                { method: 'ZELLE', isEnabled: true },
                { method: 'USDT_WALLET', isEnabled: true },
                { method: 'POS_DEBIT', isEnabled: false },
              ],
            },
          },
        },
      });

      const user = await tx.user.create({
        data: {
          workshopId: workshop.id,
          name: ownerName,
          email,
          passwordHash,
          role: 'OWNER',
          isActive: true,
        },
      });

      const maxMechanics = plan === 'ELITE' ? 999 : plan === 'PRO' ? 6 : 3;

      const subscription = await tx.subscription.create({
        data: {
          workshopId: workshop.id,
          plan,
          status,
          trialStartedAt: now,
          trialEndsAt: endsAt,
          currentPeriodStart: !isTrial ? now : null,
          currentPeriodEnd: !isTrial ? endsAt : null,
          billingCycle: 'MONTHLY',
          priceUSD: plan === 'BASIC' ? 19 : plan === 'PRO' ? 39 : plan === 'ELITE' ? 79 : 0,
          maxMechanics,
        },
      });

      return { workshop, user, subscription };
    });

    res.status(201).json({
      message: `Taller ${result.workshop.name} registrado exitosamente con plan ${plan}`,
      workshopId: result.workshop.id,
      workshopName: result.workshop.name,
      ownerEmail: result.user.email,
    });
  } catch (error: any) {
    console.error('Error creating workshop by SuperAdmin:', error);
    res.status(500).json({ error: 'Error al registrar taller cliente' });
  }
});

// POST /api/subscriptions/admin/reset-password — SuperAdmin resets password for workshop owner
subscriptionsRouter.post('/admin/reset-password', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workshopId, newPassword } = req.body;

    if (!workshopId || !newPassword) {
      res.status(400).json({ error: 'workshopId y newPassword son requeridos' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const owner = await prisma.user.findFirst({
      where: { workshopId, role: 'OWNER' },
    });

    if (!owner) {
      res.status(404).json({ error: 'No se encontró la cuenta del titular para este taller' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: owner.id },
      data: { passwordHash },
    });

    res.json({
      message: `Contraseña restablecida con éxito para ${owner.name} (${owner.email})`,
      ownerEmail: owner.email,
    });
  } catch (error: any) {
    console.error('Error resetting password by SuperAdmin:', error);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

// POST /api/subscriptions/admin/toggle-status — SuperAdmin activates or suspends workshop
subscriptionsRouter.post('/admin/toggle-status', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workshopId, suspend } = req.body;

    if (!workshopId) {
      res.status(400).json({ error: 'workshopId es requerido' });
      return;
    }

    const newStatus = suspend ? 'SUSPENDED' : 'ACTIVE';
    const usersActive = !suspend;

    await prisma.$transaction([
      prisma.subscription.update({
        where: { workshopId },
        data: { status: newStatus },
      }),
      prisma.user.updateMany({
        where: { workshopId },
        data: { isActive: usersActive },
      }),
    ]);

    res.json({
      message: suspend
        ? 'El taller ha sido suspendido y se ha pausado el acceso a sus usuarios'
        : 'El taller ha sido reactivado y se ha habilitado el acceso al software',
      status: newStatus,
    });
  } catch (error: any) {
    console.error('Error toggling workshop status by SuperAdmin:', error);
    res.status(500).json({ error: 'Error al cambiar estado del taller' });
  }
});

// PUT /api/subscriptions/admin/update-workshop — SuperAdmin edits workshop and owner information
subscriptionsRouter.put('/admin/update-workshop', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workshopId, workshopName, ownerName, phone, email, address } = req.body;

    if (!workshopId || !workshopName) {
      res.status(400).json({ error: 'workshopId y workshopName son requeridos' });
      return;
    }

    await prisma.workshop.update({
      where: { id: workshopId },
      data: {
        name: workshopName,
        phone: phone || null,
        email: email || null,
        address: address || null,
      },
    });

    if (ownerName || email) {
      const owner = await prisma.user.findFirst({
        where: { workshopId, role: 'OWNER' },
      });
      if (owner) {
        await prisma.user.update({
          where: { id: owner.id },
          data: {
            name: ownerName || owner.name,
            email: email || owner.email,
          },
        });
      }
    }

    res.json({ message: 'Datos del taller actualizados correctamente' });
  } catch (error: any) {
    console.error('Error updating workshop details by SuperAdmin:', error);
    res.status(500).json({ error: 'Error al actualizar datos del taller' });
  }
});

// GET /api/subscriptions/admin/workshops — List all client workshops for SuperAdmin
subscriptionsRouter.get('/admin/workshops', authenticate, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const workshops = await prisma.workshop.findMany({
      include: {
        users: true,
        subscription: {
          include: { payments: true },
        },
        _count: {
          select: { workOrders: true, clients: true, mechanics: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const formatted = workshops.map((w) => {
      const owner = w.users.find((u) => u.role === 'OWNER') || w.users[0];
      const sub = w.subscription;
      let daysRemaining = 0;
      if (sub?.currentPeriodEnd && sub.status === 'ACTIVE') {
        daysRemaining = Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (sub?.trialEndsAt) {
        daysRemaining = Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      return {
        workshopId: w.id,
        workshopName: w.name,
        ownerName: owner?.name || 'Dueño',
        phone: w.phone || '',
        email: w.email || owner?.email || '',
        plan: sub?.plan || 'TRIAL',
        status: sub?.status || 'TRIALING',
        isTrial: sub?.plan === 'TRIAL' || sub?.status === 'TRIALING',
        daysRemaining,
        subscriptionEnd: sub?.currentPeriodEnd || sub?.trialEndsAt,
        stats: {
          orders: w._count.workOrders,
          clients: w._count.clients,
          mechanics: w._count.mechanics,
        },
        payments: sub?.payments || [],
        createdAt: w.createdAt,
      };
    });

    res.json({ success: true, workshops: formatted, data: formatted });
  } catch (error: any) {
    console.error('Error fetching admin workshops:', error);
    res.status(500).json({ error: 'Error al listar talleres' });
  }
});

// =========================================================================
// 🎯 OBJETIVO 1: MODO "VER COMO TALLER" (IMPERSONATION / LOGIN AS)
// =========================================================================

// POST /api/subscriptions/admin/impersonate
subscriptionsRouter.post('/admin/impersonate', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { workshopId } = req.body;
    if (!workshopId) {
      res.status(400).json({ error: 'workshopId es requerido' });
      return;
    }

    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        users: { where: { role: 'OWNER' } },
        subscription: true,
      },
    });

    if (!workshop) {
      res.status(404).json({ error: 'Taller no encontrado' });
      return;
    }

    const targetUser = workshop.users[0] || (await prisma.user.findFirst({ where: { workshopId } }));
    if (!targetUser) {
      res.status(404).json({ error: 'No se encontró un usuario titular para este taller' });
      return;
    }

    const token = jwt.sign(
      {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        workshopId: workshop.id,
        isImpersonated: true,
        impersonatedBy: req.userId || 'SuperAdmin',
      },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Registrar en auditoría de seguridad
    await prisma.auditLog.create({
      data: {
        workshopId: workshop.id,
        userId: req.userId || null,
        action: 'SUPERADMIN_IMPERSONATION',
        entity: 'WORKSHOP',
        entityId: workshop.id,
        ipAddress: req.ip || (req.socket ? req.socket.remoteAddress : null),
        details: `SuperAdmin (${req.userEmail || req.userId}) inició sesión de suplantación en taller ${workshop.name} (${workshop.id})`,
      },
    });

    res.json({
      message: `Sesión iniciada como ${workshop.name}`,
      token,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        workshopId: workshop.id,
        workshopName: workshop.name,
        isImpersonated: true,
      },
      workshop: {
        id: workshop.id,
        name: workshop.name,
        phone: workshop.phone,
        email: workshop.email,
        plan: workshop.subscription?.plan || 'TRIAL',
      },
    });
  } catch (error: any) {
    console.error('Error in impersonation:', error);
    res.status(500).json({ error: 'Error al generar sesión de suplantación' });
  }
});

// =========================================================================
// 🎯 OBJETIVO 2: COMUNICADOS Y AVISOS GLOBALES (BROADCAST BANNERS)
// =========================================================================

// GET /api/subscriptions/announcements — Active announcements for workshops
subscriptionsRouter.get('/announcements', async (_req, res) => {
  try {
    const announcements = await prisma.saaSAnnouncement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar comunicados' });
  }
});

// GET /api/subscriptions/admin/announcements — SuperAdmin lists all
subscriptionsRouter.get('/admin/announcements', authenticate, requireSuperAdmin, async (_req, res) => {
  try {
    const list = await prisma.saaSAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar comunicados' });
  }
});

// POST /api/subscriptions/admin/announcements — SuperAdmin creates/updates announcement
subscriptionsRouter.post('/admin/announcements', authenticate, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const { id, title, message, type = 'INFO', targetPlan = 'ALL', isActive = true } = req.body;
    if (!title || !message) {
      res.status(400).json({ error: 'Título y mensaje son obligatorios' });
      return;
    }

    let announcement;
    if (id) {
      announcement = await prisma.saaSAnnouncement.update({
        where: { id },
        data: { title, message, type, targetPlan, isActive },
      });
    } else {
      announcement = await prisma.saaSAnnouncement.create({
        data: {
          title,
          message,
          type,
          targetPlan,
          isActive,
          createdBy: req.userId || 'SuperAdmin',
        },
      });
    }

    res.json({ message: 'Comunicado guardado exitosamente', announcement });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar comunicado' });
  }
});

// DELETE /api/subscriptions/admin/announcements/:id
subscriptionsRouter.delete('/admin/announcements/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    await prisma.saaSAnnouncement.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Comunicado eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar comunicado' });
  }
});

// =========================================================================
// 🎯 OBJETIVO 3: EDITOR DE PRECIOS, PLANES Y CUENTAS BANCARIAS
// =========================================================================

// GET /api/subscriptions/admin/config
subscriptionsRouter.get('/admin/config', authenticate, requireSuperAdmin, (_req, res) => {
  res.json(OFFICIAL_PAYMENT_INFO);
});

// PUT /api/subscriptions/admin/config
subscriptionsRouter.put('/admin/config', authenticate, requireSuperAdmin, (req, res) => {
  const { pagoMovil, zinli, usdtBinance, plans } = req.body;
  if (pagoMovil) OFFICIAL_PAYMENT_INFO.pagoMovil = { ...OFFICIAL_PAYMENT_INFO.pagoMovil, ...pagoMovil };
  if (zinli) OFFICIAL_PAYMENT_INFO.zinli = { ...OFFICIAL_PAYMENT_INFO.zinli, ...zinli };
  if (usdtBinance) OFFICIAL_PAYMENT_INFO.usdtBinance = { ...OFFICIAL_PAYMENT_INFO.usdtBinance, ...usdtBinance };
  if (plans && Array.isArray(plans)) OFFICIAL_PAYMENT_INFO.plans = plans;

  res.json({ message: 'Configuración oficial actualizada correctamente', paymentInfo: OFFICIAL_PAYMENT_INFO });
});

// =========================================================================
// 🎯 OBJETIVO 5: CENTRO DE TICKETS DE SOPORTE (HELPDESK)
// =========================================================================

// POST /api/subscriptions/support/tickets — Workshop creates ticket
subscriptionsRouter.post('/support/tickets', authenticate, async (req: AuthRequest, res) => {
  try {
    const { subject, description, priority = 'MEDIUM', contactName, contactPhone, contactEmail } = req.body;
    const workshopId = req.workshopId;
    const textDesc = description || req.body.message || '';

    if (!workshopId || !subject || !textDesc) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        workshopId,
        subject,
        description: textDesc,
        priority,
        contactName: contactName || req.userName || 'Usuario',
        contactPhone: contactPhone || req.body.userPhone || null,
        contactEmail: contactEmail || req.userEmail || null,
        status: 'OPEN',
      },
      include: {
        workshop: { select: { id: true, name: true, phone: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Ticket de soporte creado con éxito. Luark Padilla responderá a la brevedad.',
      ticket,
      data: ticket,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar ticket de soporte' });
  }
});

// GET /api/subscriptions/admin/support/tickets — SuperAdmin lists tickets
subscriptionsRouter.get('/admin/support/tickets', authenticate, requireSuperAdmin, async (_req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: {
        workshop: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const formatted = tickets.map((t) => ({
      ...t,
      message: t.description,
      adminNotes: t.resolutionNotes,
      userName: t.contactName || 'Usuario Taller',
      userEmail: t.contactEmail || '',
      userPhone: t.contactPhone || t.workshop?.phone || '',
    }));
    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar tickets de soporte' });
  }
});

// PUT /api/subscriptions/admin/support/tickets/:id — SuperAdmin updates ticket status
subscriptionsRouter.put('/admin/support/tickets/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { status, resolutionNotes, adminNotes } = req.body;
    const notes = resolutionNotes || adminNotes;
    const ticket = await prisma.supportTicket.update({
      where: { id: String(req.params.id) },
      data: {
        ...(status && { status }),
        ...(notes && { resolutionNotes: notes }),
      },
      include: {
        workshop: { select: { id: true, name: true, phone: true } },
      },
    });
    res.json({
      success: true,
      message: 'Ticket actualizado correctamente',
      data: {
        ...ticket,
        message: ticket.description,
        adminNotes: ticket.resolutionNotes,
        userName: ticket.contactName || 'Usuario Taller',
        userEmail: ticket.contactEmail || '',
        userPhone: ticket.contactPhone || ticket.workshop?.phone || '',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar ticket' });
  }
});

// =========================================================================
// 🎯 OBJETIVO 6: MONITOR DE SALUD & COPIAS DE SEGURIDAD (BACKUPS)
// =========================================================================

// GET /api/subscriptions/admin/backup — SuperAdmin downloads consolidated JSON database backup
subscriptionsRouter.get('/admin/backup', authenticate, requireSuperAdmin, async (_req, res) => {
  try {
    const [workshops, users, workOrders, clients, vehicles, inventoryItems, subscriptions, payments] = await Promise.all([
      prisma.workshop.findMany(),
      prisma.user.findMany({ select: { id: true, workshopId: true, name: true, email: true, role: true, isActive: true, createdAt: true } }),
      prisma.workOrder.findMany(),
      prisma.client.findMany(),
      prisma.vehicle.findMany(),
      prisma.inventoryItem.findMany(),
      prisma.subscription.findMany(),
      prisma.subscriptionPayment.findMany(),
    ]);

    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: 'SuperAdmin',
      metadata: {
        totalWorkshops: workshops.length,
        totalUsers: users.length,
        totalOrders: workOrders.length,
        totalClients: clients.length,
        totalVehicles: vehicles.length,
        totalInventory: inventoryItems.length,
      },
      data: {
        workshops,
        users,
        workOrders,
        clients,
        vehicles,
        inventoryItems,
        subscriptions,
        payments,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=rumilcarapp_backup_${new Date().toISOString().slice(0, 10)}.json`);
    res.json(backupData);
  } catch (error) {
    console.error('Error generating backup:', error);
    res.status(500).json({ error: 'Error al generar copia de seguridad' });
  }
});

// GET /api/subscriptions/admin/health — SuperAdmin database latency & system metrics
subscriptionsRouter.get('/admin/health', authenticate, requireSuperAdmin, async (_req, res) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - start;

    const memoryUsage = process.memoryUsage();

    res.json({
      status: 'HEALTHY',
      serverUptimeSeconds: Math.round(process.uptime()),
      dbLatencyMs,
      timestamp: new Date().toISOString(),
      memory: {
        rssMB: Math.round(memoryUsage.rss / (1024 * 1024)),
        heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
      },
      environment: process.env.NODE_ENV || 'production',
      database: 'Supabase PostgreSQL (Active)',
    });
  } catch (error: any) {
    res.status(500).json({ status: 'DEGRADED', error: error?.message || 'Error de conexión a base de datos' });
  }
});




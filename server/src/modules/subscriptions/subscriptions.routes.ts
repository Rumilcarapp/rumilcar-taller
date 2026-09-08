import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';

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
    bank: 'Banesco / Mercantil / Venezuela',
    holder: 'Luark Padilla',
    idNumber: 'V-20.123.456',
  },
  zinli: {
    email: 'luarkpadilla@gmail.com',
    holder: 'Luark Padilla',
  },
  usdtBinance: {
    emailOrPayId: 'luarkpadilla@gmail.com',
    network: 'Binance Pay / USDT (TRC20 / BEP20)',
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

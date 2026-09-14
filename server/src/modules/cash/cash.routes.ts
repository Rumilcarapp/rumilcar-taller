import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireWorkshop, requireRole, AuthRequest } from '../../middleware/auth';
import { z } from 'zod';

export const cashRouter = Router();
cashRouter.use(authenticate);
cashRouter.use(requireWorkshop);

// Zod schemas
const openSessionSchema = z.object({
  initialUSD: z.number().min(0).default(0),
  initialVES: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const closeSessionSchema = z.object({
  actualUSD: z.number().min(0),
  actualVES: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const cashMovementSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().trim().min(2),
  description: z.string().trim().min(3),
  amountUSD: z.number().positive(),
  amountVES: z.number().min(0).default(0),
  exchangeRate: z.number().min(0).default(0),
  paymentMethod: z.string().trim().min(2),
  reference: z.string().trim().optional().nullable(),
  workOrderId: z.string().uuid().optional().nullable(),
});

// GET /api/cash/session/current — Get current active session
cashRouter.get('/session/current', async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: {
        workshopId: req.workshopId!,
        status: 'OPEN',
      },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) {
      res.json({ session: null, isOpened: false });
      return;
    }

    // Calculate live balances
    let totalIncomeUSD = 0;
    let totalExpenseUSD = 0;
    let totalIncomeVES = 0;
    let totalExpenseVES = 0;

    session.movements.forEach((m) => {
      if (m.type === 'INCOME') {
        totalIncomeUSD += m.amountUSD;
        totalIncomeVES += m.amountVES;
      } else {
        totalExpenseUSD += m.amountUSD;
        totalExpenseVES += m.amountVES;
      }
    });

    const expectedUSD = session.initialUSD + totalIncomeUSD - totalExpenseUSD;
    const expectedVES = session.initialVES + totalIncomeVES - totalExpenseVES;

    res.json({
      isOpened: true,
      session: {
        ...session,
        expectedUSD,
        expectedVES,
        totalIncomeUSD,
        totalExpenseUSD,
        totalIncomeVES,
        totalExpenseVES,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar la sesión de caja actual' });
  }
});

// POST /api/cash/session/open — Open cash box
cashRouter.post('/session/open', requireRole('OWNER', 'ADMIN', 'CASHIER'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = openSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Datos de apertura inválidos', details: parseResult.error.format() });
      return;
    }

    // Check if there is already an open session
    const existing = await prisma.cashSession.findFirst({
      where: { workshopId: req.workshopId!, status: 'OPEN' },
    });
    if (existing) {
      res.status(400).json({ error: 'Ya existe una sesión de caja abierta para este taller. Ciérrela primero.' });
      return;
    }

    const { initialUSD, initialVES, notes } = parseResult.data;
    const session = await prisma.cashSession.create({
      data: {
        workshopId: req.workshopId!,
        openedById: req.userId!,
        openedByName: req.userName || 'Usuario',
        initialUSD,
        initialVES,
        expectedUSD: initialUSD,
        expectedVES: initialVES,
        status: 'OPEN',
        notes: notes || null,
      },
    });

    res.status(201).json({ message: 'Caja abierta con éxito', session });
  } catch (error) {
    res.status(500).json({ error: 'Error al abrir la caja' });
  }
});

// POST /api/cash/session/close — Close cash box
cashRouter.post('/session/close', requireRole('OWNER', 'ADMIN', 'CASHIER'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = closeSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Datos de cierre inválidos', details: parseResult.error.format() });
      return;
    }

    const session = await prisma.cashSession.findFirst({
      where: { workshopId: req.workshopId!, status: 'OPEN' },
      include: { movements: true },
    });

    if (!session) {
      res.status(400).json({ error: 'No hay ninguna sesión de caja abierta para cerrar' });
      return;
    }

    const { actualUSD, actualVES, notes } = parseResult.data;

    let totalIncomeUSD = 0;
    let totalExpenseUSD = 0;
    let totalIncomeVES = 0;
    let totalExpenseVES = 0;

    session.movements.forEach((m) => {
      if (m.type === 'INCOME') {
        totalIncomeUSD += m.amountUSD;
        totalIncomeVES += m.amountVES;
      } else {
        totalExpenseUSD += m.amountUSD;
        totalExpenseVES += m.amountVES;
      }
    });

    const expectedUSD = session.initialUSD + totalIncomeUSD - totalExpenseUSD;
    const expectedVES = session.initialVES + totalIncomeVES - totalExpenseVES;
    const differenceUSD = actualUSD - expectedUSD;
    const differenceVES = actualVES - expectedVES;

    const closed = await prisma.cashSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        closedById: req.userId,
        closedByName: req.userName || 'Usuario',
        closedAt: new Date(),
        expectedUSD,
        expectedVES,
        actualUSD,
        actualVES,
        differenceUSD,
        differenceVES,
        notes: notes || session.notes,
      },
    });

    res.json({
      message: 'Caja cerrada y auditada exitosamente',
      session: closed,
      audit: {
        expectedUSD,
        expectedVES,
        actualUSD,
        actualVES,
        differenceUSD,
        differenceVES,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cerrar la sesión de caja' });
  }
});

// GET /api/cash/movements — List movements for workshop
cashRouter.get('/movements', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, type, limit = '50' } = req.query;

    const movements = await prisma.cashMovement.findMany({
      where: {
        workshopId: req.workshopId!,
        ...(sessionId && { sessionId: String(sessionId) }),
        ...(type && { type: String(type) }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(String(limit), 10) || 50, 100),
      include: {
        workOrder: { select: { id: true, orderNumber: true } },
      },
    });

    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener movimientos de caja' });
  }
});

// POST /api/cash/movement — Record manual movement
cashRouter.post('/movement', requireRole('OWNER', 'ADMIN', 'CASHIER'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = cashMovementSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Datos de movimiento inválidos', details: parseResult.error.format() });
      return;
    }

    const data = parseResult.data;

    // Link to open session if one exists
    const activeSession = await prisma.cashSession.findFirst({
      where: { workshopId: req.workshopId!, status: 'OPEN' },
    });

    const movement = await prisma.cashMovement.create({
      data: {
        workshopId: req.workshopId!,
        sessionId: activeSession?.id || null,
        type: data.type,
        category: data.category,
        description: data.description,
        amountUSD: data.amountUSD,
        amountVES: data.amountVES,
        exchangeRate: data.exchangeRate,
        paymentMethod: data.paymentMethod,
        reference: data.reference || null,
        workOrderId: data.workOrderId || null,
        registeredById: req.userId,
        registeredByName: req.userName || 'Usuario',
      },
    });

    res.status(201).json({ message: 'Movimiento registrado con éxito', movement });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar movimiento en caja' });
  }
});

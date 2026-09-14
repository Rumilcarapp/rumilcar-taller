import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireWorkshop, requireRole, AuthRequest } from '../../middleware/auth';
import { z } from 'zod';

export const expensesRouter = Router();
expensesRouter.use(authenticate);
expensesRouter.use(requireWorkshop);

const createExpenseSchema = z.object({
  category: z.string().trim().min(2),
  description: z.string().trim().min(3),
  amountUSD: z.number().positive(),
  amountVES: z.number().min(0).default(0),
  exchangeRate: z.number().min(0).default(0),
  paymentMethod: z.string().trim().min(2),
  reference: z.string().trim().optional().nullable(),
  supplierName: z.string().trim().optional().nullable(),
  supplierRif: z.string().trim().optional().nullable(),
  invoiceNumber: z.string().trim().optional().nullable(),
  date: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/expenses — List expenses for workshop
expensesRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { category, startDate, endDate } = req.query;

    const expenses = await prisma.expense.findMany({
      where: {
        workshopId: req.workshopId!,
        ...(category && { category: String(category) }),
        ...(startDate && endDate && {
          date: {
            gte: new Date(String(startDate)),
            lte: new Date(String(endDate)),
          },
        }),
      },
      orderBy: { date: 'desc' },
      take: 200,
    });

    const totalUSD = expenses.reduce((acc, e) => acc + e.amountUSD, 0);
    const totalVES = expenses.reduce((acc, e) => acc + e.amountVES, 0);

    res.json({ expenses, totalUSD, totalVES, count: expenses.length });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar egresos del taller' });
  }
});

// POST /api/expenses — Create new expense
expensesRouter.post('/', requireRole('OWNER', 'ADMIN', 'CASHIER'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = createExpenseSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Datos de egreso inválidos', details: parseResult.error.format() });
      return;
    }

    const data = parseResult.data;

    // Check active cash session
    const activeSession = await prisma.cashSession.findFirst({
      where: { workshopId: req.workshopId!, status: 'OPEN' },
    });

    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          workshopId: req.workshopId!,
          category: data.category,
          description: data.description,
          amountUSD: data.amountUSD,
          amountVES: data.amountVES,
          exchangeRate: data.exchangeRate,
          paymentMethod: data.paymentMethod,
          reference: data.reference || null,
          supplierName: data.supplierName || null,
          supplierRif: data.supplierRif || null,
          invoiceNumber: data.invoiceNumber || null,
          date: data.date ? new Date(data.date) : new Date(),
          registeredById: req.userId,
          notes: data.notes || null,
        },
      });

      // If paid from cash box, record movement
      if (activeSession) {
        await tx.cashMovement.create({
          data: {
            workshopId: req.workshopId!,
            sessionId: activeSession.id,
            type: 'EXPENSE',
            category: data.category,
            description: `Gasto: ${data.description}`,
            amountUSD: data.amountUSD,
            amountVES: data.amountVES,
            exchangeRate: data.exchangeRate,
            paymentMethod: data.paymentMethod,
            reference: data.reference || null,
            expenseId: exp.id,
            registeredById: req.userId,
            registeredByName: req.userName || 'Usuario',
          },
        });
      }

      return exp;
    });

    res.status(201).json({ message: 'Egreso registrado con éxito', expense });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar egreso' });
  }
});

// DELETE /api/expenses/:id — Delete expense
expensesRouter.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const existing = await prisma.expense.findFirst({
      where: { id, workshopId: req.workshopId! },
    });

    if (!existing) {
      res.status(404).json({ error: 'Egreso no encontrado en este taller' });
      return;
    }

    await prisma.$transaction([
      prisma.cashMovement.deleteMany({ where: { expenseId: id } }),
      prisma.expense.delete({ where: { id } }),
    ]);

    res.json({ message: 'Egreso eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar egreso' });
  }
});

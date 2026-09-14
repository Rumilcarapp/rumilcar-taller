import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireWorkshop, requireRole, AuthRequest } from '../../middleware/auth';
import { z } from 'zod';

export const currencyRouter = Router();
currencyRouter.use(authenticate);
currencyRouter.use(requireWorkshop);

const setRateSchema = z.object({
  rate: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      throw new Error('La tasa debe ser un número positivo');
    }
    return num;
  }),
  source: z.string().trim().optional().default('manual'),
});

// GET /api/currency/rate — Get current exchange rate
currencyRouter.get('/rate', async (req: AuthRequest, res: Response) => {
  try {
    const rate = await prisma.exchangeRate.findFirst({
      where: { workshopId: req.workshopId! },
      orderBy: { effectiveAt: 'desc' },
    });
    res.json(rate || { rateToAnchor: 0, currency: 'VES', source: 'none' });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tasa de cambio' });
  }
});

// POST /api/currency/rate — Set new exchange rate (OWNER, ADMIN, CASHIER)
currencyRouter.post('/rate', requireRole('OWNER', 'ADMIN', 'CASHIER'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = setRateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Tasa inválida', details: parseResult.error.format() });
      return;
    }

    const { rate, source } = parseResult.data;
    const exchangeRate = await prisma.exchangeRate.create({
      data: {
        workshopId: req.workshopId!,
        currency: 'VES',
        rateToAnchor: rate,
        source: source || 'manual',
      },
    });
    res.status(201).json(exchangeRate);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar tasa de cambio' });
  }
});

// GET /api/currency/history — Rate history for auditing
currencyRouter.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const rates = await prisma.exchangeRate.findMany({
      where: { workshopId: req.workshopId },
      orderBy: { effectiveAt: 'desc' },
      take: 30,
    });
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de tasas' });
  }
});

// POST /api/currency/snapshot — Create immutable rate snapshot for transaction
currencyRouter.post('/snapshot', async (req: AuthRequest, res: Response) => {
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: req.workshopId },
    });
    if (!workshop) {
      res.status(404).json({ error: 'Taller no encontrado' });
      return;
    }

    const currentRate = await prisma.exchangeRate.findFirst({
      where: { workshopId: req.workshopId },
      orderBy: { effectiveAt: 'desc' },
    });

    const snapshot = await prisma.exchangeRateSnapshot.create({
      data: {
        vesRate: currentRate?.rateToAnchor || 0,
        usdtSpread: workshop.usdtSpread,
        anchorCurrency: workshop.anchorCurrency,
      },
    });

    res.status(201).json(snapshot);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear snapshot de tasa' });
  }
});
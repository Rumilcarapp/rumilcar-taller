import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireWorkshop, requireRole, AuthRequest } from '../../middleware/auth';
import { z } from 'zod';

export const workshopRouter = Router();
workshopRouter.use(authenticate);
workshopRouter.use(requireWorkshop);

const updateWorkshopSchema = z.object({
  name: z.string().trim().min(2).optional(),
  legalName: z.string().trim().optional().nullable(),
  taxId: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().email().optional().nullable(),
  anchorCurrency: z.enum(['USD', 'VES']).optional(),
  usdtSpread: z.number().or(z.string()).optional(),
  autoExchangeRate: z.boolean().optional(),
});

// GET /api/workshop — Get workshop profile
workshopRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: req.workshopId },
      include: {
        paymentMethods: true,
        mechanics: { orderBy: { name: 'asc' } },
      },
    });
    if (!workshop) {
      res.status(404).json({ error: 'Taller no encontrado' });
      return;
    }
    res.json(workshop);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el perfil del taller' });
  }
});

// PUT /api/workshop — Update workshop profile (OWNER or ADMIN only)
workshopRouter.put('/', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = updateWorkshopSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Datos de taller inválidos', details: parseResult.error.format() });
      return;
    }

    const data = parseResult.data;
    const workshop = await prisma.workshop.update({
      where: { id: req.workshopId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.legalName !== undefined && { legalName: data.legalName }),
        ...(data.taxId !== undefined && { taxId: data.taxId }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.anchorCurrency !== undefined && { anchorCurrency: data.anchorCurrency }),
        ...(data.usdtSpread !== undefined && { usdtSpread: parseFloat(String(data.usdtSpread)) }),
        ...(data.autoExchangeRate !== undefined && { autoExchangeRate: data.autoExchangeRate }),
      },
    });
    res.json(workshop);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

// PUT /api/workshop/payment-methods — Update payment methods (OWNER or ADMIN only)
workshopRouter.put('/payment-methods', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { methods } = req.body; // Array of { method: string, isEnabled: boolean }
    if (!Array.isArray(methods)) {
      res.status(400).json({ error: 'Se esperaba un arreglo de métodos de pago' });
      return;
    }
    for (const m of methods) {
      if (!m.method) continue;
      await prisma.workshopPaymentMethod.upsert({
        where: {
          workshopId_method: {
            workshopId: req.workshopId!,
            method: m.method,
          },
        },
        update: { isEnabled: Boolean(m.isEnabled) },
        create: {
          workshopId: req.workshopId!,
          method: m.method,
          isEnabled: Boolean(m.isEnabled),
        },
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar metodos de pago' });
  }
});
import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';

export const workshopRouter = Router();
workshopRouter.use(authenticate);

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

// PUT /api/workshop — Update workshop profile
workshopRouter.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const workshop = await prisma.workshop.update({
      where: { id: req.workshopId },
      data: {
        name: data.name,
        legalName: data.legalName,
        taxId: data.taxId,
        address: data.address,
        website: data.website,
        phone: data.phone,
        email: data.email,
        anchorCurrency: data.anchorCurrency,
        usdtSpread: data.usdtSpread !== undefined ? parseFloat(data.usdtSpread) : undefined,
        autoExchangeRate: data.autoExchangeRate,
      },
    });
    res.json(workshop);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

// PUT /api/workshop/payment-methods — Update payment methods
workshopRouter.put('/payment-methods', async (req: AuthRequest, res: Response) => {
  try {
    const { methods } = req.body; // Array of { method: string, isEnabled: boolean }
    for (const m of methods) {
      await prisma.workshopPaymentMethod.upsert({
        where: {
          workshopId_method: {
            workshopId: req.workshopId!,
            method: m.method,
          },
        },
        update: { isEnabled: m.isEnabled },
        create: {
          workshopId: req.workshopId!,
          method: m.method,
          isEnabled: m.isEnabled,
        },
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar metodos de pago' });
  }
});
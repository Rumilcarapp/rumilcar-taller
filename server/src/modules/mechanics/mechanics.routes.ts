import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';

export const mechanicsRouter = Router();
mechanicsRouter.use(authenticate);

// GET /api/mechanics — List all mechanics
mechanicsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const mechanics = await prisma.mechanic.findMany({
      where: { workshopId: req.workshopId },
      orderBy: { name: 'asc' },
      include: {
        assignments: {
          include: { workOrder: { select: { status: true } } },
        },
      },
    });

    // Enrich with stats
    const enriched = mechanics.map((m) => {
      const activeOrders = m.assignments.filter(
        (a) => !a.unassignedAt && ['RECEIVED', 'DIAGNOSING', 'REPAIRING', 'WAITING_PARTS'].includes(a.workOrder.status)
      ).length;
      const completedOrders = m.assignments.filter(
        (a) => ['READY', 'DELIVERED'].includes(a.workOrder.status)
      ).length;
      return { ...m, activeOrders, completedOrders, assignments: undefined };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mecanicos' });
  }
});

// POST /api/mechanics — Add mechanic
mechanicsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, specialty, phone } = req.body;
    const mechanic = await prisma.mechanic.create({
      data: {
        workshopId: req.workshopId!,
        name,
        specialty,
        phone,
      },
    });
    res.status(201).json(mechanic);
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar mecanico' });
  }
});

// PUT /api/mechanics/:id — Update mechanic
mechanicsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const mechanic = await prisma.mechanic.update({
      where: { id },
      data: req.body,
    });
    res.json(mechanic);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar mecanico' });
  }
});

// PUT /api/mechanics/:id/toggle — Toggle active status
mechanicsRouter.put('/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const mechanic = await prisma.mechanic.findUnique({ where: { id } });
    if (!mechanic) {
      res.status(404).json({ error: 'Mecanico no encontrado' });
      return;
    }
    const updated = await prisma.mechanic.update({
      where: { id },
      data: { isActive: !mechanic.isActive },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del mecanico' });
  }
});
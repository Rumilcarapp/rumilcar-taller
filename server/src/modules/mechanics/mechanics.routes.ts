import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate, requireWorkshop, requireRole, AuthRequest } from '../../middleware/auth';
import { z } from 'zod';

export const mechanicsRouter = Router();
mechanicsRouter.use(authenticate);
mechanicsRouter.use(requireWorkshop);

const createMechanicSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  specialty: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
});

const updateMechanicSchema = createMechanicSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// GET /api/mechanics — List all mechanics for this workshop
mechanicsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const mechanics = await prisma.mechanic.findMany({
      where: { workshopId: req.workshopId! },
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
    res.status(500).json({ error: 'Error al obtener mecánicos' });
  }
});

// POST /api/mechanics — Add mechanic (OWNER or ADMIN)
mechanicsRouter.post('/', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = createMechanicSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Datos de mecánico inválidos', details: parseResult.error.format() });
      return;
    }

    const { name, specialty, phone } = parseResult.data;
    const mechanic = await prisma.mechanic.create({
      data: {
        workshopId: req.workshopId!,
        name,
        specialty: specialty || null,
        phone: phone || null,
      },
    });
    res.status(201).json(mechanic);
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar mecánico' });
  }
});

// PUT /api/mechanics/:id — Update mechanic (OWNER or ADMIN)
mechanicsRouter.put('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.mechanic.findFirst({
      where: { id, workshopId: req.workshopId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Mecánico no encontrado en este taller' });
      return;
    }

    const parseResult = updateMechanicSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.format() });
      return;
    }

    const mechanic = await prisma.mechanic.update({
      where: { id },
      data: parseResult.data,
    });
    res.json(mechanic);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar mecánico' });
  }
});

// PUT /api/mechanics/:id/toggle — Toggle active status
mechanicsRouter.put('/:id/toggle', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const mechanic = await prisma.mechanic.findFirst({
      where: { id, workshopId: req.workshopId! },
    });
    if (!mechanic) {
      res.status(404).json({ error: 'Mecánico no encontrado en este taller' });
      return;
    }

    const updated = await prisma.mechanic.update({
      where: { id },
      data: { isActive: !mechanic.isActive },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del mecánico' });
  }
});

// DELETE /api/mechanics/:id — Delete mechanic
mechanicsRouter.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const mechanic = await prisma.mechanic.findFirst({
      where: { id, workshopId: req.workshopId! },
      include: {
        assignments: {
          include: {
            workOrder: { select: { status: true, orderNumber: true } },
          },
        },
      },
    });

    if (!mechanic) {
      res.status(404).json({ error: 'Mecánico no encontrado en este taller' });
      return;
    }

    // Check if mechanic has active assignments
    const activeAssignments = mechanic.assignments.filter(
      (a) => !a.unassignedAt && !['READY', 'DELIVERED', 'CANCELLED'].includes(a.workOrder.status)
    );

    if (activeAssignments.length > 0) {
      res.status(400).json({
        error: `No se puede eliminar el mecánico porque tiene ${activeAssignments.length} órdenes activas asignadas. Reasigne o desactive el mecánico.`,
      });
      return;
    }

    // Delete assignments history and then mechanic
    await prisma.workOrderAssignment.deleteMany({
      where: { mechanicId: id },
    });

    await prisma.mechanic.delete({
      where: { id },
    });

    res.json({ message: 'Mecánico eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar mecánico' });
  }
});
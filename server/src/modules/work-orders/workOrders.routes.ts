import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireWorkshop, requireRole, AuthRequest, logSecurityEvent } from '../../middleware/auth';

export const workOrdersRouter = Router();

// ==========================================
// PUBLIC TRACKING ROUTE (No Auth Required)
// ==========================================
// GET /api/work-orders/tracking/:id — Public customer tracking by UUID, short ID, orderNumber, or license plate
workOrdersRouter.get('/tracking/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const rawId = (rawParam || '').trim();
    if (!rawId) {
      res.status(400).json({ error: 'Identificador de orden requerido' });
      return;
    }

    const isNumeric = /^\d+$/.test(rawId);

    const order = await prisma.workOrder.findFirst({
      where: {
        OR: [
          { id: rawId },
          { id: { startsWith: rawId, mode: 'insensitive' } },
          { vehicle: { licensePlate: { equals: rawId, mode: 'insensitive' } } },
          ...(isNumeric ? [{ orderNumber: parseInt(rawId, 10) }] : []),
        ],
      },
      include: {
        workshop: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            logoUrl: true,
            taxId: true,
            exchangeRates: {
              orderBy: { effectiveAt: 'desc' },
              take: 1,
            },
            paymentMethods: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            taxId: true,
            address: true,
          },
        },
        vehicle: true,
        items: {
          include: { inventoryItem: true },
        },
        photos: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
        },
        assignments: {
          include: {
            mechanic: {
              select: {
                id: true,
                name: true,
                specialty: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    const statusMapFromBackend: Record<string, string> = {
      RECEIVED: 'Recibido',
      IN_PROGRESS: 'En Proceso',
      READY: 'Listo',
      DELIVERED: 'Finalizado',
      CANCELLED: 'Rechazado',
    };

    const services = (order.items || [])
      .filter((i) => i.type === 'SERVICE')
      .map((i) => ({
        id: i.id,
        name: i.description,
        price: i.unitPriceAnchor,
        quantity: i.quantity,
      }));

    const parts = (order.items || [])
      .filter((i) => i.type === 'PART')
      .map((i) => ({
        id: i.id,
        name: i.description,
        price: i.unitPriceAnchor,
        quantity: i.quantity,
      }));

    const mechanic = order.assignments?.[0]?.mechanic;
    let latestRate = order.workshop?.exchangeRates?.[0]?.rateToAnchor;
    if (!latestRate || latestRate <= 65) {
      try {
        const bcvRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: AbortSignal.timeout(2500) });
        if (bcvRes.ok) {
          const bcvData: any = await bcvRes.json();
          if (bcvData?.promedio && bcvData.promedio > 0) {
            latestRate = Number(bcvData.promedio.toFixed(2));
          }
        }
      } catch {
        latestRate = latestRate && latestRate > 100 ? latestRate : 874.73;
      }
    }
    if (!latestRate || latestRate <= 65) {
      latestRate = 874.73;
    }

    const itemsTotal = (services.reduce((a, s) => a + (s.price || 0) * (s.quantity || 1), 0)) +
                       (parts.reduce((a, p) => a + (p.price || 0) * (p.quantity || 1), 0));
    const effectiveTotalUSD = (itemsTotal > 0 && (!order.totalAnchor || (order.totalAnchor < 1 && itemsTotal >= 1)))
      ? itemsTotal
      : (order.totalAnchor || itemsTotal || 0);

    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: statusMapFromBackend[order.status] || order.status || 'Recibido',
      statusRaw: order.status,
      date: order.receivedAt || order.createdAt,
      receivedAt: order.receivedAt,
      completedAt: order.completedAt,
      deliveredAt: order.deliveredAt,
      totalUSD: effectiveTotalUSD,
      notes: order.notes,
      inspectionNotes: order.inspectionNotes,
      client: {
        id: order.client.id,
        nombre: order.client.name,
        telefono: order.client.phone || '',
        documento: order.client.taxId || '',
        direccion: order.client.address || '',
      },
      vehicle: {
        id: order.vehicle.id,
        marca: order.vehicle.make,
        modelo: order.vehicle.model,
        ano: order.vehicle.year ? String(order.vehicle.year) : '',
        placa: order.vehicle.licensePlate || '',
        color: order.vehicle.color || '',
        mileage: order.vehicle.mileage,
      },
      services,
      parts,
      payments: (order.payments || []).map((p) => ({
        id: p.id,
        amountUSD: p.currency === 'USD' ? p.amount : 0,
        amountVES: p.currency === 'VES' ? p.amount : undefined,
        method: p.paymentMethod,
        date: p.paidAt,
        reference: p.reference,
      })),
      mechanicName: mechanic?.name,
      photos: order.photos,
    };

    res.json({
      success: true,
      order: formattedOrder,
      workshop: {
        id: order.workshop.id,
        name: order.workshop.name,
        phone: order.workshop.phone,
        email: order.workshop.email,
        address: order.workshop.address,
        logoUrl: order.workshop.logoUrl,
        taxId: order.workshop.taxId,
      },
      exchangeRateVES: latestRate,
    });
  } catch (error: any) {
    console.error('Error fetching tracking work order:', error);
    res.status(500).json({ error: 'Error al consultar la orden para seguimiento' });
  }
});

// Apply authentication and workshop requirement to all private work order management routes
workOrdersRouter.use(authenticate);
workOrdersRouter.use(requireWorkshop);

// Zod schemas for input validation
const workOrderItemSchema = z.object({
  type: z.enum(['SERVICE', 'PART']).default('SERVICE'),
  description: z.string().min(1, 'La descripción del ítem es requerida'),
  quantity: z.union([z.number(), z.string()]).default(1),
  unitPriceAnchor: z.union([z.number(), z.string()]),
  inventoryItemId: z.string().optional().nullable(),
});

const statusEnum = z.preprocess((val) => {
  const map: Record<string, string> = {
    'Presupuesto': 'RECEIVED',
    'Recibido': 'RECEIVED',
    'En Proceso': 'IN_PROGRESS',
    'Listo': 'READY',
    'Finalizado': 'DELIVERED',
    'Rechazado': 'CANCELLED',
  };
  return (typeof val === 'string' && map[val]) || val;
}, z.enum(['RECEIVED', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED']));

const createWorkOrderSchema = z.object({
  clientId: z.string().min(1, 'El cliente es requerido'),
  vehicleId: z.string().min(1, 'El vehículo es requerido'),
  status: statusEnum.default('RECEIVED'),
  notes: z.string().optional().nullable(),
  inspectionNotes: z.string().optional().nullable(),
  totalAnchor: z.union([z.number(), z.string()]).optional().default(0),
  items: z.array(workOrderItemSchema).optional(),
});

const updateWorkOrderSchema = z.object({
  status: statusEnum.optional(),
  notes: z.string().optional().nullable(),
  inspectionNotes: z.string().optional().nullable(),
  totalAnchor: z.union([z.number(), z.string()]).optional(),
  deliveredAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
});

// GET /api/work-orders - Get all work orders belonging strictly to authenticated workshop
workOrdersRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const status = req.query.status as string | undefined;
    const clientId = req.query.clientId as string | undefined;
    const search = req.query.search as string | undefined;

    const orders = await prisma.workOrder.findMany({
      where: {
        workshopId,
        ...(status && status !== 'TODOS' ? { status } : {}),
        ...(clientId ? { clientId } : {}),
        ...(search
          ? {
              OR: [
                { client: { name: { contains: search, mode: 'insensitive' } } },
                { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
                { vehicle: { model: { contains: search, mode: 'insensitive' } } },
                { notes: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        client: true,
        vehicle: true,
        items: {
          include: { inventoryItem: true },
        },
        payments: true,
        assignments: {
          include: { mechanic: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error: any) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Error al consultar órdenes de trabajo del taller' });
  }
});

// GET /api/work-orders/:id - Get single work order ensuring workshop ownership
workOrdersRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const order = await prisma.workOrder.findFirst({
      where: {
        id,
        workshopId,
      },
      include: {
        client: true,
        vehicle: true,
        items: {
          include: { inventoryItem: true },
        },
        payments: true,
        assignments: {
          include: { mechanic: true },
        },
        photos: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Orden de trabajo no encontrada en tu taller' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    console.error('Error fetching work order by id:', error);
    res.status(500).json({ error: 'Error al consultar la orden de trabajo' });
  }
});

// POST /api/work-orders - Create work order securely isolated to this workshop
workOrdersRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const userId = req.userId!;

    const parseResult = createWorkOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { clientId, vehicleId, status, notes, inspectionNotes, totalAnchor, items } = parseResult.data;

    // Verify client belongs to this workshop
    const client = await prisma.client.findFirst({
      where: { id: clientId, workshopId },
    });
    if (!client) {
      res.status(400).json({ error: 'El cliente no pertenece a tu taller' });
      return;
    }

    // Verify vehicle belongs to this client and workshop
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, clientId },
    });
    if (!vehicle) {
      res.status(400).json({ error: 'El vehículo no pertenece al cliente seleccionado' });
      return;
    }

    // Atomic transaction: Compute workshop-scoped order number and persist order with items
    const order = await prisma.$transaction(async (tx) => {
      const lastOrder = await tx.workOrder.findFirst({
        where: { workshopId },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      });

      const itemsSum = (items || []).reduce((acc, it) => acc + (parseFloat(String(it.unitPriceAnchor || 0)) * parseFloat(String(it.quantity || 1))), 0);
      const parsedTotal = parseFloat(String(totalAnchor || 0));
      const finalTotalAnchor = (itemsSum > 0 && (parsedTotal <= 0 || (parsedTotal < 1 && itemsSum >= 1)))
        ? itemsSum
        : (parsedTotal > 0 ? parsedTotal : itemsSum);

      const orderNumber = (lastOrder?.orderNumber || 1000) + 1;

      return tx.workOrder.create({
        data: {
          workshopId,
          clientId,
          vehicleId,
          createdById: userId,
          orderNumber,
          status,
          totalAnchor: finalTotalAnchor,
          notes: notes ? notes.trim() : null,
          inspectionNotes: inspectionNotes ? inspectionNotes.trim() : null,
          items: items && items.length > 0 ? {
            create: items.map((item) => ({
              type: item.type,
              description: item.description.trim(),
              quantity: parseFloat(String(item.quantity)),
              unitPriceAnchor: parseFloat(String(item.unitPriceAnchor)),
              inventoryItemId: item.inventoryItemId || null,
            })),
          } : undefined,
        },
        include: {
          client: true,
          vehicle: true,
          items: true,
        },
      });
    });

    logSecurityEvent({
      action: 'CREATE_WORK_ORDER',
      workshopId,
      userId,
      details: `Orden creada #${order.orderNumber} para cliente ${client.name}`,
    });

    res.status(201).json(order);
  } catch (error: any) {
    console.error('Error creating work order:', error);
    res.status(500).json({ error: 'Error al registrar la orden de trabajo' });
  }
});

// PUT /api/work-orders/:id - Update order status and details with ownership check
workOrdersRouter.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const parseResult = updateWorkOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const existing = await prisma.workOrder.findFirst({
      where: { id, workshopId },
      include: { items: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Orden de trabajo no encontrada en tu taller' });
      return;
    }

    const { status, notes, inspectionNotes, totalAnchor, deliveredAt, completedAt } = parseResult.data;

    const updated = await prisma.$transaction(async (tx) => {
      // If transitioning to DELIVERED and wasn't delivered before, automatically set deliveredAt
      let autoDeliveredAt: Date | undefined = undefined;
      if (status === 'DELIVERED' && !existing.deliveredAt) {
        autoDeliveredAt = deliveredAt ? new Date(deliveredAt) : new Date();
      }

      let autoCompletedAt: Date | undefined = undefined;
      if (status === 'READY' && !existing.completedAt) {
        autoCompletedAt = completedAt ? new Date(completedAt) : new Date();
      }

      let finalTotalAnchor: number | undefined = undefined;
      if (totalAnchor !== undefined) {
        const parsed = parseFloat(String(totalAnchor));
        const itemsSum = (existing.items || []).reduce((acc, it) => acc + (it.unitPriceAnchor * it.quantity), 0);
        if (itemsSum > 0 && (parsed <= 0 || (parsed < 1 && itemsSum >= 1))) {
          finalTotalAnchor = itemsSum;
        } else {
          finalTotalAnchor = parsed;
        }
      }

      return tx.workOrder.update({
        where: { id },
        data: {
          status,
          notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
          inspectionNotes: inspectionNotes !== undefined ? (inspectionNotes ? inspectionNotes.trim() : null) : undefined,
          totalAnchor: finalTotalAnchor !== undefined ? finalTotalAnchor : undefined,
          deliveredAt: autoDeliveredAt || (deliveredAt ? new Date(deliveredAt) : undefined),
          completedAt: autoCompletedAt || (completedAt ? new Date(completedAt) : undefined),
        },
        include: {
          client: true,
          vehicle: true,
          items: true,
          payments: true,
        },
      });
    });

    logSecurityEvent({
      action: 'UPDATE_WORK_ORDER',
      workshopId,
      userId: req.userId,
      details: `Orden #${existing.orderNumber} actualizada a estado ${status || existing.status}`,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating work order:', error);
    res.status(500).json({ error: 'Error al actualizar la orden de trabajo' });
  }
});

// DELETE /api/work-orders/:id - Delete work order (restricted to OWNER and ADMIN)
workOrdersRouter.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const existing = await prisma.workOrder.findFirst({
      where: { id, workshopId },
      include: {
        payments: true,
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Orden de trabajo no encontrada en tu taller' });
      return;
    }

    if (existing.payments.length > 0) {
      res.status(400).json({
        error: 'No se puede eliminar una orden de trabajo que contiene pagos registrados. Debes anular los pagos primero.',
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.workOrderItem.deleteMany({ where: { workOrderId: id } });
      await tx.workOrderAssignment.deleteMany({ where: { workOrderId: id } });
      await tx.workOrderPhoto.deleteMany({ where: { workOrderId: id } });
      await tx.workOrder.delete({ where: { id } });
    });

    logSecurityEvent({
      action: 'DELETE_WORK_ORDER',
      workshopId,
      userId: req.userId,
      details: `Orden #${existing.orderNumber} eliminada por usuario ${req.userId}`,
    });

    res.json({ success: true, message: 'Orden de trabajo eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting work order:', error);
    res.status(500).json({ error: 'Error al eliminar la orden de trabajo' });
  }
});

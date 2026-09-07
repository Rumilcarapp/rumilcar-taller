import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export const workOrdersRouter = Router();

// GET all work orders
workOrdersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const workshopId = (req.query.workshopId as string) || 'default-workshop';
    const status = req.query.status as string | undefined;

    const orders = await prisma.workOrder.findMany({
      where: {
        workshopId,
        status: status ? status : undefined,
      },
      include: {
        client: true,
        vehicle: true,
        items: true,
        payments: true,
        assignments: { include: { mechanic: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single work order by ID (Used by Client Tracking Portal & Workshop)
workOrdersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const order = await prisma.workOrder.findFirst({
      where: {
        OR: [
          { id },
          { vehicle: { licensePlate: id } },
        ],
      },
      include: {
        client: true,
        vehicle: true,
        items: true,
        payments: true,
        assignments: { include: { mechanic: true } },
        photos: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create work order
workOrdersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { workshopId, clientId, vehicleId, createdById, status, totalAnchor, notes, inspectionNotes, items } = req.body;
    
    // Auto-increment order number
    const lastOrder = await prisma.workOrder.findFirst({
      where: { workshopId: workshopId || 'default-workshop' },
      orderBy: { orderNumber: 'desc' },
    });
    const orderNumber = (lastOrder?.orderNumber || 1000) + 1;

    const order = await prisma.workOrder.create({
      data: {
        workshopId: workshopId || 'default-workshop',
        clientId,
        vehicleId,
        createdById: createdById || 'usr-default',
        orderNumber,
        status: status || 'RECEIVED',
        totalAnchor: parseFloat(totalAnchor || 0),
        notes,
        inspectionNotes,
        items: items && items.length > 0 ? {
          create: items.map((item: any) => ({
            type: item.type || 'SERVICE',
            description: item.description || item.name,
            quantity: parseFloat(item.quantity || 1),
            unitPriceAnchor: parseFloat(item.unitPriceAnchor || item.price || 0),
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

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update work order status or details
workOrdersRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, notes, totalAnchor, deliveredAt, completedAt } = req.body;

    const order = await prisma.workOrder.update({
      where: { id },
      data: {
        status,
        notes,
        totalAnchor: totalAnchor ? parseFloat(totalAnchor) : undefined,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : undefined,
        completedAt: completedAt ? new Date(completedAt) : undefined,
      },
    });

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

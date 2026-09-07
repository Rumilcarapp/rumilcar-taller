import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export const vehiclesRouter = Router();

// GET all vehicles
vehiclesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const vehicles = await prisma.vehicle.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(vehicles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create vehicle
vehiclesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { clientId, make, model, year, licensePlate, vin, color, mileage, notes } = req.body;
    const vehicle = await prisma.vehicle.create({
      data: {
        clientId,
        make,
        model,
        year: year ? parseInt(year, 10) : null,
        licensePlate,
        vin,
        color,
        mileage: mileage ? parseInt(mileage, 10) : null,
        notes,
      },
    });
    res.status(201).json(vehicle);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update vehicle
vehiclesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: req.body,
    });
    res.json(vehicle);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE vehicle
vehiclesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.vehicle.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

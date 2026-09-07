import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export const clientsRouter = Router();

// GET all clients
clientsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const workshopId = (req.query.workshopId as string) || 'default-workshop';
    const clients = await prisma.client.findMany({
      where: { workshopId },
      include: { vehicles: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create client
clientsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, taxId, address, notes, workshopId } = req.body;
    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        taxId,
        address,
        notes,
        workshopId: workshopId || 'default-workshop',
      },
    });
    res.status(201).json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update client
clientsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const client = await prisma.client.update({
      where: { id },
      data: req.body,
    });
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE client
clientsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.client.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

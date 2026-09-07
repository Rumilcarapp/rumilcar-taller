import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export const inventoryRouter = Router();

// GET all inventory items
inventoryRouter.get('/', async (req: Request, res: Response) => {
  try {
    const workshopId = (req.query.workshopId as string) || 'default-workshop';
    const items = await prisma.inventoryItem.findMany({
      where: { workshopId },
      orderBy: { name: 'asc' },
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create inventory item
inventoryRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { workshopId, sku, name, description, category, unitPriceAnchor, costPriceAnchor, currentStock, minStock, unit } = req.body;
    const item = await prisma.inventoryItem.create({
      data: {
        workshopId: workshopId || 'default-workshop',
        sku,
        name,
        description,
        category,
        unitPriceAnchor: parseFloat(unitPriceAnchor || 0),
        costPriceAnchor: costPriceAnchor ? parseFloat(costPriceAnchor) : null,
        currentStock: parseFloat(currentStock || 0),
        minStock: parseFloat(minStock || 0),
        unit: unit || 'unidad',
      },
    });
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update inventory item
inventoryRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: req.body,
    });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE inventory item
inventoryRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.inventoryItem.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireWorkshop, requireRole, AuthRequest, logSecurityEvent } from '../../middleware/auth';

export const inventoryRouter = Router();

// Apply authentication and workshop requirement to all inventory routes
inventoryRouter.use(authenticate);
inventoryRouter.use(requireWorkshop);

// Zod schemas for input validation
const createItemSchema = z.object({
  sku: z.string().optional().nullable(),
  name: z.string().min(2, 'El nombre del repuesto o artículo es requerido'),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unitPriceAnchor: z.union([z.number(), z.string()]),
  costPriceAnchor: z.union([z.number(), z.string()]).optional().nullable(),
  currentStock: z.union([z.number(), z.string()]).optional().default(0),
  minStock: z.union([z.number(), z.string()]).optional().default(0),
  unit: z.string().optional().default('unidad'),
});

const updateItemSchema = createItemSchema.partial();

// GET /api/inventory - Get all inventory items belonging strictly to this workshop
inventoryRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;

    const items = await prisma.inventoryItem.findMany({
      where: {
        workshopId,
        ...(category && category !== 'TODOS' ? { category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });

    res.json(items);
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Error al consultar inventario del taller' });
  }
});

// GET /api/inventory/:id - Get a single item with ownership check
inventoryRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const item = await prisma.inventoryItem.findFirst({
      where: { id, workshopId },
    });

    if (!item) {
      res.status(404).json({ error: 'Artículo de inventario no encontrado en tu taller' });
      return;
    }

    res.json(item);
  } catch (error: any) {
    console.error('Error fetching inventory item by id:', error);
    res.status(500).json({ error: 'Error al consultar artículo de inventario' });
  }
});

// POST /api/inventory - Create item securely scoped to authenticated workshop
inventoryRouter.post('/', requireRole('OWNER', 'ADMIN', 'INVENTORY'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const parseResult = createItemSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { sku, name, description, category, unitPriceAnchor, costPriceAnchor, currentStock, minStock, unit } = parseResult.data;
    const cleanSku = sku ? sku.trim().toUpperCase() : null;

    // Check for duplicate SKU in this workshop
    if (cleanSku) {
      const existing = await prisma.inventoryItem.findFirst({
        where: { workshopId, sku: cleanSku },
      });
      if (existing) {
        res.status(400).json({
          error: `Ya existe un artículo registrado con el código / SKU ${cleanSku} en tu taller (${existing.name}).`,
        });
        return;
      }
    }

    const item = await prisma.inventoryItem.create({
      data: {
        workshopId,
        sku: cleanSku,
        name: name.trim(),
        description: description ? description.trim() : null,
        category: category ? category.trim() : null,
        unitPriceAnchor: parseFloat(String(unitPriceAnchor)),
        costPriceAnchor: costPriceAnchor !== null && costPriceAnchor !== undefined ? parseFloat(String(costPriceAnchor)) : null,
        currentStock: parseFloat(String(currentStock || 0)),
        minStock: parseFloat(String(minStock || 0)),
        unit: unit ? unit.trim() : 'unidad',
      },
    });

    logSecurityEvent({
      action: 'CREATE_INVENTORY_ITEM',
      workshopId,
      userId: req.userId,
      details: `Artículo creado: ${item.name} (${cleanSku || 'Sin SKU'}) - Stock: ${item.currentStock}`,
    });

    res.status(201).json(item);
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ error: 'Error al registrar artículo en inventario' });
  }
});

// PUT /api/inventory/:id - Update item with strict ownership check
inventoryRouter.put('/:id', requireRole('OWNER', 'ADMIN', 'INVENTORY'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const parseResult = updateItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, workshopId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Artículo no encontrado en tu taller' });
      return;
    }

    const data = parseResult.data;
    const cleanSku = data.sku !== undefined ? (data.sku ? data.sku.trim().toUpperCase() : null) : undefined;

    // If changing SKU, check for collision
    if (cleanSku && cleanSku !== existing.sku) {
      const collision = await prisma.inventoryItem.findFirst({
        where: { workshopId, sku: cleanSku, id: { not: id } },
      });
      if (collision) {
        res.status(400).json({ error: `El código/SKU ${cleanSku} ya está siendo utilizado por ${collision.name}.` });
        return;
      }
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        sku: cleanSku,
        name: data.name !== undefined ? data.name.trim() : undefined,
        description: data.description !== undefined ? (data.description ? data.description.trim() : null) : undefined,
        category: data.category !== undefined ? (data.category ? data.category.trim() : null) : undefined,
        unitPriceAnchor: data.unitPriceAnchor !== undefined ? parseFloat(String(data.unitPriceAnchor)) : undefined,
        costPriceAnchor: data.costPriceAnchor !== undefined ? (data.costPriceAnchor ? parseFloat(String(data.costPriceAnchor)) : null) : undefined,
        currentStock: data.currentStock !== undefined ? parseFloat(String(data.currentStock)) : undefined,
        minStock: data.minStock !== undefined ? parseFloat(String(data.minStock)) : undefined,
        unit: data.unit !== undefined ? (data.unit ? data.unit.trim() : 'unidad') : undefined,
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: 'Error al actualizar artículo de inventario' });
  }
});

// DELETE /api/inventory/:id - Delete item (requires OWNER or ADMIN role)
inventoryRouter.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, workshopId },
      include: {
        _count: { select: { workOrderItems: true } },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Artículo no encontrado en tu taller' });
      return;
    }

    if (existing._count.workOrderItems > 0) {
      res.status(400).json({
        error: `No se puede eliminar el repuesto porque está referenciado en ${existing._count.workOrderItems} orden(es) de trabajo. Puedes ajustar su stock a 0.`,
      });
      return;
    }

    await prisma.inventoryItem.delete({ where: { id } });

    logSecurityEvent({
      action: 'DELETE_INVENTORY_ITEM',
      workshopId,
      userId: req.userId,
      details: `Artículo eliminado: ${existing.name} (ID: ${id})`,
    });

    res.json({ success: true, message: 'Artículo eliminado correctamente del inventario' });
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ error: 'Error al eliminar el artículo de inventario' });
  }
});

// GET /api/inventory/movements/list - Get Kardex movements for the workshop
inventoryRouter.get('/movements/list', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const itemId = req.query.itemId as string | undefined;

    const movements = await prisma.inventoryMovement.findMany({
      where: {
        workshopId,
        ...(itemId ? { itemId } : {}),
      },
      include: {
        item: {
          select: { name: true, sku: true, category: true },
        },
        workOrder: {
          select: { orderNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(movements);
  } catch (error: any) {
    console.error('Error fetching inventory movements:', error);
    res.status(500).json({ error: 'Error al consultar movimientos de inventario' });
  }
});

// POST /api/inventory/:id/adjust - Adjust stock with atomic Kardex movement recording
const adjustStockSchema = z.object({
  quantity: z.number(), // positive to increase, negative to decrease
  type: z.enum(['IN_PURCHASE', 'OUT_SALE', 'OUT_ORDER', 'ADJUSTMENT_UP', 'ADJUSTMENT_DOWN', 'RETURN']).optional(),
  reason: z.string().optional().nullable(),
  workOrderId: z.string().optional().nullable(),
});

inventoryRouter.post('/:id/adjust', requireRole('OWNER', 'ADMIN', 'INVENTORY'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const parseResult = adjustStockSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { quantity, reason, workOrderId } = parseResult.data;
    let movementType = parseResult.data.type;
    if (!movementType) {
      movementType = quantity >= 0 ? 'ADJUSTMENT_UP' : 'ADJUSTMENT_DOWN';
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id, workshopId },
      });

      if (!item) {
        throw new Error('NOT_FOUND');
      }

      const previousStock = item.currentStock;
      const newStock = Math.max(0, previousStock + quantity);

      const updatedItem = await tx.inventoryItem.update({
        where: { id },
        data: { currentStock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          workshopId,
          itemId: id,
          type: movementType,
          quantity: Math.abs(quantity),
          previousStock,
          newStock,
          costPriceUSD: item.costPriceAnchor,
          workOrderId: workOrderId || null,
          reason: reason || (quantity >= 0 ? 'Ajuste manual de entrada' : 'Ajuste manual de salida'),
          registeredById: req.userId,
        },
      });

      return { updatedItem, movement };
    });

    res.json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Artículo de inventario no encontrado en tu taller' });
      return;
    }
    console.error('Error adjusting inventory stock:', error);
    res.status(500).json({ error: 'Error al registrar ajuste de inventario' });
  }
});


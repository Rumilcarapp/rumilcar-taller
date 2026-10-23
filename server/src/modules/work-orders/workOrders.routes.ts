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

    // Clean tracking identifiers: remove leading #, OT-, ORD-, RMC-
    const cleanId = rawId.replace(/^[#]/, '').replace(/^(?:OT|ORD|RMC)-?/i, '').trim();
    const isNumeric = /^\d+$/.test(cleanId);
    const parsedOrderNumber = isNumeric ? parseInt(cleanId, 10) : null;

    const order = await prisma.workOrder.findFirst({
      where: {
        OR: [
          { id: rawId },
          { id: cleanId },
          { id: { startsWith: rawId, mode: 'insensitive' } },
          { id: { startsWith: cleanId, mode: 'insensitive' } },
          { vehicle: { licensePlate: { equals: rawId, mode: 'insensitive' } } },
          { vehicle: { licensePlate: { equals: cleanId, mode: 'insensitive' } } },
          ...(parsedOrderNumber !== null ? [{ orderNumber: parsedOrderNumber }] : []),
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
      QUOTE: 'Presupuesto',
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

    // Smart fallback: If single service has price 0 but total > 0, attribute order total to that service
    if (services.length === 1 && parts.length === 0 && (!services[0].price || services[0].price === 0) && effectiveTotalUSD > 0) {
      services[0].price = effectiveTotalUSD;
    }

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
    'Presupuesto': 'QUOTE',
    'QUOTE': 'QUOTE',
    'Recibido': 'RECEIVED',
    'RECEIVED': 'RECEIVED',
    'En Proceso': 'IN_PROGRESS',
    'IN_PROGRESS': 'IN_PROGRESS',
    'Listo': 'READY',
    'READY': 'READY',
    'Finalizado': 'DELIVERED',
    'DELIVERED': 'DELIVERED',
    'Rechazado': 'CANCELLED',
    'CANCELLED': 'CANCELLED',
  };
  return (typeof val === 'string' && map[val]) || val;
}, z.enum(['QUOTE', 'RECEIVED', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED']));

const createWorkOrderSchema = z.object({
  clientId: z.string().optional().nullable(),
  clientDocumento: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  clientPhone: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  vehicleMake: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleYear: z.union([z.number(), z.string()]).optional().nullable(),
  vehicleColor: z.string().optional().nullable(),
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
  items: z.array(workOrderItemSchema).optional(),
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

    const {
      clientId,
      clientDocumento,
      clientName,
      clientPhone,
      clientAddress,
      vehicleId,
      vehiclePlate,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      status,
      notes,
      inspectionNotes,
      totalAnchor,
      items,
    } = parseResult.data;

    // 1. Resolve client with intelligent fallbacks
    let client = null;
    if (clientId) {
      client = await prisma.client.findFirst({
        where: { id: clientId, workshopId },
      });
      if (!client) {
        client = await prisma.client.findFirst({
          where: { taxId: { equals: clientId, mode: 'insensitive' }, workshopId },
        });
      }
    }

    if (!client && clientDocumento) {
      client = await prisma.client.findFirst({
        where: { taxId: { equals: clientDocumento, mode: 'insensitive' }, workshopId },
      });
    }

    if (!client && clientName) {
      client = await prisma.client.findFirst({
        where: { name: { equals: clientName, mode: 'insensitive' }, workshopId },
      });
    }

    if (!client) {
      if (clientName || clientDocumento) {
        client = await prisma.client.create({
          data: {
            workshopId,
            name: clientName || 'Cliente General',
            taxId: clientDocumento || null,
            phone: clientPhone || null,
            address: clientAddress || null,
          },
        });
      } else {
        res.status(400).json({ error: 'No se pudo identificar o registrar el cliente para la orden' });
        return;
      }
    }

    // 2. Resolve vehicle with intelligent fallbacks
    let vehicle = null;
    if (vehicleId) {
      vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, clientId: client.id },
      });
      if (!vehicle) {
        vehicle = await prisma.vehicle.findFirst({
          where: { licensePlate: { equals: vehicleId, mode: 'insensitive' }, clientId: client.id },
        });
      }
    }

    const cleanPlate = (vehiclePlate || '').trim();
    if (!vehicle && cleanPlate) {
      vehicle = await prisma.vehicle.findFirst({
        where: { licensePlate: { equals: cleanPlate, mode: 'insensitive' }, clientId: client.id },
      });
      if (!vehicle) {
        const existingPlateInWorkshop = await prisma.vehicle.findFirst({
          where: {
            licensePlate: { equals: cleanPlate, mode: 'insensitive' },
            client: { workshopId },
          },
        });
        if (existingPlateInWorkshop) {
          vehicle = await prisma.vehicle.update({
            where: { id: existingPlateInWorkshop.id },
            data: { clientId: client.id },
          });
        }
      }
    }

    if (!vehicle) {
      const cleanYear = vehicleYear ? parseInt(String(vehicleYear), 10) : null;
      vehicle = await prisma.vehicle.create({
        data: {
          clientId: client.id,
          make: vehicleMake || 'Vehículo',
          model: vehicleModel || 'General',
          year: !isNaN(cleanYear as any) ? cleanYear : null,
          licensePlate: cleanPlate || (vehicleId && !vehicleId.startsWith('VEH-') ? vehicleId : 'S/P'),
          color: vehicleColor || null,
        },
      });
    }

    // Atomic transaction with retry loop: Guarantees zero race conditions on orderNumber
    let order: any = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        order = await prisma.$transaction(async (tx) => {
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

          const createdOrder = await tx.workOrder.create({
            data: {
              workshopId,
              clientId: client.id,
              vehicleId: vehicle.id,
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

          // If created directly in READY or DELIVERED, automatically deduct parts from inventory & log Kardex
          if (['READY', 'DELIVERED'].includes(status) && items && items.length > 0) {
            for (const it of items) {
              if (it.type === 'PART' || it.inventoryItemId) {
                let invItem = null;
                if (it.inventoryItemId) {
                  invItem = await tx.inventoryItem.findFirst({
                    where: { id: it.inventoryItemId, workshopId },
                  });
                }
                if (!invItem && it.description) {
                  invItem = await tx.inventoryItem.findFirst({
                    where: { workshopId, name: { equals: it.description.trim(), mode: 'insensitive' } },
                  });
                }

                if (invItem) {
                  const qty = parseFloat(String(it.quantity || 1));
                  const prevStock = invItem.currentStock;
                  const newStock = prevStock - qty;

                  await tx.inventoryItem.update({
                    where: { id: invItem.id },
                    data: { currentStock: newStock },
                  });

                  await tx.inventoryMovement.create({
                    data: {
                      workshopId,
                      itemId: invItem.id,
                      type: 'OUT_ORDER',
                      quantity: qty,
                      previousStock: prevStock,
                      newStock: newStock,
                      costPriceUSD: invItem.costPriceAnchor,
                      workOrderId: createdOrder.id,
                      reason: `Deducción por orden de trabajo #${orderNumber}`,
                      registeredById: userId,
                    },
                  });
                }
              }
            }
          }

          return createdOrder;
        });

        // Succeeded
        break;
      } catch (err: any) {
        if (err?.code === 'P2002' && attempts < maxAttempts) {
          console.warn(`Conflicto de concurrencia en orderNumber para taller ${workshopId}, reintentando intento ${attempts}...`);
          continue;
        }
        throw err;
      }
    }

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

    const { status, notes, inspectionNotes, totalAnchor, deliveredAt, completedAt, items } = parseResult.data;

    const updated = await prisma.$transaction(async (tx) => {
      // If items provided, synchronize items in DB
      if (items !== undefined) {
        await tx.workOrderItem.deleteMany({
          where: { workOrderId: existing.id },
        });

        if (items.length > 0) {
          await tx.workOrderItem.createMany({
            data: items.map((item) => ({
              workOrderId: existing.id,
              type: item.type,
              description: item.description.trim(),
              quantity: parseFloat(String(item.quantity)),
              unitPriceAnchor: parseFloat(String(item.unitPriceAnchor)),
              inventoryItemId: item.inventoryItemId || null,
            })),
          });
        }
      }

      // If transitioning to DELIVERED and wasn't delivered before, automatically set deliveredAt
      let autoDeliveredAt: Date | undefined = undefined;
      if (status === 'DELIVERED' && !existing.deliveredAt) {
        autoDeliveredAt = deliveredAt ? new Date(deliveredAt) : new Date();
      }

      let autoCompletedAt: Date | undefined = undefined;
      if (status === 'READY' && !existing.completedAt) {
        autoCompletedAt = completedAt ? new Date(completedAt) : new Date();
      }

      const currentItems = items !== undefined ? items : (existing.items || []);
      const itemsSum = currentItems.reduce((acc, it) => acc + (parseFloat(String(it.unitPriceAnchor || 0)) * parseFloat(String(it.quantity || 1))), 0);

      let finalTotalAnchor: number | undefined = undefined;
      if (totalAnchor !== undefined) {
        const parsed = parseFloat(String(totalAnchor));
        if (itemsSum > 0 && (parsed <= 0 || (parsed < 1 && itemsSum >= 1))) {
          finalTotalAnchor = itemsSum;
        } else {
          finalTotalAnchor = parsed;
        }
      } else if (items !== undefined && itemsSum > 0) {
        finalTotalAnchor = itemsSum;
      }

      // Check if transitioning to READY or DELIVERED and stock has not been deducted yet
      const nextStatus = status || existing.status;
      if (['READY', 'DELIVERED'].includes(nextStatus)) {
        const existingMovements = await tx.inventoryMovement.findFirst({
          where: { workOrderId: existing.id, type: 'OUT_ORDER' },
        });

        if (!existingMovements && currentItems && currentItems.length > 0) {
          for (const it of currentItems) {
            if (it.type === 'PART' || it.inventoryItemId) {
              let invItem = null;
              if (it.inventoryItemId) {
                invItem = await tx.inventoryItem.findFirst({
                  where: { id: it.inventoryItemId, workshopId },
                });
              }
              if (!invItem && it.description) {
                invItem = await tx.inventoryItem.findFirst({
                  where: { workshopId, name: { equals: it.description.trim(), mode: 'insensitive' } },
                });
              }

              if (invItem) {
                const qty = it.quantity;
                const prevStock = invItem.currentStock;
                const newStock = prevStock - qty;

                await tx.inventoryItem.update({
                  where: { id: invItem.id },
                  data: { currentStock: newStock },
                });

                await tx.inventoryMovement.create({
                  data: {
                    workshopId,
                    itemId: invItem.id,
                    type: 'OUT_ORDER',
                    quantity: qty,
                    previousStock: prevStock,
                    newStock: newStock,
                    costPriceUSD: invItem.costPriceAnchor,
                    workOrderId: existing.id,
                    reason: `Consumo automático por orden de trabajo #${existing.orderNumber}`,
                    registeredById: req.userId,
                  },
                });
              }
            }
          }
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

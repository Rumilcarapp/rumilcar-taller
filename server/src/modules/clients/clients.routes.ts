import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireWorkshop, requireRole, AuthRequest, logSecurityEvent } from '../../middleware/auth';

export const clientsRouter = Router();

// Apply authentication and workshop requirement to all client routes
clientsRouter.use(authenticate);
clientsRouter.use(requireWorkshop);

// Zod schemas for input validation
const createClientSchema = z.object({
  name: z.string().min(2, 'El nombre del cliente es obligatorio y debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(), // RIF o Cédula (V-12345678, J-12345678-9, etc.)
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateClientSchema = createClientSchema.partial();

// GET /api/clients - Get all clients belonging exclusively to this workshop
clientsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const search = req.query.search as string | undefined;

    const clients = await prisma.client.findMany({
      where: {
        workshopId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { taxId: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        vehicles: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(clients);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Error al consultar clientes del taller' });
  }
});

// GET /api/clients/:id - Get a single client with ownership check
clientsRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const client = await prisma.client.findFirst({
      where: { id, workshopId },
      include: {
        vehicles: true,
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Cliente no encontrado en este taller' });
      return;
    }

    res.json(client);
  } catch (error: any) {
    console.error('Error fetching client by id:', error);
    res.status(500).json({ error: 'Error al consultar detalles del cliente' });
  }
});

// POST /api/clients - Create a client securely scoped to authenticated workshop
clientsRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const parseResult = createClientSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { name, email, phone, taxId, address, notes } = parseResult.data;

    // Check for duplicate taxId (RIF/CI) within this workshop
    if (taxId && taxId.trim() !== '') {
      const existing = await prisma.client.findFirst({
        where: {
          workshopId,
          taxId: taxId.trim(),
        },
      });

      if (existing) {
        res.status(400).json({
          error: `Ya existe un cliente registrado con el documento ${taxId} en este taller (${existing.name}).`,
        });
        return;
      }
    }

    const client = await prisma.client.create({
      data: {
        workshopId,
        name: name.trim(),
        email: email && email.trim() !== '' ? email.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        taxId: taxId ? taxId.trim().toUpperCase() : null,
        address: address ? address.trim() : null,
        notes: notes ? notes.trim() : null,
      },
    });

    logSecurityEvent({
      action: 'CREATE_CLIENT',
      workshopId,
      userId: req.userId,
      details: `Cliente creado: ${client.name} (ID: ${client.id})`,
    });

    res.status(201).json(client);
  } catch (error: any) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Error al registrar el cliente' });
  }
});

// PUT /api/clients/:id - Update client with strict ownership check
clientsRouter.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const parseResult = updateClientSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    // Verify client exists and belongs to this workshop
    const existing = await prisma.client.findFirst({
      where: { id, workshopId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Cliente no encontrado en tu taller' });
      return;
    }

    const data = parseResult.data;

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        email: data.email !== undefined ? (data.email ? data.email.trim().toLowerCase() : null) : undefined,
        phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
        taxId: data.taxId !== undefined ? (data.taxId ? data.taxId.trim().toUpperCase() : null) : undefined,
        address: data.address !== undefined ? (data.address ? data.address.trim() : null) : undefined,
        notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : undefined,
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Error al actualizar información del cliente' });
  }
});

// DELETE /api/clients/:id - Delete client (requires OWNER or ADMIN role)
clientsRouter.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const existing = await prisma.client.findFirst({
      where: { id, workshopId },
      include: {
        _count: {
          select: { workOrders: true, vehicles: true },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Cliente no encontrado en tu taller' });
      return;
    }

    if (existing._count.workOrders > 0) {
      res.status(400).json({
        error: `No se puede eliminar el cliente porque posee ${existing._count.workOrders} orden(es) de trabajo registradas. Puedes archivar o editar sus datos.`,
      });
      return;
    }

    await prisma.client.delete({ where: { id } });

    logSecurityEvent({
      action: 'DELETE_CLIENT',
      workshopId,
      userId: req.userId,
      details: `Cliente eliminado: ${existing.name} (ID: ${id})`,
    });

    res.json({ success: true, message: 'Cliente eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Error al eliminar el cliente' });
  }
});

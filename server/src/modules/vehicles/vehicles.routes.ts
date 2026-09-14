import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireWorkshop, requireRole, AuthRequest, logSecurityEvent } from '../../middleware/auth';

export const vehiclesRouter = Router();

// Apply authentication and workshop requirement to all vehicle routes
vehiclesRouter.use(authenticate);
vehiclesRouter.use(requireWorkshop);

// Zod schemas for input validation
const createVehicleSchema = z.object({
  clientId: z.string().min(1, 'El cliente propietario es obligatorio'),
  make: z.string().min(1, 'La marca del vehículo es requerida'),
  model: z.string().min(1, 'El modelo del vehículo es requerido'),
  year: z.union([z.number(), z.string()]).optional().nullable(),
  licensePlate: z.string().min(1, 'La placa o matrícula es obligatoria'),
  vin: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  mileage: z.union([z.number(), z.string()]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateVehicleSchema = createVehicleSchema.partial();

// GET /api/vehicles - Get vehicles belonging strictly to the authenticated workshop's clients
vehiclesRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const clientId = req.query.clientId as string | undefined;
    const search = req.query.search as string | undefined;

    const vehicles = await prisma.vehicle.findMany({
      where: {
        client: { workshopId },
        ...(clientId ? { clientId } : {}),
        ...(search
          ? {
              OR: [
                { licensePlate: { contains: search, mode: 'insensitive' } },
                { make: { contains: search, mode: 'insensitive' } },
                { model: { contains: search, mode: 'insensitive' } },
                { vin: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        client: {
          select: { id: true, name: true, phone: true, taxId: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(vehicles);
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Error al consultar vehículos del taller' });
  }
});

// GET /api/vehicles/:id - Get a single vehicle verifying workshop tenancy
vehiclesRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        client: { workshopId },
      },
      include: {
        client: true,
        workOrders: {
          where: { workshopId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vehicle) {
      res.status(404).json({ error: 'Vehículo no encontrado en tu taller' });
      return;
    }

    res.json(vehicle);
  } catch (error: any) {
    console.error('Error fetching vehicle by id:', error);
    res.status(500).json({ error: 'Error al consultar el vehículo' });
  }
});

// POST /api/vehicles - Create a vehicle ensuring client belongs to authenticated workshop
vehiclesRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const parseResult = createVehicleSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { clientId, make, model, year, licensePlate, vin, color, mileage, notes } = parseResult.data;
    const cleanPlate = licensePlate.trim().toUpperCase().replace(/\s+/g, '');

    // Validate that the target client exists and belongs to this workshop
    const client = await prisma.client.findFirst({
      where: { id: clientId, workshopId },
    });

    if (!client) {
      res.status(400).json({ error: 'El cliente asignado no pertenece a tu taller' });
      return;
    }

    // Check if license plate is already registered in this workshop
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        client: { workshopId },
        licensePlate: cleanPlate,
      },
      include: { client: true },
    });

    if (existingVehicle) {
      res.status(400).json({
        error: `El vehículo con placa ${cleanPlate} ya está registrado en tu taller asociado a ${existingVehicle.client.name}.`,
      });
      return;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        clientId: client.id,
        make: make.trim(),
        model: model.trim(),
        year: year ? parseInt(String(year), 10) : null,
        licensePlate: cleanPlate,
        vin: vin ? vin.trim().toUpperCase() : null,
        color: color ? color.trim() : null,
        mileage: mileage ? parseInt(String(mileage), 10) : null,
        notes: notes ? notes.trim() : null,
      },
      include: { client: true },
    });

    logSecurityEvent({
      action: 'CREATE_VEHICLE',
      workshopId,
      userId: req.userId,
      details: `Vehículo registrado: ${vehicle.make} ${vehicle.model} - Placa: ${cleanPlate}`,
    });

    res.status(201).json(vehicle);
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: 'Error al registrar el vehículo' });
  }
});

// PUT /api/vehicles/:id - Update vehicle with strict ownership check
vehiclesRouter.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const parseResult = updateVehicleSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    // Verify vehicle belongs to this workshop's clients
    const existing = await prisma.vehicle.findFirst({
      where: { id, client: { workshopId } },
    });

    if (!existing) {
      res.status(404).json({ error: 'Vehículo no encontrado en tu taller' });
      return;
    }

    const data = parseResult.data;

    // If changing clientId, verify new client belongs to this workshop
    if (data.clientId && data.clientId !== existing.clientId) {
      const newClient = await prisma.client.findFirst({
        where: { id: data.clientId, workshopId },
      });
      if (!newClient) {
        res.status(400).json({ error: 'El nuevo cliente asignado no pertenece a tu taller' });
        return;
      }
    }

    const cleanPlate = data.licensePlate ? data.licensePlate.trim().toUpperCase().replace(/\s+/g, '') : undefined;

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        clientId: data.clientId,
        make: data.make !== undefined ? data.make.trim() : undefined,
        model: data.model !== undefined ? data.model.trim() : undefined,
        year: data.year !== undefined ? (data.year ? parseInt(String(data.year), 10) : null) : undefined,
        licensePlate: cleanPlate,
        vin: data.vin !== undefined ? (data.vin ? data.vin.trim().toUpperCase() : null) : undefined,
        color: data.color !== undefined ? (data.color ? data.color.trim() : null) : undefined,
        mileage: data.mileage !== undefined ? (data.mileage ? parseInt(String(data.mileage), 10) : null) : undefined,
        notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : undefined,
      },
      include: { client: true },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Error al actualizar información del vehículo' });
  }
});

// DELETE /api/vehicles/:id - Delete vehicle (requires OWNER or ADMIN role)
vehiclesRouter.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const existing = await prisma.vehicle.findFirst({
      where: { id, client: { workshopId } },
      include: {
        _count: { select: { workOrders: true, appointments: true } },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Vehículo no encontrado en tu taller' });
      return;
    }

    if (existing._count.workOrders > 0) {
      res.status(400).json({
        error: `No se puede eliminar el vehículo porque posee ${existing._count.workOrders} orden(es) de trabajo asociadas.`,
      });
      return;
    }

    await prisma.vehicle.delete({ where: { id } });

    logSecurityEvent({
      action: 'DELETE_VEHICLE',
      workshopId,
      userId: req.userId,
      details: `Vehículo eliminado: ${existing.make} ${existing.model} - ${existing.licensePlate}`,
    });

    res.json({ success: true, message: 'Vehículo eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Error al eliminar el vehículo' });
  }
});

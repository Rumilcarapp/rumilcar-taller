import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireWorkshop, requireRole, AuthRequest, logSecurityEvent } from '../../middleware/auth';

export const appointmentsRouter = Router();

// Apply authentication and workshop requirement
appointmentsRouter.use(authenticate);
appointmentsRouter.use(requireWorkshop);

const createAppointmentSchema = z.object({
  clientId: z.string().min(1, 'El cliente es requerido'),
  vehicleId: z.string().min(1, 'El vehículo es requerido'),
  mechanicId: z.string().optional().nullable(),
  startAt: z.string().datetime().or(z.string().min(10)),
  endAt: z.string().datetime().or(z.string().min(10)),
  modality: z.string().optional().default('TALLER'),
  serviceMotif: z.string().min(2, 'El motivo o servicio es requerido'),
  internalNotes: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional().default('PENDING'),
});

const updateAppointmentSchema = createAppointmentSchema.partial();

// GET /api/appointments - List all appointments for this workshop
appointmentsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const date = req.query.date as string | undefined;

    const appointments = await prisma.appointment.findMany({
      where: {
        workshopId,
        ...(date
          ? {
              startAt: {
                gte: new Date(`${date}T00:00:00.000Z`),
                lte: new Date(`${date}T23:59:59.999Z`),
              },
            }
          : {}),
      },
      include: {
        client: true,
        vehicle: true,
        mechanic: true,
      },
      orderBy: { startAt: 'asc' },
    });

    res.json(appointments);
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Error al consultar las citas del taller' });
  }
});

// POST /api/appointments - Create appointment securely scoped to workshop
appointmentsRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const parseResult = createAppointmentSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;

    // Verify client belongs to this workshop
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, workshopId },
    });
    if (!client) {
      res.status(400).json({ error: 'El cliente no pertenece a tu taller' });
      return;
    }

    // Verify vehicle belongs to client
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: data.vehicleId, clientId: client.id },
    });
    if (!vehicle) {
      res.status(400).json({ error: 'El vehículo no pertenece al cliente seleccionado' });
      return;
    }

    const appointment = await prisma.appointment.create({
      data: {
        workshopId,
        clientId: client.id,
        vehicleId: vehicle.id,
        mechanicId: data.mechanicId || null,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        modality: data.modality || 'TALLER',
        serviceMotif: data.serviceMotif.trim(),
        internalNotes: data.internalNotes ? data.internalNotes.trim() : null,
        status: data.status || 'PENDING',
      },
      include: {
        client: true,
        vehicle: true,
        mechanic: true,
      },
    });

    logSecurityEvent({
      action: 'CREATE_APPOINTMENT',
      workshopId,
      userId: req.userId,
      details: `Cita creada: ${appointment.serviceMotif} para cliente ${client.name}`,
    });

    res.status(201).json(appointment);
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Error al registrar la cita' });
  }
});

// PUT /api/appointments/:id - Update appointment
appointmentsRouter.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const parseResult = updateAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const existing = await prisma.appointment.findFirst({
      where: { id, workshopId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Cita no encontrada en tu taller' });
      return;
    }

    const data = parseResult.data;

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.clientId && { clientId: data.clientId }),
        ...(data.vehicleId && { vehicleId: data.vehicleId }),
        ...(data.mechanicId !== undefined && { mechanicId: data.mechanicId }),
        ...(data.startAt && { startAt: new Date(data.startAt) }),
        ...(data.endAt && { endAt: new Date(data.endAt) }),
        ...(data.modality && { modality: data.modality }),
        ...(data.serviceMotif && { serviceMotif: data.serviceMotif.trim() }),
        ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes ? data.internalNotes.trim() : null }),
        ...(data.status && { status: data.status }),
      },
      include: {
        client: true,
        vehicle: true,
        mechanic: true,
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Error al actualizar la cita' });
  }
});

// DELETE /api/appointments/:id - Delete appointment
appointmentsRouter.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId!;
    const id = req.params.id as string;

    const existing = await prisma.appointment.findFirst({
      where: { id, workshopId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Cita no encontrada en tu taller' });
      return;
    }

    await prisma.appointment.delete({ where: { id } });

    res.json({ success: true, message: 'Cita eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Error al eliminar la cita' });
  }
});

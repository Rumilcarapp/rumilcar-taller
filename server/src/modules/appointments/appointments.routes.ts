import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireWorkshop, requireRole, AuthRequest, logSecurityEvent } from '../../middleware/auth';

export const appointmentsRouter = Router();

// ==========================================
// PUBLIC APPOINTMENT CONFIRMATION ROUTES (No Auth Required)
// ==========================================

const publicConfirmSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.union([z.number(), z.string()]).optional().nullable(),
  licensePlate: z.string().optional(),
  color: z.string().optional().nullable(),
  clientNotes: z.string().optional().nullable(),
});

// GET /api/appointments/public/:id
appointmentsRouter.get('/public/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const rawId = (rawParam || '').trim();
    if (!rawId) {
      res.status(400).json({ error: 'Identificador de cita requerido' });
      return;
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        OR: [
          { id: rawId },
          { id: { startsWith: rawId, mode: 'insensitive' } },
        ],
      },
      include: {
        workshop: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            logoUrl: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            color: true,
          },
        },
      },
    });

    if (!appointment) {
      res.status(404).json({ error: 'Cita no encontrada o ha expirado' });
      return;
    }

    res.json(appointment);
  } catch (error: any) {
    console.error('Error fetching public appointment:', error);
    res.status(500).json({ error: 'Error al consultar la cita' });
  }
});

// POST /api/appointments/public/:id/confirm
appointmentsRouter.post('/public/:id/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const rawId = (rawParam || '').trim();
    if (!rawId) {
      res.status(400).json({ error: 'Identificador de cita requerido' });
      return;
    }

    const parseResult = publicConfirmSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;

    const appointment = await prisma.appointment.findFirst({
      where: {
        OR: [
          { id: rawId },
          { id: { startsWith: rawId, mode: 'insensitive' } },
        ],
      },
      include: {
        vehicle: true,
      },
    });

    if (!appointment) {
      res.status(404).json({ error: 'Cita no encontrada' });
      return;
    }

    // 1. Update vehicle details if provided
    if (appointment.vehicleId) {
      const vehicleUpdate: any = {};
      if (data.make && data.make.trim()) vehicleUpdate.make = data.make.trim();
      if (data.model && data.model.trim()) vehicleUpdate.model = data.model.trim();
      if (data.licensePlate && data.licensePlate.trim()) vehicleUpdate.licensePlate = data.licensePlate.trim().toUpperCase();
      if (data.color && data.color.trim()) vehicleUpdate.color = data.color.trim();
      if (data.year) {
        const parsedYear = parseInt(String(data.year), 10);
        if (!isNaN(parsedYear) && parsedYear >= 1950 && parsedYear <= 2030) {
          vehicleUpdate.year = parsedYear;
        }
      }

      if (Object.keys(vehicleUpdate).length > 0) {
        await prisma.vehicle.update({
          where: { id: appointment.vehicleId },
          data: vehicleUpdate,
        });
      }
    }

    // 2. Append client notes if any
    let updatedInternalNotes = appointment.internalNotes || '';
    if (data.clientNotes && data.clientNotes.trim()) {
      const clientNoteTag = `[Cliente al confirmar]: ${data.clientNotes.trim()}`;
      updatedInternalNotes = updatedInternalNotes
        ? `${updatedInternalNotes}\n${clientNoteTag}`
        : clientNoteTag;
    }

    // 3. Mark appointment as CONFIRMED
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CONFIRMED',
        internalNotes: updatedInternalNotes || null,
      },
      include: {
        workshop: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            logoUrl: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            color: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Cita confirmada exitosamente',
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    console.error('Error confirming appointment:', error);
    res.status(500).json({ error: 'Error al confirmar la cita' });
  }
});

// Apply authentication and workshop requirement for workshop routes
appointmentsRouter.use(authenticate);
appointmentsRouter.use(requireWorkshop);

const createAppointmentSchema = z.object({
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  clientPhone: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  vehicleDesc: z.string().optional().nullable(),
  mechanicId: z.string().optional().nullable(),
  startAt: z.string().datetime().or(z.string().min(10)),
  endAt: z.string().datetime().or(z.string().min(10)),
  modality: z.string().optional().default('TALLER'),
  serviceMotif: z.string().min(1, 'El motivo o servicio es requerido'),
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

    // 1. Resolve or create client
    let client = null;
    if (data.clientId) {
      client = await prisma.client.findFirst({
        where: { id: data.clientId, workshopId },
      });
    }
    if (!client && data.clientName && data.clientName.trim()) {
      const cleanName = data.clientName.trim();
      client = await prisma.client.findFirst({
        where: {
          workshopId,
          name: { equals: cleanName, mode: 'insensitive' },
        },
      });
      if (!client) {
        client = await prisma.client.create({
          data: {
            workshopId,
            name: cleanName,
            phone: data.clientPhone ? data.clientPhone.trim() : null,
          },
        });
      }
    }
    if (!client) {
      client = await prisma.client.findFirst({ where: { workshopId } });
      if (!client) {
        client = await prisma.client.create({
          data: {
            workshopId,
            name: data.clientName?.trim() || 'Cliente General',
            phone: data.clientPhone?.trim() || null,
          },
        });
      }
    }

    // 2. Resolve or create vehicle
    let vehicle = null;
    if (data.vehicleId) {
      vehicle = await prisma.vehicle.findFirst({
        where: { id: data.vehicleId },
      });
    }
    if (!vehicle && data.vehicleDesc && data.vehicleDesc.trim()) {
      const parts = data.vehicleDesc.split('-');
      const plate = parts.length > 1 ? parts[parts.length - 1].trim().toUpperCase() : '';
      const makeModel = parts[0].trim().split(' ');
      const make = makeModel[0] || 'Vehículo';
      const model = makeModel.slice(1).join(' ') || 'General';

      if (plate) {
        vehicle = await prisma.vehicle.findFirst({
          where: {
            clientId: client.id,
            licensePlate: { equals: plate, mode: 'insensitive' },
          },
        });
      }
      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            clientId: client.id,
            make,
            model,
            licensePlate: plate || 'PENDIENTE',
          },
        });
      }
    }
    if (!vehicle) {
      vehicle = await prisma.vehicle.findFirst({
        where: { clientId: client.id },
      });
      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            clientId: client.id,
            make: 'Vehículo',
            model: 'General',
            licensePlate: 'PENDIENTE',
          },
        });
      }
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

    // Update vehicle info if vehicleDesc was edited
    if (data.vehicleDesc && existing.vehicleId) {
      const parts = data.vehicleDesc.split('-');
      const plate = parts.length > 1 ? parts[parts.length - 1].trim().toUpperCase() : '';
      const makeModel = parts[0].trim().split(' ');
      const make = makeModel[0] || 'Vehículo';
      const model = makeModel.slice(1).join(' ') || 'General';

      await prisma.vehicle.update({
        where: { id: existing.vehicleId },
        data: {
          make,
          model,
          ...(plate ? { licensePlate: plate } : {}),
        },
      }).catch(() => {});
    }

    // Update client info if clientName or clientPhone was edited
    if (existing.clientId && (data.clientName || data.clientPhone)) {
      await prisma.client.update({
        where: { id: existing.clientId },
        data: {
          ...(data.clientName ? { name: data.clientName.trim() } : {}),
          ...(data.clientPhone ? { phone: data.clientPhone.trim() } : {}),
        },
      }).catch(() => {});
    }

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

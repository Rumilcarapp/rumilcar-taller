import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { authenticate, requireWorkshop, requireRole, AuthRequest } from '../../middleware/auth';
import { z } from 'zod';

export const workshopRouter = Router();
workshopRouter.use(authenticate);
workshopRouter.use(requireWorkshop);

const updateWorkshopSchema = z.object({
  name: z.string().trim().min(2).optional(),
  legalName: z.string().trim().optional().nullable(),
  taxId: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().email().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  anchorCurrency: z.enum(['USD', 'VES']).optional(),
  usdtSpread: z.number().or(z.string()).optional(),
  autoExchangeRate: z.boolean().optional(),
  ownerName: z.string().trim().optional(),
});

// GET /api/workshop — Get workshop profile
workshopRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: req.workshopId },
      include: {
        paymentMethods: true,
        mechanics: { orderBy: { name: 'asc' } },
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    if (!workshop) {
      res.status(404).json({ error: 'Taller no encontrado' });
      return;
    }

    const owner = workshop.users?.find((u) => u.role === 'OWNER') || workshop.users?.[0];

    res.json({
      ...workshop,
      ownerName: owner?.name || '',
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el perfil del taller' });
  }
});

// PUT /api/workshop — Update workshop profile (OWNER or ADMIN only)
workshopRouter.put('/', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = updateWorkshopSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Datos de taller inválidos', details: parseResult.error.format() });
      return;
    }

    const data = parseResult.data;

    if (data.ownerName) {
      await prisma.user.updateMany({
        where: { workshopId: req.workshopId!, role: 'OWNER' },
        data: { name: data.ownerName },
      });
    }

    const workshop = await prisma.workshop.update({
      where: { id: req.workshopId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.legalName !== undefined && { legalName: data.legalName }),
        ...(data.taxId !== undefined && { taxId: data.taxId }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.anchorCurrency !== undefined && { anchorCurrency: data.anchorCurrency }),
        ...(data.usdtSpread !== undefined && { usdtSpread: parseFloat(String(data.usdtSpread)) }),
        ...(data.autoExchangeRate !== undefined && { autoExchangeRate: data.autoExchangeRate }),
      },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const owner = workshop.users?.find((u) => u.role === 'OWNER') || workshop.users?.[0];

    res.json({
      ...workshop,
      ownerName: owner?.name || '',
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

// PUT /api/workshop/payment-methods — Update payment methods (OWNER or ADMIN only)
workshopRouter.put('/payment-methods', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { methods } = req.body; // Array of { method: string, isEnabled: boolean }
    if (!Array.isArray(methods)) {
      res.status(400).json({ error: 'Se esperaba un arreglo de métodos de pago' });
      return;
    }
    for (const m of methods) {
      if (!m.method) continue;
      await prisma.workshopPaymentMethod.upsert({
        where: {
          workshopId_method: {
            workshopId: req.workshopId!,
            method: m.method,
          },
        },
        update: { isEnabled: Boolean(m.isEnabled) },
        create: {
          workshopId: req.workshopId!,
          method: m.method,
          isEnabled: Boolean(m.isEnabled),
        },
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar metodos de pago' });
  }
});

// ==========================================
// Workshop Sub-accounts / Staff Management
// ==========================================

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().trim().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['ADMIN', 'RECEPTIONIST', 'MECHANIC', 'CASHIER', 'INVENTORY', 'OWNER']).default('RECEPTIONIST'),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.enum(['ADMIN', 'RECEPTIONIST', 'MECHANIC', 'CASHIER', 'INVENTORY', 'OWNER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

// GET /api/workshop/users — List all staff accounts for current workshop
workshopRouter.get('/users', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { 
        workshopId: req.workshopId!,
        role: { not: 'SUPERADMIN' }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios del taller' });
  }
});

// POST /api/workshop/users — Create a new sub-account with email and password
workshopRouter.post('/users', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Datos de usuario inválidos' });
      return;
    }

    const { name, email, password, role, isActive } = parseResult.data;
    const cleanEmail = email.trim().toLowerCase();

    // Prevent creating SUPERADMIN roles
    if ((role as string) === 'SUPERADMIN') {
      res.status(403).json({ error: 'No está permitido crear cuentas de Superadministrador SaaS.' });
      return;
    }

    // Check if email already registered in system
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      res.status(400).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        workshopId: req.workshopId!,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role,
        isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error al crear usuario del taller:', error);
    res.status(500).json({ error: 'Error al crear la cuenta del usuario en el taller' });
  }
});

// PUT /api/workshop/users/:id — Update a sub-account or reset password
workshopRouter.put('/users/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Datos inválidos' });
      return;
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, workshopId: req.workshopId! },
    });
    if (!targetUser) {
      res.status(404).json({ error: 'Usuario no encontrado en este taller' });
      return;
    }

    // Only OWNER can modify another OWNER account
    if (targetUser.role === 'OWNER' && req.userRole !== 'OWNER' && req.userId !== targetUser.id) {
      res.status(403).json({ error: 'Solo el dueño principal puede modificar la cuenta del dueño' });
      return;
    }

    const { name, role, isActive, password } = parseResult.data;
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (role && targetUser.role !== 'OWNER') updateData.role = role;
    if (isActive !== undefined && targetUser.role !== 'OWNER') updateData.isActive = isActive;
    if (password && password.trim()) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
      updateData.tokenVersion = { increment: 1 };
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar usuario del taller:', error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

// DELETE /api/workshop/users/:id — Remove or deactivate a sub-account
workshopRouter.delete('/users/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const targetUser = await prisma.user.findFirst({
      where: { id, workshopId: req.workshopId! },
    });
    if (!targetUser) {
      res.status(404).json({ error: 'Usuario no encontrado en este taller' });
      return;
    }

    if (targetUser.role === 'OWNER') {
      res.status(400).json({ error: 'No se puede eliminar la cuenta principal del dueño del taller' });
      return;
    }

    try {
      await prisma.user.delete({ where: { id } });
      res.json({ success: true, message: 'Usuario eliminado permanentemente' });
    } catch {
      // If user has related technical history/work orders, deactivate instead of hard delete
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({ success: true, deactivated: true, message: 'Usuario desactivado exitosamente (conservando historial técnico)' });
    }
  } catch (error) {
    console.error('Error al eliminar usuario del taller:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});
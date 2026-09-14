import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../config/jwt';
import { authRateLimiter, authenticate, AuthRequest, logSecurityEvent } from '../../middleware/auth';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  workshopName: z.string().min(2, 'El nombre del taller debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().min(1, 'El correo o usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

// POST /api/auth/register
authRouter.post('/register', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { name, email, password, workshopName, phone } = parseResult.data;
    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    });

    if (existing) {
      res.status(400).json({ error: 'Este correo electrónico ya se encuentra registrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create workshop + owner user in an isolated transaction
    const result = await prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.create({
        data: {
          name: workshopName.trim(),
          email: cleanEmail,
          phone: phone ? phone.trim() : null,
          paymentMethods: {
            createMany: {
              data: [
                { method: 'CASH_USD', isEnabled: true },
                { method: 'CASH_VES', isEnabled: true },
                { method: 'PAGO_MOVIL', isEnabled: true },
                { method: 'BANK_TRANSFER', isEnabled: true },
                { method: 'ZELLE', isEnabled: true },
                { method: 'USDT_WALLET', isEnabled: true },
                { method: 'POS_DEBIT', isEnabled: false },
              ],
            },
          },
        },
      });

      const user = await tx.user.create({
        data: {
          workshopId: workshop.id,
          name: name.trim(),
          email: cleanEmail,
          passwordHash,
          role: 'OWNER',
          isActive: true,
        },
      });

      // Initialize 15-Day Free Trial Subscription for new workshop
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      await tx.subscription.create({
        data: {
          workshopId: workshop.id,
          plan: 'TRIAL',
          status: 'TRIALING',
          trialStartedAt: now,
          trialEndsAt,
          billingCycle: 'MONTHLY',
          priceUSD: 0,
          maxMechanics: 3,
        },
      });

      return { workshop, user };
    });

    const token = jwt.sign(
      {
        userId: result.user.id,
        workshopId: result.workshop.id,
        role: result.user.role,
        name: result.user.name,
        email: result.user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logSecurityEvent({
      action: 'REGISTER_WORKSHOP',
      workshopId: result.workshop.id,
      userId: result.user.id,
      details: `Nuevo taller registrado: ${result.workshop.name} (${cleanEmail})`,
    });

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        workshopId: result.workshop.id,
        workshopName: result.workshop.name,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error al procesar el registro del taller' });
  }
});

// POST /api/auth/login
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email, password } = parseResult.data;
    const cleanEmail = email.trim().toLowerCase();

    // Standard database authentication with bcrypt check
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanEmail, mode: 'insensitive' } },
          { name: { equals: cleanEmail, mode: 'insensitive' } },
        ],
      },
      include: { workshop: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Este usuario se encuentra inactivo. Contacta al administrador.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logSecurityEvent({
        action: 'FAILED_LOGIN_ATTEMPT',
        workshopId: user.workshopId,
        userId: user.id,
        details: `Intento de acceso fallido para ${cleanEmail}`,
      });
      res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
      return;
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        workshopId: user.workshopId,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logSecurityEvent({
      action: 'SUCCESSFUL_LOGIN',
      workshopId: user.workshopId,
      userId: user.id,
      details: `Inicio de sesión exitoso como ${user.role}`,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workshopId: user.workshopId,
        workshopName: user.workshop?.name || 'Taller Rumilcar',
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error al procesar el inicio de sesión' });
  }
});

// GET /api/auth/me (Verify session and get fresh user details)
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { workshop: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workshopId: user.workshopId,
        workshopName: user.workshop?.name || 'Taller Rumilcar',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar perfil del usuario' });
  }
});

// POST /api/auth/change-password
authRouter.post('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { currentPassword, newPassword } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      res.status(400).json({ error: 'La contraseña actual no es correcta' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    logSecurityEvent({
      action: 'PASSWORD_CHANGED',
      workshopId: user.workshopId,
      userId: user.id,
      details: 'Contraseña actualizada satisfactoriamente',
    });

    res.json({ success: true, message: 'Contraseña actualizada con éxito' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});
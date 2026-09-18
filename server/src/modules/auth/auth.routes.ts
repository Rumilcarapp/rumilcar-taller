import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../config/jwt';
import {
  authRateLimiter,
  forgotPasswordRateLimiter,
  verifyOtpRateLimiter,
  authenticate,
  AuthRequest,
  logSecurityEvent,
} from '../../middleware/auth';
import { emailService } from '../../services/email/email.service';

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
        tokenVersion: result.user.tokenVersion,
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
        tokenVersion: user.tokenVersion,
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
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Error al obtener datos del usuario' });
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

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      res.status(400).json({ error: 'La contraseña actual no es correcta' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 }, // Revoke old sessions
      },
    });

    logSecurityEvent({
      action: 'CHANGE_PASSWORD',
      workshopId: user.workshopId,
      userId: user.id,
      details: 'Contraseña cambiada exitosamente. Sesiones previas revocadas.',
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// ==========================================
// ENTERPRISE EMAIL PASSWORD RECOVERY (GMAIL SMTP)
// ==========================================

const RESET_TOKEN_PEPPER = process.env.JWT_SECRET || 'rumilcar_reset_pepper_2026';

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(`${token}:${RESET_TOKEN_PEPPER}`).digest('hex');
}

// Validation schemas
const forgotPasswordRequestSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido').optional(),
  emailOrPhone: z.string().optional(),
}).refine(data => Boolean(data.email || data.emailOrPhone), {
  message: 'El correo electrónico es requerido',
  path: ['email'],
});

const verifyResetTokenSchema = z.object({
  token: z.string().min(10, 'Token de recuperación inválido'),
});

const forgotPasswordResetSchema = z.object({
  token: z.string().min(10, 'Token de recuperación inválido').optional(),
  resetToken: z.string().min(10, 'Token de recuperación inválido').optional(),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
}).refine(data => Boolean(data.token || data.resetToken), {
  message: 'El token de recuperación es requerido',
  path: ['token'],
});

const GENERIC_RECOVERY_MESSAGE =
  'Si el correo electrónico ingresado coincide con una cuenta activa, recibirás un enlace seguro para restablecer tu contraseña. Por favor revisa tu bandeja de entrada y la carpeta de spam o correo no deseado.';

/**
 * POST /api/auth/forgot-password/request
 * Initiates password reset by email. Returns generic message regardless of user existence (Anti-enumeration).
 */
authRouter.post('/forgot-password/request', forgotPasswordRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = forgotPasswordRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const rawEmail = parseResult.data.email || parseResult.data.emailOrPhone || '';
    const cleanEmail = rawEmail.trim().toLowerCase();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({ error: 'Por favor ingresa una dirección de correo electrónico válida' });
      return;
    }

    // Lookup user in database
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        isActive: true,
      },
      include: { workshop: true },
    });

    // Anti-enumeration: if user not found, return generic message without revealing existence
    if (!user) {
      res.json({
        success: true,
        message: GENERIC_RECOVERY_MESSAGE,
        expiresInSeconds: 900,
      });
      return;
    }

    // Cooldown check (60 seconds)
    const cooldownSeconds = parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_SECONDS || '60', 10);
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - cooldownSeconds * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentToken) {
      const remainingSeconds = Math.ceil(
        (recentToken.createdAt.getTime() + cooldownSeconds * 1000 - Date.now()) / 1000
      );
      res.status(429).json({
        error: `Por favor espera ${remainingSeconds} segundos antes de solicitar otro enlace de recuperación.`,
        canResendAt: new Date(recentToken.createdAt.getTime() + cooldownSeconds * 1000).toISOString(),
      });
      return;
    }

    // Invalidate previous unconsumed reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    // Generate secure 32-byte cryptographic token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashResetToken(rawToken);
    const expiresInMinutes = parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES || '15', 10);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Build reset link using frontend base URL
    const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const resetUrl = `${frontendBaseUrl}/restablecer-contrasena?token=${rawToken}`;

    // Dispatch recovery email via Gmail SMTP
    const sendResult = await emailService.sendPasswordResetEmail(
      user.email,
      resetUrl,
      expiresInMinutes,
      user.name
    );

    // Save token record in database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        workshopId: user.workshopId,
        otpHash: resetTokenHash,
        resetTokenHash,
        expiresAt,
        requestIp: (req.ip || req.socket.remoteAddress || '').slice(0, 45),
        userAgent: (req.headers['user-agent'] || '').slice(0, 255),
        provider: emailService.getProviderName(),
        providerMessageId: sendResult.messageId || null,
        deliveryStatus: sendResult.success ? 'SENT' : 'FAILED',
      },
    });

    if (!sendResult.success) {
      logSecurityEvent({
        action: 'PASSWORD_RESET_EMAIL_FAILED',
        workshopId: user.workshopId,
        userId: user.id,
        details: `Fallo al despachar correo a ${user.email}: ${sendResult.error}`,
        ip: req.ip,
      });

      if (!emailService.isConfigured()) {
        res.status(503).json({
          error: 'El servicio de correo electrónico no está configurado en el servidor.',
          details: sendResult.error,
        });
        return;
      }

      res.status(500).json({
        error: 'Hubo un error al enviar el correo de recuperación. Por favor intenta de nuevo.',
        details: sendResult.error,
      });
      return;
    }

    logSecurityEvent({
      action: 'PASSWORD_RESET_EMAIL_SENT',
      workshopId: user.workshopId,
      userId: user.id,
      details: `Enlace de restablecimiento de contraseña enviado a ${user.email}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: GENERIC_RECOVERY_MESSAGE,
      expiresInSeconds: expiresInMinutes * 60,
    });
  } catch (error: any) {
    console.error('Error in forgot-password/request:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud de recuperación' });
  }
});

/**
 * POST /api/auth/forgot-password/verify-token
 * Validates if a reset token is still active and unconsumed before showing the form.
 */
authRouter.post('/forgot-password/verify-token', verifyOtpRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = verifyResetTokenSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ valid: false, error: parseResult.error.errors[0].message });
      return;
    }

    const { token } = parseResult.data;
    const tokenHash = hashResetToken(token.trim());

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        resetTokenHash: tokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!tokenRecord) {
      res.status(400).json({
        valid: false,
        error: 'El enlace de recuperación es inválido, ya fue utilizado o ha expirado.',
      });
      return;
    }

    res.json({
      valid: true,
      email: tokenRecord.user.email,
      name: tokenRecord.user.name,
      expiresAt: tokenRecord.expiresAt,
    });
  } catch (error: any) {
    console.error('Error in forgot-password/verify-token:', error);
    res.status(500).json({ valid: false, error: 'Error al verificar el token' });
  }
});

/**
 * POST /api/auth/forgot-password/reset
 * Resets user password using the verified token.
 * Globally revokes all existing JWT sessions by incrementing User.tokenVersion.
 */
authRouter.post('/forgot-password/reset', forgotPasswordRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = forgotPasswordResetSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const rawToken = (parseResult.data.token || parseResult.data.resetToken)!.trim();
    const { newPassword } = parseResult.data;
    const resetTokenHash = hashResetToken(rawToken);

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        resetTokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true, workshop: true },
    });

    if (!tokenRecord) {
      res.status(400).json({
        error: 'El enlace de recuperación es inválido, ya fue utilizado o ha expirado. Solicita un nuevo enlace.',
      });
      return;
    }

    if (!tokenRecord.user || !tokenRecord.user.isActive) {
      res.status(400).json({
        error: 'El usuario asociado a este enlace ya no se encuentra activo.',
      });
      return;
    }

    // Hash new password securely with bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Atomic transaction:
    // 1. Update password & increment tokenVersion (revoking all active JWT sessions)
    // 2. Consume reset token
    // 3. Create security audit log
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      });

      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { consumedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          workshopId: tokenRecord.workshopId,
          userId: tokenRecord.userId,
          action: 'PASSWORD_RESET_SUCCESS',
          entity: 'SECURITY_AUTH',
          details: `Contraseña restablecida exitosamente para ${tokenRecord.user.email} vía correo Gmail. Sesiones activas revocadas.`,
          ipAddress: (req.ip || req.socket.remoteAddress || '').slice(0, 45),
        },
      });
    });

    logSecurityEvent({
      action: 'PASSWORD_RESET_COMPLETED',
      workshopId: tokenRecord.workshopId,
      userId: tokenRecord.userId,
      details: `Contraseña restablecida exitosamente para ${tokenRecord.user.email}`,
      ip: req.ip,
    });

    // Send confirmation email asynchronously
    emailService
      .sendPasswordChangedConfirmation(tokenRecord.user.email, tokenRecord.user.name)
      .catch((err) => console.error('[EMAIL] Failed to send password changed confirmation:', err));

    res.json({
      success: true,
      message:
        '¡Tu contraseña ha sido restablecida exitosamente! Todas las sesiones anteriores han sido revocadas. Ya puedes iniciar sesión con tu nueva contraseña.',
    });
  } catch (error: any) {
    console.error('Error in forgot-password/reset:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});
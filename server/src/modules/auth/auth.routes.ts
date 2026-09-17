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
import { whatsappService, WhatsAppService } from '../../services/whatsapp/whatsapp.service';

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
// ENTERPRISE WHATSAPP PASSWORD RECOVERY
// ==========================================

const OTP_PEPPER = process.env.JWT_SECRET || 'rumilcar_otp_pepper_2026';

function hashSecret(val: string): string {
  return crypto.createHash('sha256').update(`${val}:${OTP_PEPPER}`).digest('hex');
}

// Schemas
const forgotPasswordRequestSchema = z.object({
  emailOrPhone: z.string().min(3, 'Ingresa tu correo o teléfono registrado'),
});

const forgotPasswordVerifySchema = z.object({
  emailOrPhone: z.string().min(3, 'Identificador requerido'),
  otp: z.string().length(6, 'El código de seguridad debe tener exactamente 6 dígitos'),
});

const forgotPasswordResetSchema = z.object({
  resetToken: z.string().min(20, 'Token de recuperación inválido'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

/**
 * Helper: Find user and strictly authorized phone from database
 */
async function findUserAndAuthorizedPhone(emailOrPhone: string) {
  const clean = emailOrPhone.trim().toLowerCase();
  const digitsOnly = clean.replace(/\D/g, '');

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: clean, mode: 'insensitive' } },
        ...(digitsOnly.length >= 7 ? [{ workshop: { phone: { contains: digitsOnly } } }] : []),
        { workshop: { email: { equals: clean, mode: 'insensitive' } } },
      ],
    },
    include: { workshop: true },
  });

  if (!user || !user.isActive) {
    return { user: null, phone: null, normPhone: null };
  }

  // The phone is obtained EXCLUSIVELY from the registered workshop phone
  const rawPhone = user.workshop?.phone;
  if (!rawPhone) {
    return { user, phone: null, normPhone: null };
  }

  const norm = WhatsAppService.normalizePhone(rawPhone);
  if (!norm.valid) {
    return { user, phone: rawPhone, normPhone: null };
  }

  return { user, phone: rawPhone, normPhone: norm };
}

/**
 * Core Request / Resend Handler with Anti-Enumeration & Official WhatsApp Dispatch
 */
async function handleOtpRequest(req: Request, res: Response, isResend: boolean = false): Promise<void> {
  const parseResult = forgotPasswordRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { emailOrPhone } = parseResult.data;
  const { user, normPhone } = await findUserAndAuthorizedPhone(emailOrPhone);

  const GENERIC_RESPONSE = {
    success: true,
    message: 'Si los datos corresponden a una cuenta válida, recibirás instrucciones de recuperación por el canal registrado.',
    phoneMasked: null as string | null,
    expiresInSeconds: 900,
    canResendAt: new Date(Date.now() + 60000).toISOString(),
  };

  // Anti-enumeration: If user does not exist or has no valid phone, return generic response
  if (!user || !normPhone) {
    res.json(GENERIC_RESPONSE);
    return;
  }

  // Check 60-second cooldown on active tokens
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      createdAt: { gt: new Date(Date.now() - 60000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentToken) {
    const remainingSeconds = Math.ceil((recentToken.createdAt.getTime() + 60000 - Date.now()) / 1000);
    res.status(429).json({
      error: `Por favor espera ${remainingSeconds} segundos antes de solicitar otro código.`,
      canResendAt: new Date(recentToken.createdAt.getTime() + 60000).toISOString(),
    });
    return;
  }

  // Invalidate previous pending tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  // Generate cryptographically secure 6-digit numeric OTP
  const otpNumber = crypto.randomInt(100000, 1000000);
  const otp = otpNumber.toString();
  const otpHash = hashSecret(otp);
  const phoneMasked = WhatsAppService.maskPhone(normPhone.e164);
  const expiresInMinutes = 15;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Dispatch message through official WhatsApp Service
  const sendResult = await whatsappService.sendOtp({
    phone: normPhone.e164,
    otp,
    expiresInMinutes,
    userName: user.name,
    workshopName: user.workshop?.name,
  });

  if (!sendResult.success) {
    // Record failed attempt in database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        workshopId: user.workshopId,
        phoneMasked,
        otpHash,
        expiresAt,
        requestIp: (req.ip || req.socket.remoteAddress || '').slice(0, 45),
        userAgent: (req.headers['user-agent'] || '').slice(0, 255),
        provider: sendResult.provider,
        providerMessageId: null,
        deliveryStatus: 'FAILED',
      },
    });

    logSecurityEvent({
      action: 'PASSWORD_RESET_WHATSAPP_FAILED',
      workshopId: user.workshopId,
      userId: user.id,
      details: `Fallo al enviar WhatsApp a ${normPhone.e164}: ${sendResult.error}`,
      ip: req.ip,
    });

    // Do NOT simulate success if provider failed
    res.status(503).json({
      error: 'El servicio de mensajería WhatsApp Business no está configurado o no se encuentra disponible.',
      details: sendResult.error,
    });
    return;
  }

  // Record successful dispatch in PostgreSQL
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      workshopId: user.workshopId,
      phoneMasked,
      otpHash,
      expiresAt,
      requestIp: (req.ip || req.socket.remoteAddress || '').slice(0, 45),
      userAgent: (req.headers['user-agent'] || '').slice(0, 255),
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId || null,
      deliveryStatus: sendResult.deliveryStatus,
    },
  });

  logSecurityEvent({
    action: isResend ? 'PASSWORD_RESET_OTP_RESENT' : 'PASSWORD_RESET_OTP_REQUESTED',
    workshopId: user.workshopId,
    userId: user.id,
    details: `Código OTP despachado vía ${sendResult.provider} a ${phoneMasked}`,
    ip: req.ip,
  });

  res.json({
    success: true,
    message: 'Si los datos corresponden a una cuenta válida, recibirás instrucciones por WhatsApp.',
    phoneMasked,
    expiresInSeconds: 900,
    canResendAt: new Date(Date.now() + 60000).toISOString(),
  });
}

// POST /api/auth/forgot-password/request
authRouter.post('/forgot-password/request', forgotPasswordRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    await handleOtpRequest(req, res, false);
  } catch (error: any) {
    console.error('Error in forgot-password/request:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud de recuperación' });
  }
});

// POST /api/auth/forgot-password/resend
authRouter.post('/forgot-password/resend', forgotPasswordRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    await handleOtpRequest(req, res, true);
  } catch (error: any) {
    console.error('Error in forgot-password/resend:', error);
    res.status(500).json({ error: 'Error al procesar el reenvío de código' });
  }
});

// POST /api/auth/forgot-password/verify
authRouter.post('/forgot-password/verify', verifyOtpRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = forgotPasswordVerifySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { emailOrPhone, otp } = parseResult.data;
    const { user } = await findUserAndAuthorizedPhone(emailOrPhone);

    if (!user) {
      res.status(400).json({ error: 'Código de verificación incorrecto o expirado.' });
      return;
    }

    // Find active token record for this user
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) {
      res.status(400).json({
        error: 'El código de seguridad ha expirado (válido por 15 minutos) o no existe una solicitud activa.',
      });
      return;
    }

    if (tokenRecord.attempts >= 5) {
      // Invalidate token
      await prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { consumedAt: new Date() },
      });
      res.status(429).json({
        error: 'Has superado el número máximo de intentos fallidos (5). Solicita un nuevo código de seguridad.',
      });
      return;
    }

    const inputHash = hashSecret(otp.trim());
    if (inputHash !== tokenRecord.otpHash) {
      const updated = await prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 5 - updated.attempts;
      res.status(400).json({
        error: `Código de verificación incorrecto. Intentos restantes: ${Math.max(0, remaining)}`,
      });
      return;
    }

    // OTP is valid! Issue short-lived one-time reset token (10 min TTL)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashSecret(resetToken);

    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: {
        resetTokenHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    logSecurityEvent({
      action: 'PASSWORD_RESET_OTP_VERIFIED',
      workshopId: tokenRecord.workshopId,
      userId: tokenRecord.userId,
      details: 'Código OTP verificado correctamente. Token de restablecimiento de un solo uso emitido.',
      ip: req.ip,
    });

    res.json({
      success: true,
      resetToken,
      expiresInSeconds: 600,
    });
  } catch (error: any) {
    console.error('Error in forgot-password/verify:', error);
    res.status(500).json({ error: 'Error al verificar el código de seguridad' });
  }
});

// POST /api/auth/forgot-password/reset
authRouter.post('/forgot-password/reset', forgotPasswordRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = forgotPasswordResetSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { resetToken, newPassword } = parseResult.data;
    const resetTokenHash = hashSecret(resetToken);

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        resetTokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!tokenRecord) {
      res.status(400).json({
        error: 'El token de recuperación es inválido, ya fue utilizado o ha expirado.',
      });
      return;
    }

    // Hash new password using bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Atomic transaction: update password, increment tokenVersion (revoking all sessions), consume reset token, create audit log
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
          details: `Contraseña restablecida exitosamente para ${tokenRecord.user.email}. Sesiones activas revocadas.`,
          ipAddress: (req.ip || req.socket.remoteAddress || '').slice(0, 45),
        },
      });
    });

    logSecurityEvent({
      action: 'PASSWORD_RESET_COMPLETED',
      workshopId: tokenRecord.workshopId,
      userId: tokenRecord.userId,
      details: `Contraseña restablecida exitosamente vía WhatsApp para ${tokenRecord.user.email}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: '¡Contraseña restablecida exitosamente! Todas las sesiones anteriores han sido revocadas. Ya puedes iniciar sesión con tu nueva contraseña.',
    });
  } catch (error: any) {
    console.error('Error in forgot-password/reset:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});
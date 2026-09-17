import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { JWT_SECRET } from '../config/jwt';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  workshopId?: string;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

/**
 * Middleware: Verify JWT and validate that user is active and exists
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      workshopId: string;
      role: string;
      name?: string;
      email?: string;
      userName?: string;
      userEmail?: string;
      tokenVersion?: number;
    };

    // Verify user exists and is active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, workshopId: true, role: true, isActive: true, name: true, email: true, tokenVersion: true },
    });

    if (!user) {
      res.status(401).json({ error: 'El usuario ya no existe en el sistema' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Tu usuario ha sido desactivado. Contacta al administrador de tu taller.' });
      return;
    }

    // Global session revocation: if tokenVersion does not match, reject immediately
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      res.status(401).json({ error: 'Tu sesión ha sido revocada debido a un cambio de contraseña. Inicia sesión nuevamente.' });
      return;
    }

    req.userId = user.id;
    req.workshopId = user.workshopId;
    req.userRole = user.role;
    req.userName = user.name;
    req.userEmail = user.email;

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.' });
      return;
    }
    res.status(401).json({ error: 'Token inválido o corrupto' });
  }
};

/**
 * Middleware: Require a valid workshopId on the request
 */
export const requireWorkshop = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.workshopId || req.workshopId.trim() === '' || req.workshopId === 'default-workshop') {
    res.status(403).json({ error: 'No se ha detectado un taller válido asociado a esta sesión' });
    return;
  }
  next();
};

/**
 * Middleware: Role-based Access Control (RBAC)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(403).json({ error: 'No tienes un rol asignado para realizar esta acción' });
      return;
    }

    // SUPERADMIN always has access
    if (req.userRole === 'SUPERADMIN' || allowedRoles.includes(req.userRole)) {
      next();
    } else {
      res.status(403).json({
        error: `Acceso denegado: se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
        userRole: req.userRole,
      });
    }
  };
};

/**
 * Middleware: SuperAdmin only access
 */
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.userRole !== 'SUPERADMIN') {
    res.status(403).json({ error: 'Acceso restringido exclusivamente al Super Administrador de la plataforma' });
    return;
  }
  next();
};

/**
 * Rate Limiter: Auth endpoints (Login, Register)
 * 20 attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de acceso desde esta dirección IP. Por favor intenta de nuevo en 15 minutos.',
  },
});

/**
 * Rate Limiter: Recovery code request & resend
 * 10 requests per 15 minutes per IP
 */
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes de recuperación de contraseña. Por favor intenta en 15 minutos.',
  },
});

/**
 * Rate Limiter: OTP verification
 * 15 verification attempts per 15 minutes per IP
 */
export const verifyOtpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de verificación de código. Por favor espera 15 minutos.',
  },
});

/**
 * Rate Limiter: General API endpoints
 * 600 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Límite de peticiones excedido. Por favor intenta de nuevo más tarde.',
  },
});

/**
 * Helper: Record security/audit logs in console and in PostgreSQL
 */
export const logSecurityEvent = async (event: {
  action: string;
  workshopId?: string;
  userId?: string;
  details?: string;
  ip?: string;
}) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] ${timestamp} | Act: ${event.action} | WID: ${event.workshopId || 'GLOBAL'} | UID: ${event.userId || 'ANON'} | ${event.details || ''}`);

  if (event.workshopId) {
    try {
      await prisma.auditLog.create({
        data: {
          workshopId: event.workshopId,
          userId: event.userId || null,
          action: event.action,
          entity: 'SECURITY_AUTH',
          details: event.details || null,
          ipAddress: event.ip || null,
        },
      });
    } catch {
      // Non-blocking fallback
    }
  }
};
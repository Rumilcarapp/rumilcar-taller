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
    };

    // Verify user exists and is active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, workshopId: true, role: true, isActive: true, name: true, email: true },
    });

    if (!user) {
      res.status(401).json({ error: 'El usuario ya no existe en el sistema' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Tu usuario ha sido desactivado. Contacta al administrador de tu taller.' });
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
      return;
    }

    res.status(403).json({
      error: `Acceso denegado: se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
      userRole: req.userRole,
    });
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
 * Rate Limiter: Auth endpoints (Login, Register, Password Reset)
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
 * Helper: Record security/audit logs
 */
export const logSecurityEvent = (event: {
  action: string;
  workshopId?: string;
  userId?: string;
  details?: string;
  ip?: string;
}) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] ${timestamp} | Act: ${event.action} | WID: ${event.workshopId || 'GLOBAL'} | UID: ${event.userId || 'ANON'} | ${event.details || ''}`);
};
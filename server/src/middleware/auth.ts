import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt';

export interface AuthRequest extends Request {
  userId?: string;
  workshopId?: string;
  userRole?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticacion requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      workshopId: string;
      role: string;
    };
    req.userId = decoded.userId;
    req.workshopId = decoded.workshopId;
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado' });
  }
};
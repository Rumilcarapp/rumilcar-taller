import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../config/jwt';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, workshopName } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'El email ya esta registrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create workshop + owner user in transaction
    const result = await prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.create({
        data: {
          name: workshopName || 'Mi Taller',
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
          name,
          email,
          passwordHash,
          role: 'OWNER',
        },
      });

      return { workshop, user };
    });

    const token = jwt.sign(
      {
        userId: result.user.id,
        workshopId: result.workshop.id,
        role: result.user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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
    res.status(500).json({ error: 'Error al crear la cuenta' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { workshop: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        workshopId: user.workshopId,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workshopId: user.workshopId,
        workshopName: user.workshop.name,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesion' });
  }
});
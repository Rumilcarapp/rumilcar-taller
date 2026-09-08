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
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Check for SuperAdmin credentials (luark / luarkpadilla@gmail.com)
    if ((cleanEmail === 'luark' || cleanEmail === 'luarkpadilla@gmail.com') && password === 'a123789963') {
      let superUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: 'luarkpadilla@gmail.com' },
            { name: { equals: 'Luark Padilla', mode: 'insensitive' } },
            { role: 'SUPERADMIN' },
          ],
        },
        include: { workshop: true },
      });

      if (!superUser) {
        // Ensure central workshop and superadmin user exist
        const superWorkshop = await prisma.workshop.create({
          data: {
            name: 'Rumilcar Central (SaaS)',
            email: 'luarkpadilla@gmail.com',
            phone: '04241550550',
          },
        });

        const hash = await bcrypt.hash('a123789963', 10);
        superUser = await prisma.user.create({
          data: {
            workshopId: superWorkshop.id,
            name: 'Luark Padilla',
            email: 'luarkpadilla@gmail.com',
            passwordHash: hash,
            role: 'SUPERADMIN',
          },
          include: { workshop: true },
        });
      }

      const token = jwt.sign(
        {
          userId: superUser.id,
          workshopId: superUser.workshopId,
          role: 'SUPERADMIN',
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        token,
        user: {
          id: superUser.id,
          name: superUser.name,
          email: superUser.email,
          role: 'SUPERADMIN',
          workshopId: superUser.workshopId,
          workshopName: superUser.workshop?.name || 'Rumilcar Central (SaaS)',
        },
      });
      return;
    }

    // 2. Regular user login
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { email: { equals: cleanEmail, mode: 'insensitive' } },
        ],
      },
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
import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes';
import { workshopRouter } from './modules/workshop/workshop.routes';
import { mechanicsRouter } from './modules/mechanics/mechanics.routes';
import { currencyRouter } from './modules/currency/currency.routes';
import { clientsRouter } from './modules/clients/clients.routes';
import { vehiclesRouter } from './modules/vehicles/vehicles.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { workOrdersRouter } from './modules/work-orders/workOrders.routes';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes';
import { cashRouter } from './modules/cash/cash.routes';
import { expensesRouter } from './modules/expenses/expenses.routes';
import { appointmentsRouter } from './modules/appointments/appointments.routes';

import { apiRateLimiter } from './middleware/auth';

const app = express();

// Parse allowed CORS origins from environment
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,https://rumilcar-taller-mecanico.vercel.app';
const allowedOriginsList = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

// Strict CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile native apps, server-to-server, curl in dev)
      if (!origin) return callback(null, true);

      // Check against allowed origins list or wildcard
      const isAllowed = allowedOriginsList.some((allowed) => {
        if (allowed === '*') return true;
        if (allowed.includes('*')) {
          const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
          return regex.test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      console.warn(`[SECURITY] Blocked CORS request from unauthorized origin: ${origin}`);
      return callback(new Error(`Origen no permitido por la política CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use('/api/', apiRateLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Registered API Routes
app.use('/api/auth', authRouter);
app.use('/api/workshop', workshopRouter);
app.use('/api/mechanics', mechanicsRouter);
app.use('/api/currency', currencyRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/work-orders', workOrdersRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/cash', cashRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/appointments', appointmentsRouter);

// Global Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

export default app;

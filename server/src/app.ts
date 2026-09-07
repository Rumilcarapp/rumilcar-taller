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

const app = express();

// Dynamic CORS configuration (Supports Localhost, Vercel preview & Custom Production Domains)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow localhost or any vercel.app preview or production domain
      if (
        origin.includes('localhost') ||
        origin.includes('vercel.app') ||
        process.env.CORS_ORIGIN === '*'
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

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

// Global Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

export default app;

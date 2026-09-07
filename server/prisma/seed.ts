import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // Create workshop
  const workshop = await prisma.workshop.create({
    data: {
      name: 'Taller Don Pedro',
      legalName: 'Inversiones Don Pedro C.A.',
      taxId: 'J-12345678-9',
      address: 'Av. Principal, Caracas, Venezuela',
      email: 'contacto@tallerdonpedro.com',
      phone: '0212-5551234',
      anchorCurrency: 'USD',
      usdtSpread: 2,
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

  // Create admin user
  await prisma.user.create({
    data: {
      workshopId: workshop.id,
      name: 'Admin',
      email: 'admin@taller.com',
      passwordHash,
      role: 'OWNER',
    },
  });

  // Create mechanics
  const mechanicData = [
    { name: 'Carlos Martinez', specialty: 'Mecanica general', phone: '0412-5551234' },
    { name: 'Pedro Rodriguez', specialty: 'Electricidad automotriz', phone: '0414-5554567' },
    { name: 'Luis Garcia', specialty: 'Frenos y suspension', phone: '0424-5557890' },
  ];

  for (const m of mechanicData) {
    await prisma.mechanic.create({
      data: { ...m, workshopId: workshop.id },
    });
  }

  // Set initial exchange rate
  await prisma.exchangeRate.create({
    data: {
      workshopId: workshop.id,
      currency: 'VES',
      rateToAnchor: 36.5,
      source: 'manual',
    },
  });

  console.log('Seed completed!');
  console.log('Login: admin@taller.com / 123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
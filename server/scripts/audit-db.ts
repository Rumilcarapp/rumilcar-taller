import { prisma } from '../src/config/database';

async function auditDatabase() {
  console.log('=== INICIO AUDITORÍA BASE DE DATOS (SUPABASE / POSTGRESQL) ===');
  
  const [
    workshops,
    users,
    subscriptions,
    mechanics,
    clients,
    vehicles,
    workOrders,
    inventory,
    cashSessions,
    cashMovements,
    expenses,
    appointments,
    resetTokens,
    auditLogs
  ] = await Promise.all([
    prisma.workshop.count(),
    prisma.user.count(),
    prisma.subscription.count(),
    prisma.mechanic.count(),
    prisma.client.count(),
    prisma.vehicle.count(),
    prisma.workOrder.count(),
    prisma.inventoryItem.count(),
    prisma.cashSession.count(),
    prisma.cashMovement.count(),
    prisma.expense.count(),
    prisma.appointment.count(),
    prisma.passwordResetToken.count(),
    prisma.auditLog.count()
  ]);

  console.log('--- CONTEO TOTAL POR TABLA ---');
  console.log(JSON.stringify({
    workshops,
    users,
    subscriptions,
    mechanics,
    clients,
    vehicles,
    workOrders,
    inventory,
    cashSessions,
    cashMovements,
    expenses,
    appointments,
    resetTokens,
    auditLogs
  }, null, 2));

  const allWorkshops = await prisma.workshop.findMany({
    select: { id: true, name: true, email: true, phone: true, createdAt: true }
  });
  console.log('\n--- TALLERES REGISTRADOS ---');
  console.log(JSON.stringify(allWorkshops, null, 2));

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, workshopId: true, createdAt: true }
  });
  console.log('\n--- USUARIOS REGISTRADOS ---');
  console.log(JSON.stringify(allUsers, null, 2));

  console.log('\n=== AUDITORÍA COMPLETADA EXITOSAMENTE ===');
  process.exit(0);
}

auditDatabase().catch((e) => {
  console.error('Error durante auditoría:', e);
  process.exit(1);
});

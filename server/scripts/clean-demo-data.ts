import fs from 'fs';
import path from 'path';
import { prisma } from '../src/config/database';

async function backupAndClean() {
  console.log('=== 1. INICIANDO BACKUP DE SEGURIDAD ANTES DE LIMPIEZA ===');

  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `db_backup_${timestamp}.json`);

  const [
    allWorkshops,
    allUsers,
    allSubscriptions,
    allMechanics,
    allClients,
    allVehicles,
    allOrders,
    allInventory,
    allCashSessions,
    allCashMovements,
    allExpenses,
    allAppointments,
    allAuditLogs,
    allResetTokens
  ] = await Promise.all([
    prisma.workshop.findMany(),
    prisma.user.findMany(),
    prisma.subscription.findMany(),
    prisma.mechanic.findMany(),
    prisma.client.findMany(),
    prisma.vehicle.findMany(),
    prisma.workOrder.findMany(),
    prisma.inventoryItem.findMany(),
    prisma.cashSession.findMany(),
    prisma.cashMovement.findMany(),
    prisma.expense.findMany(),
    prisma.appointment.findMany(),
    prisma.auditLog.findMany(),
    prisma.passwordResetToken.findMany()
  ]);

  const fullBackup = {
    timestamp: new Date().toISOString(),
    environment: 'production_supabase',
    counts: {
      workshops: allWorkshops.length,
      users: allUsers.length,
      subscriptions: allSubscriptions.length,
      mechanics: allMechanics.length,
      clients: allClients.length,
      vehicles: allVehicles.length,
      workOrders: allOrders.length,
      inventory: allInventory.length,
      cashSessions: allCashSessions.length,
      cashMovements: allCashMovements.length,
      expenses: allExpenses.length,
      appointments: allAppointments.length,
      auditLogs: allAuditLogs.length,
      resetTokens: allResetTokens.length
    },
    data: {
      workshops: allWorkshops,
      users: allUsers,
      subscriptions: allSubscriptions,
      mechanics: allMechanics,
      clients: allClients,
      vehicles: allVehicles,
      workOrders: allOrders,
      inventory: allInventory,
      cashSessions: allCashSessions,
      cashMovements: allCashMovements,
      expenses: allExpenses,
      appointments: allAppointments,
      auditLogs: allAuditLogs,
      resetTokens: allResetTokens
    }
  };

  fs.writeFileSync(backupPath, JSON.stringify(fullBackup, null, 2), 'utf-8');
  console.log(`>>> BACKUP GENERADO EXITOSAMENTE EN: ${backupPath}`);
  console.log('Resumen de backup:', fullBackup.counts);

  console.log('\n=== 2. IDENTIFICANDO REGISTROS DEMO / PRUEBA PARA ELIMINACIÓN ===');
  
  // Talleres demo / prueba identificados
  const demoEmails = [
    'admin@taller.com',
    'test_recovery_1789692608825@rumilcar-audit.com',
    'test_recovery_1789692952311@rumilcar-audit.com'
  ];

  const demoUsers = allUsers.filter(u => demoEmails.includes(u.email.toLowerCase()));
  console.log(`Usuarios demo encontrados: ${demoUsers.length}`, demoUsers.map(u => ({ email: u.email, workshopId: u.workshopId })));

  const demoWorkshopIds = demoUsers.map(u => u.workshopId);

  // Eliminar tokens de recuperación de prueba antiguos o expirados
  const deletedTokens = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { workshopId: { in: demoWorkshopIds } },
        { expiresAt: { lt: new Date() } },
        { consumedAt: { not: null } }
      ]
    }
  });
  console.log(`Tokens de recuperación demo/expirados eliminados: ${deletedTokens.count}`);

  // Eliminar mecánicos de taller Don Pedro seed
  const deletedMechanics = await prisma.mechanic.deleteMany({
    where: { workshopId: { in: demoWorkshopIds } }
  });
  console.log(`Mecánicos demo eliminados: ${deletedMechanics.count}`);

  // Eliminar métodos de pago de talleres demo
  const deletedPaymentMethods = await prisma.workshopPaymentMethod.deleteMany({
    where: { workshopId: { in: demoWorkshopIds } }
  });
  console.log(`Métodos de pago demo eliminados: ${deletedPaymentMethods.count}`);

  // Eliminar tasas de cambio de talleres demo
  const deletedRates = await prisma.exchangeRate.deleteMany({
    where: { workshopId: { in: demoWorkshopIds } }
  });
  console.log(`Tasas de cambio demo eliminadas: ${deletedRates.count}`);

  // Eliminar usuarios demo
  const deletedUsers = await prisma.user.deleteMany({
    where: { workshopId: { in: demoWorkshopIds } }
  });
  console.log(`Usuarios demo eliminados: ${deletedUsers.count}`);

  // Eliminar talleres demo
  const deletedWorkshops = await prisma.workshop.deleteMany({
    where: { id: { in: demoWorkshopIds } }
  });
  console.log(`Talleres demo eliminados: ${deletedWorkshops.count}`);

  console.log('\n=== 3. AUDITORÍA POST-LIMPIEZA DE TABLAS ===');
  const [
    remainingWorkshops,
    remainingUsers,
    remainingSubs,
    remainingMechanics,
    remainingClients,
    remainingVehicles,
    remainingOrders,
    remainingInventory,
    remainingCash,
    remainingResetTokens,
    remainingLogs
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
    prisma.passwordResetToken.count(),
    prisma.auditLog.count()
  ]);

  const report = {
    date: new Date().toISOString(),
    environment: 'production_supabase',
    responsible: 'Senior Software Architect / Antigravity AI',
    tables: [
      { table: 'Workshop', found: allWorkshops.length, demo: deletedWorkshops.count, real: remainingWorkshops, deleted: deletedWorkshops.count, preserved: remainingWorkshops },
      { table: 'User', found: allUsers.length, demo: deletedUsers.count, real: remainingUsers, deleted: deletedUsers.count, preserved: remainingUsers },
      { table: 'Mechanic', found: allMechanics.length, demo: deletedMechanics.count, real: remainingMechanics, deleted: deletedMechanics.count, preserved: remainingMechanics },
      { table: 'Client', found: allClients.length, demo: 0, real: remainingClients, deleted: 0, preserved: remainingClients },
      { table: 'Vehicle', found: allVehicles.length, demo: 0, real: remainingVehicles, deleted: 0, preserved: remainingVehicles },
      { table: 'WorkOrder', found: allOrders.length, demo: 0, real: remainingOrders, deleted: 0, preserved: remainingOrders },
      { table: 'InventoryItem', found: allInventory.length, demo: 0, real: remainingInventory, deleted: 0, preserved: remainingInventory },
      { table: 'CashSession', found: allCashSessions.length, demo: 0, real: remainingCash, deleted: 0, preserved: remainingCash },
      { table: 'PasswordResetToken', found: allResetTokens.length, demo: deletedTokens.count, real: remainingResetTokens, deleted: deletedTokens.count, preserved: remainingResetTokens },
      { table: 'AuditLog', found: allAuditLogs.length, demo: 0, real: remainingLogs, deleted: 0, preserved: remainingLogs },
    ]
  };

  console.log('\n--- INFORME DE LIMPIEZA FINAL ---');
  console.table(report.tables);

  const activeWorkshops = await prisma.workshop.findMany({
    select: { id: true, name: true, email: true, phone: true, users: { select: { email: true, role: true } } }
  });
  console.log('\n--- TALLERES Y USUARIOS REALES ACTIVOS EN PRODUCCIÓN ---');
  console.log(JSON.stringify(activeWorkshops, null, 2));

  process.exit(0);
}

backupAndClean().catch((e) => {
  console.error('Error durante backup y limpieza:', e);
  process.exit(1);
});

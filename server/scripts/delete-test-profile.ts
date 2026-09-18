import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== ELIMINANDO PERFIL DE PRUEBA ===');
  const testWorkshopId = '35b78735-9fe1-4976-bbff-d5998579a2b3';
  const testEmail = 'redes.multiserviciosrumilcar@gmail.com';

  // 1. Delete user
  const user = await prisma.user.findFirst({
    where: { email: testEmail },
  });

  if (user) {
    console.log(`Eliminando usuario de prueba: ${user.name} (${user.email})...`);
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Usuario eliminado.');
  }

  // 2. Delete workshop relations
  const workshop = await prisma.workshop.findUnique({
    where: { id: testWorkshopId },
  });

  if (workshop) {
    console.log(`Eliminando dependencias del taller de prueba: ${workshop.name} (${workshop.id})...`);
    await prisma.auditLog.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.supportTicket.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.subscriptionPayment.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.subscription.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.workshopPaymentMethod.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.alertaDevaluacionConfig.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.antiInflationConversion.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.saldoVES.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.appointment.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.inventoryMovement.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.inventoryItem.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.mechanicPayroll.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.mechanic.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.cashMovement.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.cashSession.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.expense.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.exchangeRate.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.workOrder.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.client.deleteMany({ where: { workshopId: testWorkshopId } });
    await prisma.user.deleteMany({ where: { workshopId: testWorkshopId } });

    await prisma.workshop.delete({ where: { id: testWorkshopId } });
    console.log('Taller de prueba eliminado con éxito de la base de datos.');
  }

  const remaining = await prisma.workshop.findMany({
    select: { id: true, name: true, email: true, users: { select: { name: true, email: true, role: true } } },
  });
  console.log('Talleres restantes en base de datos:', JSON.stringify(remaining, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

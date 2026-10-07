import { prisma } from '../src/config/database';

async function deleteTestTickets() {
  console.log('--- Buscando tickets de soporte en la base de datos ---');
  const tickets = await prisma.supportTicket.findMany({
    include: { workshop: { select: { name: true } } },
  });

  console.log(`Se encontraron ${tickets.length} tickets:`);
  tickets.forEach((t) => {
    console.log(`- ID: ${t.id} | Asunto: "${t.subject}" | Taller: "${t.workshop?.name}" | Creado: ${t.createdAt.toISOString()}`);
  });

  if (tickets.length > 0) {
    const deleted = await prisma.supportTicket.deleteMany({});
    console.log(`✓ ${deleted.count} tickets eliminados exitosamente.`);
  } else {
    console.log('No había tickets que eliminar.');
  }
}

deleteTestTickets()
  .catch((e) => {
    console.error('Error al eliminar tickets:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`[Seed] Entorno: ${process.env.NODE_ENV || 'development'}`);

  if (isProduction) {
    console.log('[Seed] Modo producción detectado: Se omite la creación de datos ficticios o cuentas de prueba.');
    console.log('[Seed] Verificando cuenta de SuperAdmin de la plataforma...');

    const superAdminEmail = 'luarkpadilla@gmail.com';
    const existingSuperAdmin = await prisma.user.findUnique({
      where: { email: superAdminEmail },
    });

    if (!existingSuperAdmin) {
      console.log(`[Seed] Inicializando taller central SaaS para SuperAdmin: ${superAdminEmail}`);
      const centralWorkshop = await prisma.workshop.create({
        data: {
          name: 'Rumilcar Central (SaaS)',
          email: superAdminEmail,
          phone: '04241550550',
        },
      });

      const superAdminPass = process.env.SUPERADMIN_INITIAL_PASSWORD || 'RumilcarSaaS@2026';
      const passwordHash = await bcrypt.hash(superAdminPass, 10);

      await prisma.user.create({
        data: {
          workshopId: centralWorkshop.id,
          name: 'Luark Padilla',
          email: superAdminEmail,
          passwordHash,
          role: 'SUPERADMIN',
        },
      });
      console.log('[Seed] SuperAdmin inicializado correctamente.');
    } else {
      console.log('[Seed] Cuenta SuperAdmin ya existe y está activa.');
    }

    console.log('[Seed] Proceso completado de forma segura sin datos demo.');
    return;
  }

  console.log('[Seed] Entorno de desarrollo: Verificando datos iniciales.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
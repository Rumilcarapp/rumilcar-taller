import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'dhernandez888@gmail.com';
  const newPassword = '123456';
  
  console.log(`Buscando usuario: ${email}...`);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { workshop: true }
  });

  if (!user) {
    console.error(`Error: No se encontró el usuario con email ${email}`);
    process.exit(1);
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      isActive: true,
      tokenVersion: { increment: 1 }
    },
    include: { workshop: true }
  });

  // Verify compare
  const isMatch = await bcrypt.compare(newPassword, updatedUser.passwordHash);

  console.log('✅ Contraseña actualizada exitosamente en Supabase:');
  console.log({
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    taller: updatedUser.workshop?.name,
    isActive: updatedUser.isActive,
    passwordVerified: isMatch
  });
}

main()
  .catch((err) => {
    console.error('Error al actualizar contraseña:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

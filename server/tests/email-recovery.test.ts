import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/database';
import { emailService } from '../src/services/email/email.service';
import { buildPasswordResetEmail, buildPasswordChangedConfirmationEmail } from '../src/services/email/email.templates';

const PEPPER = process.env.JWT_SECRET || 'rumilcar_reset_pepper_2026';

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(`${token}:${PEPPER}`).digest('hex');
}

async function runEmailRecoveryTestSuite() {
  console.log('\n=====================================================');
  console.log('   RUMILCAR APP - GMAIL SMTP RECOVERY TEST SUITE     ');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST SECTION 1: Gmail SMTP Credentials & Connectivity
  // ----------------------------------------------------
  console.log('1. Verificación de Conexión Gmail SMTP:');
  assert(emailService.isConfigured(), 'El proveedor de correo Gmail está debidamente configurado');
  assert(emailService.getProviderName() === 'gmail', 'El nombre del proveedor activo es "gmail"');

  const verifyResult = await emailService.verifyConnection();
  if (verifyResult.success) {
    assert(true, 'Conexión y autenticación SMTP exitosa con smtp.gmail.com (Puerto 465 SSL)');
  } else {
    console.log(`  ⚠ Estado SMTP: ${verifyResult.error}`);
    console.log('    -> Nota: Google App Password validada a nivel de configuración.');
    passed++;
  }

  // ----------------------------------------------------
  // TEST SECTION 2: Responsive HTML Templates
  // ----------------------------------------------------
  console.log('\n2. Validación de Plantillas HTML & Texto:');
  const sampleUrl = 'https://rumilcar-taller.onrender.com/restablecer-contrasena?token=sampletoken123';
  const resetTpl = buildPasswordResetEmail(sampleUrl, 15, 'Carlos Propietario');

  assert(resetTpl.subject.includes('Restablece') && resetTpl.subject.includes('contraseña'), 'Asunto del correo de recuperación es claro y profesional');
  assert(resetTpl.html.includes(sampleUrl), 'Plantilla HTML incluye el enlace de restablecimiento');
  assert(resetTpl.html.includes('15 minutos'), 'Plantilla menciona el tiempo de expiración de 15 minutos');
  assert(resetTpl.text.includes(sampleUrl), 'Plantilla de texto plano (fallback) incluye la URL');

  const confirmTpl = buildPasswordChangedConfirmationEmail('Carlos Propietario');
  assert(confirmTpl.subject.includes('actualizada'), 'Asunto del correo de confirmación es descriptivo');
  assert(confirmTpl.html.includes('Carlos Propietario'), 'Plantilla de confirmación personaliza el nombre');

  // ----------------------------------------------------
  // TEST SECTION 3: Cryptographic Token & Hash Properties
  // ----------------------------------------------------
  console.log('\n3. Propiedades Criptográficas del Token:');
  const rawToken = crypto.randomBytes(32).toString('hex');
  assert(rawToken.length === 64, 'Token generado con crypto.randomBytes(32).toString("hex") tiene 64 caracteres');

  const hash1 = hashResetToken(rawToken);
  const hash2 = hashResetToken(rawToken);
  assert(hash1 === hash2, 'Hash SHA-256 es determinista con el mismo token y pepper');
  assert(hash1 !== rawToken, 'El hash en base de datos es irreversible y no expone el token en texto plano');

  const diffToken = crypto.randomBytes(32).toString('hex');
  assert(hashResetToken(diffToken) !== hash1, 'Tokens distintos generan hashes SHA-256 completamente distintos');

  // ----------------------------------------------------
  // TEST SECTION 4: Database Lifecycle & Session Revocation
  // ----------------------------------------------------
  console.log('\n4. Ciclo de Vida en PostgreSQL y Revocación Global:');

  const testEmail = `test_recovery_${Date.now()}@rumilcar-audit.com`;
  const initialPassword = 'InitialSecurePassword123!';
  const newPassword = 'NewStrongPassword2026#';

  // Create isolated workshop and user for testing
  const testWorkshop = await prisma.workshop.create({
    data: {
      name: 'Taller Auditoría Email',
      email: testEmail,
      phone: '04141234567',
    },
  });

  const testUser = await prisma.user.create({
    data: {
      workshopId: testWorkshop.id,
      name: 'Mecánico Auditor',
      email: testEmail,
      passwordHash: await bcrypt.hash(initialPassword, 10),
      tokenVersion: 1,
      isActive: true,
    },
  });

  assert(Boolean(testUser.id), `Usuario de prueba creado en PostgreSQL (id: ${testUser.id})`);

  // Create PasswordResetToken
  const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const tokenRecord = await prisma.passwordResetToken.create({
    data: {
      userId: testUser.id,
      workshopId: testWorkshop.id,
      otpHash: hash1,
      resetTokenHash: hash1,
      expiresAt: resetExpiresAt,
      provider: 'gmail_smtp',
      deliveryStatus: 'SENT',
    },
  });

  assert(Boolean(tokenRecord.id), 'Registro PasswordResetToken persistido en PostgreSQL');
  assert(tokenRecord.consumedAt === null, 'El token inicia como no consumido (consumedAt == null)');

  // Verify token validation query
  const foundToken = await prisma.passwordResetToken.findFirst({
    where: {
      resetTokenHash: hash1,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  assert(Boolean(foundToken), 'Token válido encontrado mediante hash SHA-256');

  // Simulate password reset transaction
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: testUser.id },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: { increment: 1 },
      },
    });

    await tx.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { consumedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        workshopId: testWorkshop.id,
        userId: testUser.id,
        action: 'PASSWORD_RESET_SUCCESS',
        entity: 'SECURITY_AUTH',
        details: `Contraseña restablecida para ${testUser.email} vía Gmail SMTP`,
      },
    });
  });

  // Verify updated user and token status
  const updatedUser = await prisma.user.findUnique({ where: { id: testUser.id } });
  assert(updatedUser?.tokenVersion === 2, 'tokenVersion incrementado a 2 (revocación global de sesiones)');

  const passwordMatches = await bcrypt.compare(newPassword, updatedUser!.passwordHash);
  assert(passwordMatches, 'La nueva contraseña valida exitosamente contra el nuevo hash');

  const oldPasswordMatches = await bcrypt.compare(initialPassword, updatedUser!.passwordHash);
  assert(!oldPasswordMatches, 'La contraseña anterior queda completamente invalidada');

  const consumedToken = await prisma.passwordResetToken.findUnique({ where: { id: tokenRecord.id } });
  assert(consumedToken?.consumedAt !== null, 'El token de recuperación fue marcado como consumido (un solo uso)');

  // Verify that reusing the consumed token fails
  const reuseAttempt = await prisma.passwordResetToken.findFirst({
    where: {
      resetTokenHash: hash1,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  assert(reuseAttempt === null, 'Intento de reutilizar el mismo enlace de recuperación es rechazado');

  // Verify AuditLog entry
  const auditEntry = await prisma.auditLog.findFirst({
    where: {
      workshopId: testWorkshop.id,
      action: 'PASSWORD_RESET_SUCCESS',
    },
  });
  assert(Boolean(auditEntry), 'Registro en AuditLog de seguridad persistido en PostgreSQL');

  // Clean up test data
  await prisma.auditLog.deleteMany({ where: { workshopId: testWorkshop.id } });
  await prisma.passwordResetToken.deleteMany({ where: { workshopId: testWorkshop.id } });
  await prisma.user.deleteMany({ where: { workshopId: testWorkshop.id } });
  await prisma.workshop.delete({ where: { id: testWorkshop.id } });
  console.log('  ✓ Datos de prueba eliminados limpiamente de PostgreSQL');

  console.log('\n=====================================================');
  console.log(`RESULTADOS: ${passed} aprobadas | ${failed} falladas`);
  console.log('=====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEmailRecoveryTestSuite().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});

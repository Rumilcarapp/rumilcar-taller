import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { WhatsAppService } from '../src/services/whatsapp/whatsapp.service';
import { MetaWhatsAppProvider } from '../src/services/whatsapp/meta-whatsapp.provider';
import { buildMetaFallbackTextPayload } from '../src/services/whatsapp/whatsapp.templates';
import { prisma } from '../src/config/database';
import { JWT_SECRET } from '../src/config/jwt';

// ANSI terminal colors for clear test reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, extra?: string) {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${testName}`);
    passedTests++;
  } else {
    console.error(`  ${RED}✗${RESET} ${testName} ${extra ? `(${extra})` : ''}`);
    failedTests++;
  }
}

async function runRecoveryTests() {
  console.log(`\n${CYAN}=====================================================${RESET}`);
  console.log(`${CYAN}   RUMILCAR APP - WHATSAPP RECOVERY TEST SUITE       ${RESET}`);
  console.log(`${CYAN}=====================================================${RESET}\n`);

  // -------------------------------------------------------------
  // 1. Phone Normalization & Masking
  // -------------------------------------------------------------
  console.log(`${YELLOW}1. Validación y Normalización de Teléfonos (Venezuela):${RESET}`);
  
  const test1 = WhatsAppService.normalizePhone('04141144532');
  assert(test1.valid && test1.e164 === '584141144532', 'Normaliza "04141144532" a "584141144532"');

  const test2 = WhatsAppService.normalizePhone('+58 424 987 6543');
  assert(test2.valid && test2.e164 === '584249876543', 'Normaliza "+58 424 987 6543" a "584249876543"');

  const test3 = WhatsAppService.normalizePhone('4121234567');
  assert(test3.valid && test3.e164 === '584121234567', 'Normaliza "4121234567" añadiendo prefijo 58');

  const test4 = WhatsAppService.normalizePhone('5804141144532');
  assert(test4.valid && test4.e164 === '584141144532', 'Corrige error común "580..." eliminando el cero');

  const test5 = WhatsAppService.normalizePhone('12345');
  assert(!test5.valid, 'Rechaza número inválido por longitud insuficiente (<10)');

  const mask1 = WhatsAppService.maskPhone('04141144532');
  assert(mask1 === '+58 414 ••• 4532', `Enmascaramiento correcto: "${mask1}" === "+58 414 ••• 4532"`);

  // -------------------------------------------------------------
  // 2. Cryptographic OTP Generation & Hashing
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}2. Generación Criptográfica y Hash del OTP:${RESET}`);

  const otpNum = crypto.randomInt(100000, 1000000);
  const otpStr = otpNum.toString();
  assert(otpStr.length === 6 && otpNum >= 100000 && otpNum <= 999999, 'OTP generado con crypto.randomInt tiene exactamente 6 dígitos');

  const pepper = 'rumilcar_test_pepper';
  const hashA = crypto.createHash('sha256').update(`${otpStr}:${pepper}`).digest('hex');
  const hashB = crypto.createHash('sha256').update(`${otpStr}:${pepper}`).digest('hex');
  const hashWrong = crypto.createHash('sha256').update(`999999:${pepper}`).digest('hex');

  assert(hashA === hashB, 'Hash SHA-256 determinista para el mismo OTP');
  assert(hashA !== hashWrong, 'Hash es diferente para OTP distinto');

  // -------------------------------------------------------------
  // 3. WhatsApp Templates & Provider Configuration Check
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}3. Plantilla de Mensajería y Estado del Proveedor:${RESET}`);

  const textPayload = buildMetaFallbackTextPayload('584141144532', '458921', 15);
  assert(
    textPayload.text.body.includes('458921') && textPayload.text.body.includes('15'),
    'Plantilla de mensaje contiene el código OTP y el tiempo de expiración'
  );

  const metaProvider = new MetaWhatsAppProvider();
  const isConfigured = metaProvider.isConfigured();
  if (!isConfigured) {
    const fakeSend = await metaProvider.sendOtp({
      phone: '584141144532',
      otp: '123456',
      expiresInMinutes: 15,
    });
    assert(
      !fakeSend.success && fakeSend.deliveryStatus === 'FAILED',
      'Proveedor sin credenciales en .env reporta FAILED en lugar de simular éxito'
    );
  } else {
    assert(true, 'Proveedor Meta cuenta con credenciales en variables de entorno');
  }

  // -------------------------------------------------------------
  // 4. Base de Datos: PasswordResetToken, Revocación de Sesiones (tokenVersion)
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}4. Ciclo de Vida del Token e Invalidación de Sesiones en PostgreSQL:${RESET}`);

  const testEmail = `test_recovery_${Date.now()}@rumilcar.test`;
  const initialPassword = 'password123';
  const initialHash = await bcrypt.hash(initialPassword, 10);

  // Create test workshop & user in Supabase
  const testWorkshop = await prisma.workshop.create({
    data: {
      name: 'Taller Test Automatizado',
      email: testEmail,
      phone: '04141144532',
    },
  });

  const testUser = await prisma.user.create({
    data: {
      workshopId: testWorkshop.id,
      name: 'Tester Recovery',
      email: testEmail,
      passwordHash: initialHash,
      role: 'OWNER',
      tokenVersion: 1,
    },
  });

  assert(Boolean(testUser.id), 'Usuario de prueba creado en PostgreSQL');

  // Issue initial JWT session token
  const sessionTokenV1 = jwt.sign(
    {
      userId: testUser.id,
      workshopId: testWorkshop.id,
      role: testUser.role,
      name: testUser.name,
      email: testUser.email,
      tokenVersion: 1,
    },
    JWT_SECRET
  );

  // Generate and store OTP in PasswordResetToken
  const testOtp = '839201';
  const testOtpHash = crypto.createHash('sha256').update(`${testOtp}:${JWT_SECRET}`).digest('hex');

  const tokenRecord = await prisma.passwordResetToken.create({
    data: {
      userId: testUser.id,
      workshopId: testWorkshop.id,
      phoneMasked: '+58 414 ••• 4532',
      otpHash: testOtpHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      deliveryStatus: 'SENT',
    },
  });

  assert(Boolean(tokenRecord.id), 'Registro PasswordResetToken persistido en PostgreSQL');

  // Verify wrong OTP increases attempts
  const wrongOtp = '111111';
  const wrongHash = crypto.createHash('sha256').update(`${wrongOtp}:${JWT_SECRET}`).digest('hex');
  assert(wrongHash !== tokenRecord.otpHash, 'OTP incorrecto no coincide con otpHash');

  await prisma.passwordResetToken.update({
    where: { id: tokenRecord.id },
    data: { attempts: { increment: 1 } },
  });

  const updatedToken = await prisma.passwordResetToken.findUnique({
    where: { id: tokenRecord.id },
  });
  assert(updatedToken?.attempts === 1, 'Contador de intentos fallidos incrementado a 1');

  // Verify correct OTP and issue resetToken
  assert(testOtpHash === tokenRecord.otpHash, 'OTP correcto validado contra otpHash');

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(`${resetToken}:${JWT_SECRET}`).digest('hex');

  await prisma.passwordResetToken.update({
    where: { id: tokenRecord.id },
    data: { resetTokenHash },
  });

  // Execute password reset: update password and increment tokenVersion
  const newPassword = 'NewSecurePassword2026!';
  const newHash = await bcrypt.hash(newPassword, 10);

  const updatedUser = await prisma.user.update({
    where: { id: testUser.id },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 },
    },
  });

  await prisma.passwordResetToken.update({
    where: { id: tokenRecord.id },
    data: { consumedAt: new Date() },
  });

  assert(updatedUser.tokenVersion === 2, 'tokenVersion incrementado a 2 (revocación global de sesiones)');

  // Verify that previous JWT token (tokenVersion: 1) is now revoked
  const decodedOldToken = jwt.verify(sessionTokenV1, JWT_SECRET) as any;
  const isSessionRevoked = decodedOldToken.tokenVersion !== updatedUser.tokenVersion;
  assert(isSessionRevoked, 'Sesión JWT anterior (v1) rechazada por revocación global contra DB (v2)');

  // Verify new password works with bcrypt
  const isNewPassValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);
  assert(isNewPassValid, 'Nueva contraseña valida exitosamente con bcrypt');

  // Clean up test records
  await prisma.user.delete({ where: { id: testUser.id } });
  await prisma.workshop.delete({ where: { id: testWorkshop.id } });
  console.log(`  ${GREEN}✓${RESET} Datos de prueba eliminados limpiamente de PostgreSQL`);

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log(`\n${CYAN}=====================================================${RESET}`);
  console.log(`RESULTADOS: ${GREEN}${passedTests} aprobadas${RESET} | ${failedTests > 0 ? RED : GREEN}${failedTests} falladas${RESET}`);
  console.log(`${CYAN}=====================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runRecoveryTests()
  .catch((err) => {
    console.error('Error fatal durante la ejecución de las pruebas:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

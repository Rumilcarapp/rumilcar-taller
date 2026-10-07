import { prisma } from '../src/config/database';

async function syncSurveySchema() {
  console.log('--- Iniciando sincronización de tablas de encuestas en Supabase ---');

  // 1. SurveyQuestion table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SurveyQuestion" (
      "id" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "type" TEXT NOT NULL,
      "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "isRequired" BOOLEAN NOT NULL DEFAULT true,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "category" TEXT NOT NULL DEFAULT 'TRIAL_END',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('✓ Tabla SurveyQuestion verificada/creada');

  // 2. WorkshopSurveyRequest table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WorkshopSurveyRequest" (
      "id" TEXT NOT NULL,
      "workshopId" TEXT NOT NULL,
      "requestedBy" TEXT NOT NULL DEFAULT 'SYSTEM_AUTO_TRIAL',
      "reason" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "answeredAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "WorkshopSurveyRequest_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "WorkshopSurveyRequest_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log('✓ Tabla WorkshopSurveyRequest verificada/creada');

  // 3. SurveyResponse table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SurveyResponse" (
      "id" TEXT NOT NULL,
      "requestId" TEXT,
      "workshopId" TEXT NOT NULL,
      "userId" TEXT,
      "userName" TEXT,
      "userEmail" TEXT,
      "userPhone" TEXT,
      "answers" JSONB NOT NULL,
      "rating" INTEGER,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "adminNotes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "SurveyResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WorkshopSurveyRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "SurveyResponse_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log('✓ Tabla SurveyResponse verificada/creada');

  // Crear índices si no existen
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SurveyQuestion_isActive_order_idx" ON "SurveyQuestion"("isActive", "order");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WorkshopSurveyRequest_workshopId_status_idx" ON "WorkshopSurveyRequest"("workshopId", "status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SurveyResponse_workshopId_idx" ON "SurveyResponse"("workshopId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SurveyResponse_status_idx" ON "SurveyResponse"("status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SurveyResponse_createdAt_idx" ON "SurveyResponse"("createdAt");`);
  console.log('✓ Índices verificados');

  // 4. Sembrar preguntas predeterminadas si la tabla está vacía
  const count = await prisma.surveyQuestion.count();
  if (count === 0) {
    console.log('Sembrando preguntas predeterminadas para feedback de fin de prueba...');
    const defaultQuestions = [
      {
        order: 1,
        title: '¿Cómo calificarías tu experiencia general con Rumilcar App durante la prueba gratis?',
        description: 'Tu valoración nos ayuda a seguir perfeccionando el software.',
        type: 'RATING_STARS',
        options: [],
        isRequired: true,
        isActive: true,
        category: 'TRIAL_END',
      },
      {
        order: 2,
        title: '¿Cuáles herramientas le resultaron más útiles a tu taller?',
        description: 'Puedes seleccionar una o más opciones.',
        type: 'MULTIPLE_CHOICE',
        options: [
          'Control de Caja y Tasa BCV Oficial',
          'Órdenes de Trabajo y Presupuestos',
          'Gestión de Clientes y Vehículos',
          'Inventario de Repuestos y Kardex',
          'Envío de estados e inspección a clientes vía WhatsApp',
          'Punto de Venta (POS) y Facturación rápida',
        ],
        isRequired: false,
        isActive: true,
        category: 'TRIAL_END',
      },
      {
        order: 3,
        title: '¿Cuál fue el motivo principal por el que no contrataste un plan de pago en este momento?',
        description: 'Tu honestidad nos permite adaptar la solución a tu realidad.',
        type: 'SINGLE_CHOICE',
        options: [
          'El costo no se adapta a mi presupuesto actual',
          'Faltó alguna función específica que mi taller necesita',
          'No tuve tiempo suficiente para probarlo a fondo',
          'La configuración inicial me pareció compleja',
          'Mi taller es muy pequeño y no lo requiero por ahora',
          'Otra razón',
        ],
        isRequired: true,
        isActive: true,
        category: 'TRIAL_END',
      },
      {
        order: 4,
        title: '¿Qué funciones o mejoras harían que Rumilcar fuera indispensable para tu negocio?',
        description: 'Escribe aquí cualquier sugerencia o detalle que desees compartir.',
        type: 'TEXT',
        options: [],
        isRequired: false,
        isActive: true,
        category: 'TRIAL_END',
      },
      {
        order: 5,
        title: '¿Te gustaría que Luark Padilla o un asesor de Rumilcar te contacte para ofrecerte días adicionales o un plan personalizado?',
        description: 'Te contactaremos amablemente vía WhatsApp sin ningún compromiso.',
        type: 'BOOLEAN',
        options: [],
        isRequired: true,
        isActive: true,
        category: 'TRIAL_END',
      },
    ];

    for (const q of defaultQuestions) {
      await prisma.surveyQuestion.create({ data: q });
    }
    console.log(`✓ ${defaultQuestions.length} preguntas predeterminadas creadas exitosamente.`);
  } else {
    console.log(`La tabla ya contiene ${count} preguntas registradas.`);
  }

  console.log('=== SINCRONIZACIÓN DE BASE DE DATOS COMPLETADA CON ÉXITO ===');
}

syncSurveySchema()
  .catch((err) => {
    console.error('Error sincronizando schema:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

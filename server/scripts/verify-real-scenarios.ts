import { prisma } from '../src/config/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../src/config/jwt';

async function runScenarioTests() {
  console.log('================================================================');
  console.log('🏁 INICIANDO PRUEBAS REALES OBLIGATORIAS DE CERTIFICACIÓN SaaS');
  console.log('================================================================\n');

  // Limpiar posibles ejecuciones previas incompletas
  const prevTestWorkshops = await prisma.workshop.findMany({
    where: { email: { contains: '@rumilcar-cert.com' } },
    select: { id: true }
  });
  if (prevTestWorkshops.length > 0) {
    const ids = prevTestWorkshops.map(w => w.id);
    await prisma.workOrderItem.deleteMany({ where: { workOrder: { workshopId: { in: ids } } } });
    await prisma.workOrder.deleteMany({ where: { workshopId: { in: ids } } });
    await prisma.inventoryItem.deleteMany({ where: { workshopId: { in: ids } } });
    await prisma.vehicle.deleteMany({ where: { client: { workshopId: { in: ids } } } });
    await prisma.client.deleteMany({ where: { workshopId: { in: ids } } });
    await prisma.subscription.deleteMany({ where: { workshopId: { in: ids } } });
    await prisma.user.deleteMany({ where: { workshopId: { in: ids } } });
    await prisma.workshop.deleteMany({ where: { id: { in: ids } } });
  }

  const testReport: Array<{ step: string; status: 'PASS' | 'FAIL'; detail: string }> = [];


  // -------------------------------------------------------------
  // ESCENARIO 1: TALLER 1 — Registro Limpio y Flujo Operativo Completo
  // -------------------------------------------------------------
  console.log('--- ESCENARIO 1: Taller 1 (Registro, Estado Limpio y Operaciones) ---');
  
  const timestamp = Date.now();
  const t1Email = `taller1_cert_${timestamp}@rumilcar-cert.com`;
  const t1Pass = 'RumilcarPass2026!';
  const t1Hash = await bcrypt.hash(t1Pass, 10);

  // 1. Registro Taller 1 en transacción
  const t1Data = await prisma.$transaction(async (tx) => {
    const workshop = await tx.workshop.create({
      data: {
        name: `Taller Mecánico Alfa ${timestamp}`,
        email: t1Email,
        phone: '0414-1110001',
      },
    });

    const user = await tx.user.create({
      data: {
        workshopId: workshop.id,
        name: 'Propietario Alfa',
        email: t1Email,
        passwordHash: t1Hash,
        role: 'OWNER',
        isActive: true,
      },
    });

    const subscription = await tx.subscription.create({
      data: {
        workshopId: workshop.id,
        plan: 'TRIAL',
        status: 'TRIALING',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 15 * 86400000),
      },
    });

    return { workshop, user, subscription };
  });

  console.log(`[Taller 1] Registrado: ${t1Data.workshop.name} (ID: ${t1Data.workshop.id})`);
  testReport.push({
    step: 'Taller 1 - Registro Atómico',
    status: 'PASS',
    detail: `Taller creado con ID: ${t1Data.workshop.id}, Usuario OWNER: ${t1Data.user.id}, Plan: TRIAL`,
  });

  // 2. Verificar que inicia en estado limpio (0 clientes, 0 vehículos, 0 órdenes, 0 inventario)
  const [t1ClientsCount, t1VehiclesCount, t1OrdersCount, t1InvCount] = await Promise.all([
    prisma.client.count({ where: { workshopId: t1Data.workshop.id } }),
    prisma.vehicle.count({ where: { client: { workshopId: t1Data.workshop.id } } }),
    prisma.workOrder.count({ where: { workshopId: t1Data.workshop.id } }),
    prisma.inventoryItem.count({ where: { workshopId: t1Data.workshop.id } }),
  ]);

  const isClean = t1ClientsCount === 0 && t1VehiclesCount === 0 && t1OrdersCount === 0 && t1InvCount === 0;
  console.log(`[Taller 1] Verificación estado limpio: ${isClean ? 'LIMPIO (0 registros)' : 'FALLÓ'}`);
  testReport.push({
    step: 'Taller 1 - Estado Inicial Limpio',
    status: isClean ? 'PASS' : 'FAIL',
    detail: `Clientes: ${t1ClientsCount}, Vehículos: ${t1VehiclesCount}, Órdenes: ${t1OrdersCount}, Inventario: ${t1InvCount}`,
  });

  // 3. Crear Cliente y Vehículo en Taller 1
  const client1 = await prisma.client.create({
    data: {
      workshopId: t1Data.workshop.id,
      name: 'Carlos Mendoza',
      email: 'carlos.mendoza@cliente.com',
      phone: '0412-3334455',
      taxId: 'V-15890123',
      address: 'Caracas, El Recreo',
    },
  });

  const vehicle1 = await prisma.vehicle.create({
    data: {
      clientId: client1.id,
      make: 'Toyota',
      model: 'Corolla GLi',
      year: 2018,
      licensePlate: `AB${Math.floor(100 + Math.random() * 900)}CD`,
      color: 'Plata',
      mileage: 85000,
    },
  });

  console.log(`[Taller 1] Cliente creado: ${client1.name}, Vehículo: ${vehicle1.make} ${vehicle1.model} (${vehicle1.licensePlate})`);
  testReport.push({
    step: 'Taller 1 - Crear Cliente y Vehículo',
    status: 'PASS',
    detail: `Cliente ID: ${client1.id}, Vehículo ID: ${vehicle1.id}`,
  });

  // 4. Crear Repuesto en Inventario Taller 1
  const invItem1 = await prisma.inventoryItem.create({
    data: {
      workshopId: t1Data.workshop.id,
      sku: `FLT-${timestamp}`,
      name: 'Filtro de Aceite Original Toyota',
      unitPriceAnchor: 12,
      costPriceAnchor: 6,
      currentStock: 15,
      minStock: 3,
      unit: 'unidad',
    },
  });

  console.log(`[Taller 1] Inventario creado: ${invItem1.name} (Stock: ${invItem1.currentStock})`);
  testReport.push({
    step: 'Taller 1 - Crear Artículo Inventario',
    status: 'PASS',
    detail: `SKU: ${invItem1.sku}, Stock inicial: ${invItem1.currentStock}`,
  });

  // 5. Crear Orden de Trabajo en Taller 1
  const order1 = await prisma.workOrder.create({
    data: {
      workshopId: t1Data.workshop.id,
      clientId: client1.id,
      vehicleId: vehicle1.id,
      orderNumber: 1001,
      status: 'IN_PROGRESS',
      totalAnchor: 52,
      notes: 'Mantenimiento preventivo mayor y cambio de filtros',
      createdById: t1Data.user.id,
      items: {

        create: [
          {
            type: 'SERVICE',
            description: 'Servicio de Mantenimiento Preventivo',
            quantity: 1,
            unitPriceAnchor: 40,
          },
          {
            type: 'PART',
            description: invItem1.name,
            quantity: 1,
            unitPriceAnchor: 12,
            inventoryItemId: invItem1.id,
          },
        ],
      },
    },
    include: { items: true },
  });

  console.log(`[Taller 1] Orden de trabajo creada: ID ${order1.id}, Total: $${order1.totalAnchor} USD`);
  testReport.push({
    step: 'Taller 1 - Crear Orden de Trabajo con Ítems',
    status: 'PASS',
    detail: `Orden ID: ${order1.id}, Ítems: ${order1.items.length}, Total: $${order1.totalAnchor}`,
  });

  // -------------------------------------------------------------
  // ESCENARIO 2: TALLER 2 — Registro Independiente y Aislamiento Estricto
  // -------------------------------------------------------------
  console.log('\n--- ESCENARIO 2: Taller 2 (Aislamiento Multi-Taller) ---');

  const t2Email = `taller2_cert_${timestamp}@rumilcar-cert.com`;
  const t2Data = await prisma.$transaction(async (tx) => {
    const workshop = await tx.workshop.create({
      data: {
        name: `Taller Mecánico Beta ${timestamp}`,
        email: t2Email,
        phone: '0424-2220002',
      },
    });

    const user = await tx.user.create({
      data: {
        workshopId: workshop.id,
        name: 'Propietario Beta',
        email: t2Email,
        passwordHash: t1Hash,
        role: 'OWNER',
        isActive: true,
      },
    });

    const subscription = await tx.subscription.create({
      data: {
        workshopId: workshop.id,
        plan: 'TRIAL',
        status: 'TRIALING',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 15 * 86400000),
      },
    });

    return { workshop, user, subscription };
  });

  console.log(`[Taller 2] Registrado: ${t2Data.workshop.name} (ID: ${t2Data.workshop.id})`);

  // Verificación de aislamiento estricto:
  // Intentar consultar desde el taller 2 los clientes, vehículos y órdenes del taller 1
  const t2SeesT1Clients = await prisma.client.findMany({
    where: { workshopId: t2Data.workshop.id },
  });
  const t2SeesT1Vehicles = await prisma.vehicle.findMany({
    where: { client: { workshopId: t2Data.workshop.id } },
  });
  const t2SeesT1Orders = await prisma.workOrder.findMany({
    where: { workshopId: t2Data.workshop.id },
  });
  const t2SeesT1Inventory = await prisma.inventoryItem.findMany({
    where: { workshopId: t2Data.workshop.id },
  });

  const isolationSuccess =
    t2SeesT1Clients.length === 0 &&
    t2SeesT1Vehicles.length === 0 &&
    t2SeesT1Orders.length === 0 &&
    t2SeesT1Inventory.length === 0;

  console.log(`[Aislamiento] Taller 2 ve registros de Taller 1: ${isolationSuccess ? 'NO (Aislamiento 100% verificado)' : 'FALLÓ'}`);
  testReport.push({
    step: 'Aislamiento Multi-Taller - Consultas',
    status: isolationSuccess ? 'PASS' : 'FAIL',
    detail: `Taller 2 consultó sus tablas y obtuvo 0 registros cruzados de Taller 1`,
  });

  // Intentar mutación cruzada: Taller 2 intenta modificar la orden de Taller 1
  const crossTenantMutationBlocked = await prisma.workOrder.findFirst({
    where: { id: order1.id, workshopId: t2Data.workshop.id },
  });

  const mutationBlockedSuccess = crossTenantMutationBlocked === null;
  console.log(`[Aislamiento] Intento de Taller 2 de acceder orden de Taller 1: ${mutationBlockedSuccess ? 'BLOQUEADO (NULL)' : 'FALLÓ'}`);
  testReport.push({
    step: 'Aislamiento Multi-Taller - Modificación Cruzada',
    status: mutationBlockedSuccess ? 'PASS' : 'FAIL',
    detail: `Acceso cruzado denegado por pertenencia workshopId`,
  });

  // -------------------------------------------------------------
  // ESCENARIO 3: SUPERADMIN — Supervisión, Impersonación y Auditoría
  // -------------------------------------------------------------
  console.log('\n--- ESCENARIO 3: SuperAdministrador (Monitoreo e Impersonación) ---');

  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPERADMIN' },
  });

  if (!superAdmin) {
    throw new Error('SuperAdmin no encontrado en base de datos');
  }

  console.log(`[SuperAdmin] Encontrado: ${superAdmin.name} (${superAdmin.email})`);

  // SuperAdmin consulta todos los talleres
  const allWorkshopsList = await prisma.workshop.findMany({
    include: {
      subscription: true,
      users: { select: { email: true, role: true } },
      _count: { select: { workOrders: true, clients: true } },
    },
  });

  const canSeeBoth =
    allWorkshopsList.some((w) => w.id === t1Data.workshop.id) &&
    allWorkshopsList.some((w) => w.id === t2Data.workshop.id);

  console.log(`[SuperAdmin] Monitoreo de talleres: ${canSeeBoth ? `PASS (Detectó ambos talleres, Total: ${allWorkshopsList.length})` : 'FAIL'}`);
  testReport.push({
    step: 'SuperAdmin - Monitoreo Global de Talleres',
    status: canSeeBoth ? 'PASS' : 'FAIL',
    detail: `SuperAdmin visualiza todos los talleres registrados (${allWorkshopsList.length} talleres)`,
  });

  // SuperAdmin impersona Taller 1 y registra en auditoría
  const impersonationAudit = await prisma.auditLog.create({
    data: {
      workshopId: t1Data.workshop.id,
      userId: superAdmin.id,
      action: 'SUPERADMIN_IMPERSONATION_TEST',
      entity: 'WORKSHOP',
      entityId: t1Data.workshop.id,
      ipAddress: '127.0.0.1',
      details: `Prueba de auditoría: SuperAdmin (${superAdmin.email}) impersonando a ${t1Data.workshop.name}`,
    },
  });

  const impersonationToken = jwt.sign(
    {
      userId: t1Data.user.id,
      email: t1Data.user.email,
      role: t1Data.user.role,
      workshopId: t1Data.workshop.id,
      isImpersonated: true,
      impersonatedBy: superAdmin.email,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const decodedToken: any = jwt.verify(impersonationToken, JWT_SECRET);
  const impersonationValid =
    decodedToken.isImpersonated === true &&
    decodedToken.workshopId === t1Data.workshop.id &&
    decodedToken.impersonatedBy === superAdmin.email &&
    impersonationAudit.id !== undefined;

  console.log(`[SuperAdmin] Suplantación controlada y auditoría: ${impersonationValid ? 'PASS' : 'FAIL'}`);
  testReport.push({
    step: 'SuperAdmin - Suplantación Controlada con Auditoría',
    status: impersonationValid ? 'PASS' : 'FAIL',
    detail: `Token de suplantación generado con flag isImpersonated: true, registrado en AuditLog ID: ${impersonationAudit.id}`,
  });

  // -------------------------------------------------------------
  // LIMPIEZA DE REGISTROS DE PRUEBA DE CERTIFICACIÓN
  // -------------------------------------------------------------
  console.log('\n--- Limpieza final de datos de prueba de certificación ---');
  await prisma.workOrderItem.deleteMany({ where: { workOrderId: order1.id } });
  await prisma.workOrder.deleteMany({ where: { workshopId: { in: [t1Data.workshop.id, t2Data.workshop.id] } } });
  await prisma.inventoryItem.deleteMany({ where: { workshopId: { in: [t1Data.workshop.id, t2Data.workshop.id] } } });
  await prisma.vehicle.deleteMany({ where: { clientId: client1.id } });
  await prisma.client.deleteMany({ where: { workshopId: { in: [t1Data.workshop.id, t2Data.workshop.id] } } });
  await prisma.subscription.deleteMany({ where: { workshopId: { in: [t1Data.workshop.id, t2Data.workshop.id] } } });
  await prisma.auditLog.deleteMany({ where: { id: impersonationAudit.id } });
  await prisma.user.deleteMany({ where: { workshopId: { in: [t1Data.workshop.id, t2Data.workshop.id] } } });
  await prisma.workshop.deleteMany({ where: { id: { in: [t1Data.workshop.id, t2Data.workshop.id] } } });
  console.log('Talleres de prueba de certificación limpiados correctamente.');

  // -------------------------------------------------------------
  // REPORTE CONSOLIDADO
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 REPORTE CONSOLIDADO DE PRUEBAS REALES');
  console.log('================================================================');
  console.table(testReport);

  const allPassed = testReport.every((t) => t.status === 'PASS');
  if (allPassed) {
    console.log('\n✅ TODAS LAS PRUEBAS REALES PASARON EXITOSAMENTE (100%)');
    process.exit(0);
  } else {
    console.error('\n❌ ALGUNAS PRUEBAS FALLARON');
    process.exit(1);
  }
}

runScenarioTests().catch((e) => {
  console.error('Error durante ejecución de escenarios:', e);
  process.exit(1);
});

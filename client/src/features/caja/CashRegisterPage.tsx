import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCashStore, PaymentMethod, CashTransaction } from '../../store/useCashStore';
import { useExpenseStore, Gasto, ExpenseCategory } from '../../store/useExpenseStore';
import { usePayrollStore, PagoMecanico, ConfigNominaMecanico } from '../../store/usePayrollStore';
import { useWorkOrderStore, WorkOrder } from '../../store/useWorkOrderStore';
import { Button, Card, EmptyState, Modal } from '../../components/ui';
import { AntiInflationTab } from './tabs/AntiInflationTab';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3, 
  Receipt, 
  Users, 
  Calendar, 
  Plus, 
  Search, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Printer, 
  Download, 
  Trash2, 
  Edit2, 
  Eye, 
  RefreshCw, 
  AlertCircle,
  CreditCard,
  Building2,
  Wrench,
  XCircle,
  Briefcase
} from 'lucide-react';

export const CashRegisterPage: React.FC = () => {
  // Store hooks
  const { 
    isOpened, 
    openedAt, 
    openingBalanceUSD, 
    transactions, 
    exchangeRateVES, 
    openBox, 
    closeBoxWithAudit, 
    addTransaction, 
    getBalances,
    closureHistory
  } = useCashStore();

  const { gastos, customCategories, addGasto, deleteGasto, addCustomCategory } = useExpenseStore();
  const { configs, payments: payrollPayments, saveMechanicConfig, addPayrollPayment, deletePayrollPayment } = usePayrollStore();
  const { workOrders } = useWorkOrderStore();

  // Navigation state
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'resumen' | 'ingresos' | 'egresos' | 'proteccion' | null;
  const [activeTab, setActiveTab] = useState<'resumen' | 'ingresos' | 'egresos' | 'proteccion'>(
    tabParam || 'resumen'
  );
  const [egresosSubTab, setEgresosSubTab] = useState<'gastos' | 'nomina'>('gastos');

  React.useEffect(() => {
    if (tabParam && ['resumen', 'ingresos', 'egresos', 'proteccion'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Controls state
  const [period, setPeriod] = useState<'HOY' | 'SEMANA' | 'MES' | 'ANO' | 'TODOS'>('MES');
  const [currencyDisplay, setCurrencyDisplay] = useState<'USD' | 'VES'>('USD');

  // Box Open / Close Audit Modal state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openBalanceInput, setOpenBalanceInput] = useState('50.00');

  const [showAuditCloseModal, setShowAuditCloseModal] = useState(false);
  const [reportedMap, setReportedMap] = useState<Record<PaymentMethod, number>>({
    'Efectivo': 0,
    'Pago Movil': 0,
    'Transferencia': 0,
    'Zelle': 0,
    'USDT': 0,
    'Punto de Venta': 0
  });
  const [closeAuditNotes, setCloseAuditNotes] = useState('');

  // Expenses Modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<string>('Servicios Básico');
  const [expDesc, setExpDesc] = useState('');
  const [expMonto, setExpMonto] = useState<number>(0);
  const [expMoneda, setExpMoneda] = useState<'USD' | 'VES' | 'USDT'>('USD');
  const [expMetodo, setExpMetodo] = useState<PaymentMethod>('Efectivo');
  const [expEsRecurrente, setExpEsRecurrente] = useState(false);
  const [expFrecuencia, setExpFrecuencia] = useState<'semanal' | 'quincenal' | 'mensual' | 'anual'>('mensual');
  const [expVencimiento, setExpVencimiento] = useState('');
  const [expNotas, setExpNotas] = useState('');

  // Payroll Period & Payment Modal state
  const [payrollPeriodStart, setPayrollPeriodStart] = useState<string>(
    new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [payrollPeriodEnd, setPayrollPeriodEnd] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const [selectedMechanicForPayment, setSelectedMechanicForPayment] = useState<{
    mecanicoId: string;
    mecanicoNombre: string;
    devengadoUSD: number;
    pagadoUSD: number;
    saldoUSD: number;
  } | null>(null);

  const [payAmountUSD, setPayAmountUSD] = useState<number>(0);
  const [payMoneda, setPayMoneda] = useState<'USD' | 'VES' | 'USDT'>('USD');
  const [payMetodo, setPayMetodo] = useState<PaymentMethod>('Efectivo');
  const [payNotas, setPayNotas] = useState('');

  // Mechanic history modal state
  const [selectedMechHistory, setSelectedMechHistory] = useState<string | null>(null);

  // Mechanic Scheme Edit state
  const [editingSchemeItem, setEditingSchemeItem] = useState<any | null>(null);
  const [schemeType, setSchemeType] = useState<'porcentaje' | 'fijo' | 'mixto'>('porcentaje');
  const [schemePct, setSchemePct] = useState<number>(30);
  const [schemeFixed, setSchemeFixed] = useState<number>(200);

  const handleOpenConfigSchemeModal = (item: any) => {
    setEditingSchemeItem(item);
    setSchemeType(item.config.esquema || 'porcentaje');
    setSchemePct(item.config.porcentajeServicios || 30);
    setSchemeFixed(item.config.montoFijo || 200);
  };

  const handleSaveScheme = () => {
    if (!editingSchemeItem) return;
    saveMechanicConfig({
      mecanicoId: editingSchemeItem.mech.id,
      mecanicoNombre: editingSchemeItem.mech.nombre,
      esquema: schemeType,
      porcentajeServicios: schemePct,
      montoFijo: schemeFixed,
      montoBaseMixto: schemeFixed / 2,
      porcentajeMixtoServicios: schemePct / 2
    });
    setEditingSchemeItem(null);
    alert(`¡Esquema de pago actualizado para ${editingSchemeItem.mech.nombre}!`);
  };

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('TODOS');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODOS');

  // Rate multiplier for formatting
  const rate = exchangeRateVES || 40.0;
  const isVes = currencyDisplay === 'VES';

  const formatMoney = (amountUSD: number) => {
    if (isVes) {
      const ves = amountUSD * rate;
      return `Bs. ${ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  // -------------------------------------------------------------
  // PERIOD FILTER LOGIC
  // -------------------------------------------------------------
  const now = new Date();
  const filterByDateRange = (dateStr: string) => {
    const d = new Date(dateStr);
    if (period === 'TODOS') return true;
    if (period === 'HOY') return d.toDateString() === now.toDateString();
    if (period === 'SEMANA') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= sevenDaysAgo;
    }
    if (period === 'MES') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'ANO') return d.getFullYear() === now.getFullYear();
    return true;
  };

  // Filtered transactions for income
  const filteredIngresos = transactions.filter(t => t.tipo === 'ingreso' && filterByDateRange(t.fecha));
  const filteredEgresos = gastos.filter(g => filterByDateRange(g.fecha));

  // Calculated Financial Metrics for Resumen
  const totalIngresosUSD = filteredIngresos.reduce((acc, t) => acc + t.montoUSD, 0);
  const totalEgresosUSD = filteredEgresos.reduce((acc, g) => acc + g.montoUSD, 0);
  const gananciaNetaUSD = totalIngresosUSD - totalEgresosUSD;
  const margenNetoPercent = totalIngresosUSD > 0 ? ((gananciaNetaUSD / totalIngresosUSD) * 100) : 0;

  // Breakdown of Egresos by Category
  const expenseCategoryMap: Record<string, number> = {};
  filteredEgresos.forEach(g => {
    const cat = g.categoria || 'Otros';
    expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + g.montoUSD;
  });

  const categoryBreakdownList = Object.entries(expenseCategoryMap)
    .map(([cat, total]) => ({
      category: cat,
      totalUSD: total,
      percent: totalEgresosUSD > 0 ? (total / totalEgresosUSD) * 100 : 0
    }))
    .sort((a, b) => b.totalUSD - a.totalUSD);

  // Breakdown of Ingresos by Payment Method
  const currentBalances = getBalances();
  const incomeMethodsList: { method: PaymentMethod; totalUSD: number; percent: number }[] = [
    { method: 'Efectivo', totalUSD: currentBalances.efectivoUSD, percent: currentBalances.totalUSD > 0 ? (currentBalances.efectivoUSD / currentBalances.totalUSD) * 100 : 0 },
    { method: 'Pago Movil', totalUSD: currentBalances.pagoMovilUSD, percent: currentBalances.totalUSD > 0 ? (currentBalances.pagoMovilUSD / currentBalances.totalUSD) * 100 : 0 },
    { method: 'Zelle', totalUSD: currentBalances.zelleUSD, percent: currentBalances.totalUSD > 0 ? (currentBalances.zelleUSD / currentBalances.totalUSD) * 100 : 0 },
    { method: 'USDT', totalUSD: currentBalances.usdtUSD, percent: currentBalances.totalUSD > 0 ? (currentBalances.usdtUSD / currentBalances.totalUSD) * 100 : 0 },
    { method: 'Punto de Venta', totalUSD: currentBalances.puntoVentaUSD, percent: currentBalances.totalUSD > 0 ? (currentBalances.puntoVentaUSD / currentBalances.totalUSD) * 100 : 0 },
    { method: 'Transferencia', totalUSD: currentBalances.transferenciaUSD, percent: currentBalances.totalUSD > 0 ? (currentBalances.transferenciaUSD / currentBalances.totalUSD) * 100 : 0 }
  ];

  // -------------------------------------------------------------
  // RECURRING EXPENSES ALERTS (3 Days advance notice)
  // -------------------------------------------------------------
  const recurringAlerts = gastos.filter(g => {
    if (!g.esRecurrente || !g.proximoVencimiento) return false;
    const dueDate = new Date(g.proximoVencimiento);
    const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 3 && diffDays >= -7; // Due in next 3 days or overdue up to 7 days
  });

  // -------------------------------------------------------------
  // PAYROLL COMPUTATION LOGIC
  // -------------------------------------------------------------
  // Mechanics list (from seed/configs + work orders)
  const mechanicsList = [
    { id: 'Carlos P.', nombre: 'Carlos Martínez (Carlos P.)' },
    { id: 'Pedro R.', nombre: 'Pedro Rodríguez (Pedro R.)' },
    { id: 'Luis G.', nombre: 'Luis García (Luis G.)' },
    { id: 'José H.', nombre: 'José Hernández (José H.)' }
  ];

  const payrollSummaryList = mechanicsList.map(mech => {
    const config = configs.find(c => c.mecanicoId === mech.id) || {
      mecanicoId: mech.id,
      mecanicoNombre: mech.nombre,
      esquema: 'porcentaje' as const,
      porcentajeServicios: 30
    };

    // Orders delivered in selected period
    const startDate = new Date(payrollPeriodStart);
    const endDate = new Date(payrollPeriodEnd + 'T23:59:59');

    const mechOrders = workOrders.filter(o => {
      const isMechMatch = o.mechanicName === mech.id || o.mechanicName === mech.nombre;
      const isCompleted = o.status === 'Finalizado' || o.status === 'Listo';
      const oDate = new Date(o.date);
      return isMechMatch && isCompleted && oDate >= startDate && oDate <= endDate;
    });

    const totalOrdersCount = mechOrders.length;

    // Services Total (strictly excluding parts)
    const totalServicesUSD = mechOrders.reduce((acc, order) => {
      const servSum = (order.services || []).reduce((sAcc, s) => sAcc + (s.price || 0), 0);
      return acc + servSum;
    }, 0);

    // Compute Devengado according to Scheme
    let devengadoUSD = 0;
    if (config.esquema === 'porcentaje') {
      devengadoUSD = totalServicesUSD * ((config.porcentajeServicios || 30) / 100);
    } else if (config.esquema === 'fijo') {
      devengadoUSD = config.montoFijo || 200;
    } else if (config.esquema === 'mixto') {
      const base = config.montoBaseMixto || 100;
      const com = totalServicesUSD * ((config.porcentajeMixtoServicios || 15) / 100);
      devengadoUSD = base + com;
    }

    // Payments already made in this period
    const mechPayments = payrollPayments.filter(p => p.mecanicoId === mech.id);
    const totalPagadoUSD = mechPayments.reduce((acc, p) => acc + p.montoPagadoUSD, 0);

    const saldoUSD = Math.max(0, devengadoUSD - totalPagadoUSD);

    return {
      mech,
      config,
      totalOrdersCount,
      totalServicesUSD,
      devengadoUSD,
      totalPagadoUSD,
      saldoUSD,
      isFullyPaid: saldoUSD <= 0.01
    };
  });

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleOpenBoxSubmit = () => {
    const val = parseFloat(openBalanceInput) || 0;
    openBox(val);
    setShowOpenModal(false);
  };

  const handleOpenAuditCloseModal = () => {
    const exp = getBalances();
    setReportedMap({
      'Efectivo': exp.efectivoUSD,
      'Pago Movil': exp.pagoMovilUSD,
      'Transferencia': exp.transferenciaUSD,
      'Zelle': exp.zelleUSD,
      'USDT': exp.usdtUSD,
      'Punto de Venta': exp.puntoVentaUSD
    });
    setCloseAuditNotes('');
    setShowAuditCloseModal(true);
  };

  const handleConfirmCloseBoxAudit = () => {
    closeBoxWithAudit(reportedMap, closeAuditNotes);
    setShowAuditCloseModal(false);
    alert('¡Caja cerrada exitosamente! El arqueo de cierre ha sido guardado en el historial.');
  };

  const handleSaveGasto = () => {
    if (!expDesc.trim()) return alert('Ingresa una descripción para el gasto.');
    if (expMonto <= 0) return alert('El monto del gasto debe ser mayor a 0.');

    const montoUSD = expMoneda === 'VES' ? expMonto / rate : expMonto;

    addGasto({
      categoria: expCategory,
      descripcion: expDesc,
      monto: expMonto,
      moneda: expMoneda,
      tasaAplicada: rate,
      montoUSD,
      metodoPago: expMetodo,
      fecha: new Date().toISOString(),
      esRecurrente: expEsRecurrente,
      frecuenciaRecurrencia: expEsRecurrente ? expFrecuencia : null,
      proximoVencimiento: expEsRecurrente && expVencimiento ? expVencimiento : null,
      notas: expNotas
    });

    setShowExpenseModal(false);
    setExpDesc('');
    setExpMonto(0);
    alert('¡Gasto registrado con éxito!');
  };

  const handleOpenPayrollPaymentModal = (item: any) => {
    setSelectedMechanicForPayment(item);
    setPayAmountUSD(item.saldoUSD);
    setPayMoneda('USD');
    setPayMetodo('Efectivo');
    setPayNotas('');
  };

  const handleConfirmPayrollPayment = () => {
    if (!selectedMechanicForPayment) return;
    if (payAmountUSD <= 0) return alert('El monto a pagar debe ser mayor a 0.');

    addPayrollPayment({
      mecanicoId: selectedMechanicForPayment.mecanicoId,
      mecanicoNombre: selectedMechanicForPayment.mecanicoNombre,
      periodoInicio: payrollPeriodStart,
      periodoFin: payrollPeriodEnd,
      montoDevengadoUSD: selectedMechanicForPayment.devengadoUSD,
      montoPagadoUSD: payAmountUSD,
      moneda: payMoneda,
      tasaAplicada: rate,
      metodoPago: payMetodo,
      fechaPago: new Date().toISOString(),
      notas: payNotas
    });

    setSelectedMechanicForPayment(null);
    alert('¡Pago de nómina registrado con éxito! Se ha creado la entrada de gasto automáticamente.');
  };

  const handlePrintPayrollReport = () => {
    window.print();
  };

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Caja & Finanzas</h1>
          <p className="page-subtitle">Control de ingresos, gastos operativos, nómina de mecánicos y arqueos de caja en USD/VES.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Period Selector */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            {[
              { id: 'HOY', label: 'Hoy' },
              { id: 'SEMANA', label: 'Esta Semana' },
              { id: 'MES', label: 'Este Mes' },
              { id: 'ANO', label: 'Este Año' },
              { id: 'TODOS', label: 'Histórico' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                style={{
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: period === p.id ? 700 : 500,
                  background: period === p.id ? 'var(--color-primary)' : 'transparent',
                  color: period === p.id ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Currency Toggle (USD / VES) */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setCurrencyDisplay('USD')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: currencyDisplay === 'USD' ? 800 : 500,
                background: currencyDisplay === 'USD' ? 'var(--color-success)' : 'transparent',
                color: currencyDisplay === 'USD' ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer'
              }}
            >
              💵 USD
            </button>
            <button
              onClick={() => setCurrencyDisplay('VES')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: currencyDisplay === 'VES' ? 800 : 500,
                background: currencyDisplay === 'VES' ? 'var(--color-primary)' : 'transparent',
                color: currencyDisplay === 'VES' ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer'
              }}
            >
              🇻🇪 VES (Bs)
            </button>
          </div>

          {/* Box Status Button */}
          {isOpened ? (
            <Button 
              style={{ background: 'var(--color-danger)', color: '#fff', borderColor: 'var(--color-danger)' }} 
              icon={<Lock size={16} />}
              onClick={handleOpenAuditCloseModal}
            >
              Cerrar Caja (Arqueo)
            </Button>
          ) : (
            <Button 
              style={{ background: 'var(--color-success)', color: '#fff', borderColor: 'var(--color-success)' }} 
              icon={<Unlock size={16} />}
              onClick={() => setShowOpenModal(true)}
            >
              Abrir Caja Registradora
            </Button>
          )}

        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px', paddingBottom: '4px' }}>
        <button
          onClick={() => { setActiveTab('resumen'); setSearchParams({ tab: 'resumen' }); }}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'resumen' ? 700 : 500,
            color: activeTab === 'resumen' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'resumen' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          📊 Resumen Financiero
        </button>
        <button
          onClick={() => { setActiveTab('ingresos'); setSearchParams({ tab: 'ingresos' }); }}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'ingresos' ? 700 : 500,
            color: activeTab === 'ingresos' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'ingresos' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          💵 Ingresos y Arqueo de Caja
        </button>
        <button
          onClick={() => { setActiveTab('egresos'); setSearchParams({ tab: 'egresos' }); }}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'egresos' ? 700 : 500,
            color: activeTab === 'egresos' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'egresos' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          💸 Egresos y Nómina
        </button>
        <button
          onClick={() => { setActiveTab('proteccion'); setSearchParams({ tab: 'proteccion' }); }}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'proteccion' ? 700 : 500,
            color: activeTab === 'proteccion' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'proteccion' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🛡️ Protección VES
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: RESUMEN FINANCIERO */}
      {/* ========================================================= */}
      {activeTab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top KPIs Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            
            <Card>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Ingresos Totales ({period})
              </div>
              <strong style={{ fontSize: '28px', color: 'var(--color-success)', display: 'block', marginTop: '6px' }}>
                {formatMoney(totalIngresosUSD)}
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {filteredIngresos.length} transacción(es)
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Egresos Totales ({period})
              </div>
              <strong style={{ fontSize: '28px', color: 'var(--color-danger)', display: 'block', marginTop: '6px' }}>
                {formatMoney(totalEgresosUSD)}
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {filteredEgresos.length} gasto(s) registrados
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Ganancia Neta
              </div>
              <strong style={{ fontSize: '28px', color: gananciaNetaUSD >= 0 ? 'var(--color-primary)' : 'var(--color-danger)', display: 'block', marginTop: '6px' }}>
                {formatMoney(gananciaNetaUSD)}
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Ingresos - Egresos
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Margen Neto (%)
              </div>
              <strong style={{ fontSize: '28px', color: 'var(--color-text-primary)', display: 'block', marginTop: '6px' }}>
                {margenNetoPercent.toFixed(1)}%
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600, marginTop: '4px' }}>
                Rentabilidad del taller
              </div>
            </Card>

          </div>

          {/* Flow Visualizer & Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            
            {/* Egresos breakdown list */}
            <Card title="Desglose de Egresos por Categoría">
              {categoryBreakdownList.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No hay gastos registrados en este período.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {categoryBreakdownList.map(item => (
                    <div key={item.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{item.category}</span>
                        <span><strong>{formatMoney(item.totalUSD)}</strong> ({item.percent.toFixed(0)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--color-bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.percent}%`, height: '100%', background: 'var(--color-danger)', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Income Methods Breakdown */}
            <Card title="Ingresos por Método de Pago">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {incomeMethodsList.map(item => (
                  <div key={item.method}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{item.method}</span>
                      <span><strong>{formatMoney(item.totalUSD)}</strong> ({item.percent.toFixed(0)}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--color-bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.percent}%`, height: '100%', background: 'var(--color-success)', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>

          {/* Export Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--color-bg-secondary)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <Button variant="outline" icon={<Download size={16} />} onClick={() => alert('Descargando archivo Excel con transacciones...')}>
              Descargar Excel
            </Button>
            <Button icon={<Printer size={16} />} onClick={() => window.print()}>
              Descargar Reporte PDF
            </Button>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: INGRESOS Y ARQUEO DE CAJA */}
      {/* ========================================================= */}
      {activeTab === 'ingresos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Box Status Banner */}
          <Card style={{ background: isOpened ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: isOpened ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <strong style={{ fontSize: '16px', color: isOpened ? 'var(--color-success)' : 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isOpened ? <Unlock size={18} /> : <Lock size={18} />}
                  Estado de la Caja: {isOpened ? 'ABIERTA' : 'CERRADA'}
                </strong>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {isOpened 
                    ? `Abierta el ${new Date(openedAt || '').toLocaleString()} · Fondo inicial: $${openingBalanceUSD.toFixed(2)} USD` 
                    : 'Debes abrir la caja registradora para procesar cobros y transacciones.'}
                </div>
              </div>

              <div>
                {isOpened ? (
                  <Button 
                    style={{ background: 'var(--color-danger)', color: '#fff', borderColor: 'var(--color-danger)' }} 
                    onClick={handleOpenAuditCloseModal}
                  >
                    Cerrar Caja (Realizar Arqueo)
                  </Button>
                ) : (
                  <Button 
                    style={{ background: 'var(--color-success)', color: '#fff', borderColor: 'var(--color-success)' }} 
                    onClick={() => setShowOpenModal(true)}
                  >
                    Abrir Caja Hoy
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Transactions Table */}
          <Card title="Historial de Transacciones de Ingreso">
            {filteredIngresos.length === 0 ? (
              <EmptyState 
                icon={<Receipt size={48} />}
                title="Sin cobros registrados en este período"
                description="Los cobros realizados en las órdenes de trabajo y POS aparecerán aquí automáticamene."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 8px' }}>ID / Fecha</th>
                      <th style={{ padding: '12px 8px' }}>Descripción</th>
                      <th style={{ padding: '12px 8px' }}>Método de Pago</th>
                      <th style={{ padding: '12px 8px' }}>Referencia</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Monto Cobrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngresos.map(tx => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <strong style={{ color: 'var(--color-primary)' }}>{tx.id}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(tx.fecha).toLocaleString()}</div>
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 600 }}>{tx.descripcion}</div>
                          {tx.orderId && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Orden #{tx.orderId}</div>}
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', fontSize: '11px', fontWeight: 600 }}>
                            {tx.metodo}
                          </span>
                        </td>

                        <td style={{ padding: '12px 8px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {tx.referencia || '-'}
                        </td>

                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-success)', fontSize: '15px' }}>
                          +{formatMoney(tx.montoUSD)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Closure History */}
          {closureHistory.length > 0 && (
            <Card title="Historial de Arqueos y Cierres de Caja">
              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 8px' }}># Cierre / Fecha</th>
                      <th style={{ padding: '12px 8px' }}>Monto Esperado</th>
                      <th style={{ padding: '12px 8px' }}>Diferencia Total</th>
                      <th style={{ padding: '12px 8px' }}>Notas de Arqueo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closureHistory.map(ch => (
                      <tr key={ch.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <strong style={{ color: 'var(--color-primary)' }}>{ch.id}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(ch.closedAt).toLocaleString()}</div>
                        </td>

                        <td style={{ padding: '12px 8px', fontWeight: 700 }}>
                          ${ch.closingBalanceUSD.toFixed(2)} USD
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ 
                            fontWeight: 700,
                            color: ch.totalDifferenceUSD === 0 ? 'var(--color-success)' : ch.totalDifferenceUSD > 0 ? 'var(--color-primary)' : 'var(--color-danger)' 
                          }}>
                            {ch.totalDifferenceUSD > 0 ? `+${ch.totalDifferenceUSD.toFixed(2)}` : ch.totalDifferenceUSD.toFixed(2)} USD
                          </span>
                        </td>

                        <td style={{ padding: '12px 8px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                          {ch.notes || 'Arqueo sin novedades'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: EGRESOS Y NÓMINA */}
      {/* ========================================================= */}
      {activeTab === 'egresos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Sub-tabs header */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
            <button
              onClick={() => setEgresosSubTab('gastos')}
              style={{
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: egresosSubTab === 'gastos' ? 700 : 500,
                background: egresosSubTab === 'gastos' ? 'var(--color-primary)' : 'transparent',
                color: egresosSubTab === 'gastos' ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer'
              }}
            >
              💸 Gastos Operativos ({gastos.length})
            </button>
            <button
              onClick={() => setEgresosSubTab('nomina')}
              style={{
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: egresosSubTab === 'nomina' ? 700 : 500,
                background: egresosSubTab === 'nomina' ? 'var(--color-primary)' : 'transparent',
                color: egresosSubTab === 'nomina' ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer'
              }}
            >
              👥 Nómina de Mecánicos
            </button>
          </div>

          {/* SUB-TAB 3A: GASTOS OPERATIVOS */}
          {egresosSubTab === 'gastos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Recurring Expenses Banner Alert */}
              {recurringAlerts.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', color: 'var(--color-warning)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertTriangle size={22} />
                    <div>
                      <strong style={{ fontSize: '14px' }}>⚠️ Alerta de Gastos Recurrentes Vencidos o Próximos</strong>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        {recurringAlerts.map(g => `${g.categoria}: $${g.montoUSD.toFixed(2)} (${g.descripcion})`).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setShowExpenseModal(true)} icon={<Plus size={14} />}>
                    Registrar Pago
                  </Button>
                </div>
              )}

              {/* Main Expenses Card */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: '260px', display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 12px' }}>
                    <Search size={16} color="var(--color-text-muted)" />
                    <input 
                      type="text" 
                      placeholder="Buscar por descripción o categoría..." 
                      style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)', fontSize: '13px' }}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <Button onClick={() => setShowExpenseModal(true)} icon={<Plus size={18} />}>
                    + Registrar Gasto
                  </Button>
                </div>

                {filteredEgresos.length === 0 ? (
                  <EmptyState 
                    icon={<TrendingDown size={48} />}
                    title="Sin gastos registrados"
                    description="Registra servicios básicos, alquileres, insumos y compras de inventario."
                    action={{ label: "Registrar primer gasto", onClick: () => setShowExpenseModal(true) }}
                  />
                ) : (
                  <div className="table-responsive">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px 8px' }}>Fecha / Categoría</th>
                          <th style={{ padding: '12px 8px' }}>Descripción</th>
                          <th style={{ padding: '12px 8px' }}>Método de Pago</th>
                          <th style={{ padding: '12px 8px' }}>Recurrente</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right' }}>Monto</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEgresos.map(g => (
                          <tr key={g.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                            <td style={{ padding: '12px 8px' }}>
                              <strong style={{ color: 'var(--color-text-primary)' }}>{g.categoria}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(g.fecha).toLocaleDateString()}</div>
                            </td>

                            <td style={{ padding: '12px 8px' }}>
                              <div>{g.descripcion}</div>
                              {g.isPayrollAuto && <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-info)', padding: '2px 6px', borderRadius: '4px' }}>Auto Nómina</span>}
                            </td>

                            <td style={{ padding: '12px 8px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', fontSize: '11px', fontWeight: 600 }}>
                                {g.metodoPago}
                              </span>
                            </td>

                            <td style={{ padding: '12px 8px' }}>
                              {g.esRecurrente ? (
                                <span style={{ padding: '2px 6px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                  🔄 {g.frecuenciaRecurrencia}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Único</span>
                              )}
                            </td>

                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-danger)', fontSize: '15px' }}>
                              -{formatMoney(g.montoUSD)}
                            </td>

                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              <button className="icon-btn" onClick={() => deleteGasto(g.id)} style={{ color: 'var(--color-danger)' }} title="Eliminar">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

            </div>
          )}

          {/* SUB-TAB 3B: NÓMINA DE MECÁNICOS */}
          {egresosSubTab === 'nomina' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Payroll Period Control Card */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <strong style={{ fontSize: '15px' }}>Período de Nómina:</strong>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                      <input 
                        type="date" 
                        className="input-field" 
                        value={payrollPeriodStart} 
                        onChange={e => setPayrollPeriodStart(e.target.value)} 
                        style={{ width: '150px' }}
                      />
                      <span>hasta</span>
                      <input 
                        type="date" 
                        className="input-field" 
                        value={payrollPeriodEnd} 
                        onChange={e => setPayrollPeriodEnd(e.target.value)} 
                        style={{ width: '150px' }}
                      />
                    </div>
                  </div>

                  <Button variant="outline" icon={<Printer size={16} />} onClick={handlePrintPayrollReport}>
                    Descargar Reporte de Nómina PDF
                  </Button>
                </div>
              </Card>

              {/* Payroll Summary Table */}
              <Card title="Liquidación de Nómina por Mecánico">
                <div className="table-responsive">
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 8px' }}>Mecánico</th>
                        <th style={{ padding: '12px 8px' }}>Esquema de Pago</th>
                        <th style={{ padding: '12px 8px' }}>Órdenes / Servicios</th>
                        <th style={{ padding: '12px 8px' }}>Devengado</th>
                        <th style={{ padding: '12px 8px' }}>Pagado</th>
                        <th style={{ padding: '12px 8px' }}>Saldo Pendiente</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollSummaryList.map(item => (
                        <tr key={item.mech.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <strong style={{ color: 'var(--color-text-primary)' }}>{item.mech.nombre}</strong>
                          </td>

                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', fontSize: '11px', fontWeight: 600 }}>
                                {item.config.esquema === 'porcentaje' ? `${item.config.porcentajeServicios}% sobre servicios` : item.config.esquema === 'fijo' ? `$${item.config.montoFijo} fijo` : 'Mixto (Base + %)'}
                              </span>
                              <button 
                                className="icon-btn" 
                                title="Cambiar / Editar Esquema de Pago"
                                onClick={() => handleOpenConfigSchemeModal(item)}
                              >
                                <Edit2 size={13} />
                              </button>
                            </div>
                          </td>

                          <td style={{ padding: '12px 8px' }}>
                            <div><strong>{item.totalOrdersCount}</strong> orden(es)</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Servicios: ${item.totalServicesUSD.toFixed(2)} USD</div>
                          </td>

                          <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--color-primary)' }}>
                            ${item.devengadoUSD.toFixed(2)} USD
                          </td>

                          <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--color-success)' }}>
                            ${item.totalPagadoUSD.toFixed(2)} USD
                          </td>

                          <td style={{ padding: '12px 8px' }}>
                            {item.isFullyPaid ? (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', fontSize: '11px', fontWeight: 700 }}>
                                ✓ Pagado
                              </span>
                            ) : (
                              <strong style={{ color: 'var(--color-danger)' }}>
                                ${item.saldoUSD.toFixed(2)} USD
                              </strong>
                            )}
                          </td>

                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              {!item.isFullyPaid && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleOpenPayrollPaymentModal(item)}
                                >
                                  Pagar
                                </Button>
                              )}
                              <button 
                                className="icon-btn" 
                                onClick={() => setSelectedMechHistory(item.mech.id)} 
                                title="Ver Historial"
                              >
                                <Eye size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: 🛡️ PROTECCIÓN VES                                  */}
      {/* ========================================================= */}
      {activeTab === 'proteccion' && (
        <AntiInflationTab />
      )}

      {/* MODAL APERTURA CAJA */}
      {showOpenModal && (
        <Modal 
          isOpen={true} 
          title="Abrir Caja Registradora Hoy" 
          onClose={() => setShowOpenModal(false)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowOpenModal(false)}>Cancelar</Button>
              <Button onClick={handleOpenBoxSubmit} icon={<Unlock size={16} />}>Confirmar Apertura</Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Monto Inicial en Efectivo (Fondo de Gaveta en USD)</label>
              <input 
                type="number" 
                step="0.01"
                className="input-field" 
                value={openBalanceInput} 
                onChange={e => setOpenBalanceInput(e.target.value)} 
                placeholder="50.00" 
              />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                Este monto servirá de base inicial para dar cambio durante la jornada.
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL ARQUEO DE CIERRE DE CAJA */}
      {showAuditCloseModal && (
        <Modal 
          isOpen={true} 
          title="Arqueo y Cierre de Caja Registradora" 
          onClose={() => setShowAuditCloseModal(false)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowAuditCloseModal(false)}>Cancelar</Button>
              <Button onClick={handleConfirmCloseBoxAudit} icon={<Lock size={16} />}>Confirmar Arqueo y Cerrar Caja</Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
              <strong>Ingresa los montos contados físicamente al final del día:</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {incomeMethodsList.map(item => {
                const reported = reportedMap[item.method] || 0;
                const diff = reported - item.totalUSD;
                return (
                  <div key={item.method} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', alignItems: 'center', background: 'var(--color-bg-secondary)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                    <div>
                      <strong>{item.method}</strong>
                      <div style={{ color: 'var(--color-text-muted)' }}>Esperado: ${item.totalUSD.toFixed(2)}</div>
                    </div>

                    <div>
                      <input 
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={reported === 0 ? '' : reported}
                        onChange={e => setReportedMap({ ...reportedMap, [item.method]: parseFloat(e.target.value) || 0 })}
                        placeholder="Contado ($)"
                        style={{ fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ textAlign: 'right', fontWeight: 700, color: diff === 0 ? 'var(--color-success)' : diff > 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                      Dif: {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} $
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Notas de Arqueo</label>
              <textarea 
                className="input-field" 
                style={{ minHeight: '50px' }}
                value={closeAuditNotes} 
                onChange={e => setCloseAuditNotes(e.target.value)} 
                placeholder="Detalla cualquier diferencia o justificación..." 
              />
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL REGISTRAR GASTO OPERATIVO */}
      {showExpenseModal && (
        <Modal 
          isOpen={true} 
          title="Registrar Nuevo Gasto Operativo" 
          onClose={() => setShowExpenseModal(false)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowExpenseModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveGasto} icon={<CheckCircle size={16} />}>Guardar Gasto</Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Categoría de Gasto</label>
              <select 
                className="input-field"
                value={expCategory}
                onChange={e => setExpCategory(e.target.value)}
              >
                {['Electricidad', 'Agua', 'Internet', 'Teléfono', 'Alquiler', 'Mantenimiento Local', 'Compras Inventario', 'Herramientas', 'Combustible', 'Limpieza', 'Publicidad', 'Otros', ...customCategories].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Descripción del Gasto</label>
              <input 
                type="text" 
                className="input-field" 
                value={expDesc} 
                onChange={e => setExpDesc(e.target.value)} 
                placeholder="Ej: Factura Corpoelec Agosto, Alquiler local Septiembre..." 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Monto</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input-field" 
                  value={expMonto === 0 ? '' : expMonto} 
                  onChange={e => setExpMonto(parseFloat(e.target.value) || 0)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Moneda</label>
                <select className="input-field" value={expMoneda} onChange={e => setExpMoneda(e.target.value as any)}>
                  <option value="USD">USD ($)</option>
                  <option value="VES">VES (Bs)</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Método Pago</label>
                <select className="input-field" value={expMetodo} onChange={e => setExpMetodo(e.target.value as any)}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Pago Movil">Pago Móvil</option>
                  <option value="Zelle">Zelle</option>
                  <option value="USDT">USDT</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-bg-secondary)', padding: '10px 14px', borderRadius: '8px' }}>
              <input 
                type="checkbox" 
                id="recur" 
                checked={expEsRecurrente} 
                onChange={e => setExpEsRecurrente(e.target.checked)} 
                style={{ width: 18, height: 18 }}
              />
              <label htmlFor="recur" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                ¿Es un gasto recurrente? (Genera alerta de vencimiento)
              </label>
            </div>

            {expEsRecurrente && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Frecuencia</label>
                  <select className="input-field" value={expFrecuencia} onChange={e => setExpFrecuencia(e.target.value as any)}>
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Próximo Vencimiento</label>
                  <input type="date" className="input-field" value={expVencimiento} onChange={e => setExpVencimiento(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL REGISTRAR PAGO DE NÓMINA */}
      {selectedMechanicForPayment && (
        <Modal 
          isOpen={true} 
          title={`Registrar Pago de Nómina - ${selectedMechanicForPayment.mecanicoNombre}`} 
          onClose={() => setSelectedMechanicForPayment(null)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setSelectedMechanicForPayment(null)}>Cancelar</Button>
              <Button onClick={handleConfirmPayrollPayment} icon={<CheckCircle size={16} />}>Confirmar y Registrar Egreso</Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
              <div><strong>Devengado en período:</strong> ${selectedMechanicForPayment.devengadoUSD.toFixed(2)} USD</div>
              <div><strong>Saldo Pendiente:</strong> ${selectedMechanicForPayment.saldoUSD.toFixed(2)} USD</div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Monto a Pagar (USD)</label>
              <input 
                type="number" 
                step="0.01" 
                className="input-field" 
                value={payAmountUSD} 
                onChange={e => setPayAmountUSD(parseFloat(e.target.value) || 0)} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Moneda</label>
                <select className="input-field" value={payMoneda} onChange={e => setPayMoneda(e.target.value as any)}>
                  <option value="USD">USD ($)</option>
                  <option value="VES">VES (Bs)</option>
                  <option value="USDT">USDT / Binance</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Método de Pago</label>
                <select className="input-field" value={payMetodo} onChange={e => setPayMetodo(e.target.value as any)}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Pago Movil">Pago Móvil</option>
                  <option value="Zelle">Zelle</option>
                  <option value="USDT">USDT / Binance Pay</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Notas adicionales</label>
              <textarea className="input-field" style={{ minHeight: '50px' }} value={payNotas} onChange={e => setPayNotas(e.target.value)} placeholder="Comentarios sobre la quincena..." />
            </div>
          </div>
        </Modal>
      )}

      {/* HISTORIAL DE PAGOS POR MECÁNICO MODAL */}
      {selectedMechHistory && (
        <Modal 
          isOpen={true} 
          title={`Historial de Pagos de Nómina`} 
          onClose={() => setSelectedMechHistory(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {payrollPayments.filter(p => p.mecanicoId === selectedMechHistory).length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Sin pagos registrados previamente para este mecánico.
              </div>
            ) : (
              payrollPayments.filter(p => p.mecanicoId === selectedMechHistory).map(p => (
                <div key={p.id} style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: 'var(--color-primary)' }}>{p.id}</strong>
                    <span>{new Date(p.fechaPago).toLocaleDateString()}</span>
                  </div>
                  <div>Monto cancelado: <strong>${p.montoPagadoUSD.toFixed(2)} USD</strong> ({p.metodoPago})</div>
                  {p.notas && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{p.notas}</div>}
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* EDIT SCHEME MODAL */}
      {editingSchemeItem && (
        <Modal 
          isOpen={true} 
          title={`Configurar Esquema de Pago - ${editingSchemeItem.mech.nombre}`} 
          onClose={() => setEditingSchemeItem(null)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setEditingSchemeItem(null)}>Cancelar</Button>
              <Button onClick={handleSaveScheme} icon={<CheckCircle size={16} />}>Guardar Esquema</Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Seleccionar Tipo de Esquema de Pago</label>
              <select 
                className="input-field"
                value={schemeType}
                onChange={e => setSchemeType(e.target.value as any)}
              >
                <option value="porcentaje">Opción A — Porcentaje (%) sobre servicios de órdenes</option>
                <option value="fijo">Opción B — Monto Fijo Acordado por período</option>
                <option value="mixto">Opción C — Mixto (Base fija + % de comisión)</option>
              </select>
            </div>

            {schemeType === 'porcentaje' && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Porcentaje de Comisión sobre Servicios (%)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={schemePct} 
                  onChange={e => setSchemePct(parseFloat(e.target.value) || 0)} 
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                  Aplica estrictamente sobre los servicios completados, excluyendo repuestos.
                </span>
              </div>
            )}

            {schemeType === 'fijo' && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Monto Fijo Acordado ($ USD)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={schemeFixed} 
                  onChange={e => setSchemeFixed(parseFloat(e.target.value) || 0)} 
                />
              </div>
            )}

            {schemeType === 'mixto' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Base Fija ($ USD)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={schemeFixed} 
                    onChange={e => setSchemeFixed(parseFloat(e.target.value) || 0)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Comisión Servicios (%)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={schemePct} 
                    onChange={e => setSchemePct(parseFloat(e.target.value) || 0)} 
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
};
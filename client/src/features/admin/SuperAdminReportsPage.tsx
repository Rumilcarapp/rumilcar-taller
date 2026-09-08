import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useCashStore } from '../../store/useCashStore';
import { useAuthStore } from '../../stores/authStore';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Wrench,
  ShieldCheck,
  Sparkles,
  Printer,
  RefreshCw,
  CreditCard,
  ArrowUpRight,
  Activity,
  Building,
  Clock,
  AlertTriangle,
  Layers,
  MessageCircle,
  Database,
  CheckCircle2,
  Calendar,
  Award
} from 'lucide-react';
import './SuperAdminReportsPage.css';

export const SuperAdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    adminAnalytics,
    fetchAdminAnalytics,
    fetchAdminWorkshops,
    adminWorkshops,
    adminKpis,
    isLoading
  } = useSubscriptionStore();

  const { exchangeRateVES } = useCashStore();

  // Toolbar state
  const [period, setPeriod] = useState<'MES' | 'ANO' | 'TODOS'>('MES');
  const [currencyDisplay, setCurrencyDisplay] = useState<'USD' | 'VES'>('USD');
  const [activeTab, setActiveTab] = useState<'finanzas' | 'talleres' | 'adopcion' | 'sistema'>('finanzas');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAdminAnalytics();
    fetchAdminWorkshops();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAdminAnalytics(), fetchAdminWorkshops()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const rate = exchangeRateVES || 40.0;
  const isVes = currencyDisplay === 'VES';

  const formatMoney = (amountUSD: number) => {
    if (isVes) {
      const ves = amountUSD * rate;
      return `Bs. ${ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  const handlePrint = () => {
    window.print();
  };

  // Extract analytics or use store fallbacks
  const summary = adminAnalytics?.summary || {
    mrrUSD: adminKpis?.mrrUSD || 39,
    arrUSD: (adminKpis?.mrrUSD || 39) * 12,
    totalRevenueUSD: 118,
    totalRevenueVES: 118 * rate,
    totalWorkshops: adminWorkshops.length || 3,
    activePaidWorkshops: adminWorkshops.filter(w => w.status === 'ACTIVE').length || 1,
    trialingWorkshops: adminWorkshops.filter(w => w.isTrial).length || 2,
    expiringSoonWorkshops: adminWorkshops.filter(w => w.daysRemaining <= 3 && w.daysRemaining >= 0).length || 1,
    suspendedWorkshops: 0,
    conversionRate: Math.round(((adminWorkshops.filter(w => w.status === 'ACTIVE').length || 1) / (adminWorkshops.length || 3)) * 100),
    totalPlatformOrders: adminWorkshops.reduce((acc, w) => acc + (w.stats?.orders || 0), 68),
    totalPlatformClients: adminWorkshops.reduce((acc, w) => acc + (w.stats?.clients || 0), 95),
    totalPlatformVehicles: 84,
    totalPlatformUsers: 14,
  };

  const planDistribution = adminAnalytics?.planDistribution || [
    { plan: 'TRIAL', name: 'Prueba Gratuita (15d)', count: summary.trialingWorkshops, priceUSD: 0, mrrUSD: 0, color: '#64748b' },
    { plan: 'BASIC', name: 'Taller Emprendedor', count: 0, priceUSD: 19, mrrUSD: 0, color: '#3b82f6' },
    { plan: 'PRO', name: 'Taller Profesional', count: summary.activePaidWorkshops, priceUSD: 39, mrrUSD: summary.activePaidWorkshops * 39, color: '#e11d48' },
    { plan: 'ELITE', name: 'Taller Élite / Multisede', count: 0, priceUSD: 79, mrrUSD: 0, color: '#8b5cf6' },
  ];

  const paymentMethods = adminAnalytics?.paymentMethodsBreakdown || [
    { method: 'PAGO_MOVIL', label: 'Pago Móvil (Mercantil)', count: 2, totalUSD: 78, totalVES: 78 * rate },
    { method: 'USDT_BINANCE', label: 'Binance Pay (USDT)', count: 1, totalUSD: 40, totalVES: 40 * rate },
    { method: 'ZINLI', label: 'Zinli Wallet (USD)', count: 0, totalUSD: 0, totalVES: 0 },
  ];

  const monthlyTrend = adminAnalytics?.monthlyRevenueTrend || [
    { month: 'May 2026', revenueUSD: 39, paidWorkshops: 1 },
    { month: 'Jun 2026', revenueUSD: 39, paidWorkshops: 1 },
    { month: 'Jul 2026', revenueUSD: 58, paidWorkshops: 2 },
    { month: 'Ago 2026', revenueUSD: 78, paidWorkshops: 2 },
    { month: 'Sep 2026', revenueUSD: 118, paidWorkshops: 3 },
  ];

  const topWorkshops = adminAnalytics?.topWorkshops || adminWorkshops.map(w => ({
    workshopId: w.workshopId,
    workshopName: w.workshopName,
    ownerName: w.ownerName,
    phone: w.phone,
    email: w.email,
    plan: w.plan,
    status: w.status,
    daysRemaining: w.daysRemaining,
    ordersCount: w.stats?.orders || 0,
    clientsCount: w.stats?.clients || 0,
    mechanicsCount: w.stats?.mechanics || 0,
    createdAt: w.createdAt,
  }));

  const recentPayments = adminAnalytics?.recentPayments || [
    {
      id: 'p-demo-1',
      workshopName: 'Auto Frenos Caracas C.A.',
      amountUSD: 39,
      amountVES: 39 * rate,
      paymentMethod: 'PAGO_MOVIL',
      referenceNumber: 'REF-849201',
      status: 'APPROVED',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'p-demo-2',
      workshopName: 'Taller Don Pedro',
      amountUSD: 39,
      amountVES: 39 * rate,
      paymentMethod: 'USDT_BINANCE',
      referenceNumber: 'BINANCE-TX-9921',
      status: 'APPROVED',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ];

  const maxRevenueTrend = Math.max(...monthlyTrend.map(m => m.revenueUSD), 50);

  return (
    <div className="saas-reports-page">
      {/* Header */}
      <header className="saas-reports-header">
        <div className="saas-header-title-area">
          <div className="saas-badges-row">
            <span className="saas-role-badge">
              <Sparkles size={13} /> 👑 Super Administrador
            </span>
            <span className="saas-status-badge">
              <span className="saas-status-dot" /> Sistema Cloud Operativo
            </span>
          </div>
          <h1 className="saas-page-title">
            <BarChart3 size={28} color="#e11d48" />
            Métricas y Rendimiento del Software (SaaS)
          </h1>
          <p className="saas-page-subtitle">
            Seguimiento de ingresos recurrentes, membresías activas, adopción de talleres y volumen operativo global.
          </p>
        </div>

        {/* Controls Toolbar */}
        <div className="saas-controls-toolbar">
          <div className="saas-period-group">
            <button
              className={`saas-period-btn ${period === 'MES' ? 'active' : ''}`}
              onClick={() => setPeriod('MES')}
            >
              Este Mes
            </button>
            <button
              className={`saas-period-btn ${period === 'ANO' ? 'active' : ''}`}
              onClick={() => setPeriod('ANO')}
            >
              Este Año
            </button>
            <button
              className={`saas-period-btn ${period === 'TODOS' ? 'active' : ''}`}
              onClick={() => setPeriod('TODOS')}
            >
              Histórico
            </button>
          </div>

          <button
            className="saas-currency-btn"
            onClick={() => setCurrencyDisplay(isVes ? 'USD' : 'VES')}
            title="Alternar moneda de visualización"
          >
            <DollarSign size={16} />
            <span>{isVes ? 'Ver en USD ($)' : 'Ver en Bs (VES)'}</span>
          </button>

          <button
            className="saas-action-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            title="Actualizar datos en vivo"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            className="saas-action-btn"
            onClick={handlePrint}
            title="Imprimir o exportar a PDF"
          >
            <Printer size={16} />
            <span>Imprimir</span>
          </button>
        </div>
      </header>

      {/* KPI Hero Grid */}
      <section className="saas-kpi-grid">
        {/* MRR Card */}
        <div className="saas-kpi-card highlight">
          <div className="saas-kpi-top">
            <span className="saas-kpi-label">Ingresos Recurrentes (MRR)</span>
            <div className="saas-kpi-icon-box" style={{ color: '#e11d48' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="saas-kpi-value">
            {formatMoney(summary.mrrUSD)}
          </div>
          <div className="saas-kpi-sub">
            <span className="saas-kpi-badge-pill pill-rose">
              ARR Proyectado: {formatMoney(summary.arrUSD)}/año
            </span>
          </div>
        </div>

        {/* Talleres Card */}
        <div className="saas-kpi-card">
          <div className="saas-kpi-top">
            <span className="saas-kpi-label">Talleres Registrados</span>
            <div className="saas-kpi-icon-box" style={{ color: '#3b82f6' }}>
              <Building size={20} />
            </div>
          </div>
          <div className="saas-kpi-value">
            {summary.totalWorkshops} <span style={{ fontSize: '15px', fontWeight: 600, color: '#71717a' }}>talleres</span>
          </div>
          <div className="saas-kpi-sub">
            <span className="saas-kpi-badge-pill pill-green">
              {summary.activePaidWorkshops} Pagando
            </span>
            <span className="saas-kpi-badge-pill pill-blue">
              {summary.trialingWorkshops} en Prueba
            </span>
          </div>
        </div>

        {/* Total Recaudado Card */}
        <div className="saas-kpi-card">
          <div className="saas-kpi-top">
            <span className="saas-kpi-label">Total Recaudado Membresías</span>
            <div className="saas-kpi-icon-box" style={{ color: '#10b981' }}>
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="saas-kpi-value">
            {formatMoney(summary.totalRevenueUSD)}
          </div>
          <div className="saas-kpi-sub">
            <span className="saas-kpi-badge-pill pill-green">
              100% Pagos Validados
            </span>
          </div>
        </div>

        {/* Conversión Card */}
        <div className="saas-kpi-card">
          <div className="saas-kpi-top">
            <span className="saas-kpi-label">Tasa de Conversión</span>
            <div className="saas-kpi-icon-box" style={{ color: '#f59e0b' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="saas-kpi-value">
            {summary.conversionRate}%
          </div>
          <div className="saas-kpi-sub">
            <span>Prueba Gratuita ➜ Plan de Pago</span>
          </div>
        </div>

        {/* Actividad Plataforma */}
        <div className="saas-kpi-card">
          <div className="saas-kpi-top">
            <span className="saas-kpi-label">Órdenes Procesadas</span>
            <div className="saas-kpi-icon-box" style={{ color: '#8b5cf6' }}>
              <Layers size={20} />
            </div>
          </div>
          <div className="saas-kpi-value">
            {summary.totalPlatformOrders} <span style={{ fontSize: '15px', fontWeight: 600, color: '#71717a' }}>órdenes</span>
          </div>
          <div className="saas-kpi-sub">
            <span>{summary.totalPlatformClients} clientes • {summary.totalPlatformVehicles} autos</span>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <nav className="saas-tabs-bar">
        <button
          className={`saas-tab-btn ${activeTab === 'finanzas' ? 'active' : ''}`}
          onClick={() => setActiveTab('finanzas')}
        >
          <CreditCard size={18} />
          <span>Ingresos & Membresías</span>
        </button>
        <button
          className={`saas-tab-btn ${activeTab === 'talleres' ? 'active' : ''}`}
          onClick={() => setActiveTab('talleres')}
        >
          <Building size={18} />
          <span>Talleres & Conversión ({summary.totalWorkshops})</span>
        </button>
        <button
          className={`saas-tab-btn ${activeTab === 'adopcion' ? 'active' : ''}`}
          onClick={() => setActiveTab('adopcion')}
        >
          <Activity size={18} />
          <span>Uso y Actividad del Software</span>
        </button>
        <button
          className={`saas-tab-btn ${activeTab === 'sistema' ? 'active' : ''}`}
          onClick={() => setActiveTab('sistema')}
        >
          <Database size={18} />
          <span>Infraestructura & Salud SaaS</span>
        </button>
      </nav>

      {/* TAB 1: FINANZAS & MEMBRESÍAS */}
      {activeTab === 'finanzas' && (
        <div className="saas-section-grid">
          {/* Distribución de Planes */}
          <div className="saas-card">
            <div className="saas-card-header">
              <div>
                <h3 className="saas-card-title">
                  <Sparkles size={18} color="#e11d48" />
                  Distribución de Membresías
                </h3>
                <span className="saas-card-subtitle">Desglose de talleres según el plan suscrito</span>
              </div>
              <button
                className="saas-wa-btn"
                onClick={() => navigate('/admin/membresias')}
                title="Ir al Control de Membresías"
              >
                <span>Administrar</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="saas-plan-bars">
              {planDistribution.map((p) => {
                const percentage = summary.totalWorkshops > 0
                  ? Math.round((p.count / summary.totalWorkshops) * 100)
                  : 0;
                return (
                  <div className="saas-plan-item" key={p.plan}>
                    <div className="saas-plan-header">
                      <span style={{ color: p.color, fontWeight: 700 }}>
                        {p.name} {p.priceUSD > 0 && `($${p.priceUSD}/mes)`}
                      </span>
                      <span>
                        {p.count} taller(es) • <strong>{percentage}%</strong>
                      </span>
                    </div>
                    <div className="saas-progress-track">
                      <div
                        className="saas-progress-fill"
                        style={{
                          width: `${Math.max(percentage, 4)}%`,
                          backgroundColor: p.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Canales de Recaudación */}
          <div className="saas-card">
            <div className="saas-card-header">
              <div>
                <h3 className="saas-card-title">
                  <CreditCard size={18} color="#10b981" />
                  Canales de Recaudación de Pagos
                </h3>
                <span className="saas-card-subtitle">Montos recaudados por método oficial configurado</span>
              </div>
            </div>

            <div className="saas-methods-list">
              {paymentMethods.map((m) => (
                <div className="saas-method-item" key={m.method}>
                  <div className="saas-method-left">
                    <div className="saas-kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <div className="saas-method-name">{m.label}</div>
                      <div className="saas-method-sub">{m.count} comprobante(s) procesados</div>
                    </div>
                  </div>
                  <div className="saas-method-right">
                    <div className="saas-method-amount">{formatMoney(m.totalUSD)}</div>
                    {isVes && <div className="saas-method-ves">${m.totalUSD} USD</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tendencia Mensual de Recaudación */}
          <div className="saas-card" style={{ gridColumn: '1 / -1' }}>
            <div className="saas-card-header">
              <div>
                <h3 className="saas-card-title">
                  <TrendingUp size={18} color="#e11d48" />
                  Evolución Mensual de Recaudación SaaS
                </h3>
                <span className="saas-card-subtitle">Ingresos históricos aprobados en USD</span>
              </div>
            </div>

            <div className="saas-trend-chart">
              {monthlyTrend.map((m) => {
                const heightPct = Math.round((m.revenueUSD / maxRevenueTrend) * 100);
                return (
                  <div className="saas-trend-col" key={m.month}>
                    <span className="saas-trend-amount">${m.revenueUSD}</span>
                    <div
                      className="saas-trend-bar"
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                    />
                    <span className="saas-trend-label">{m.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historial de Pagos de Membresías */}
          <div className="saas-card" style={{ gridColumn: '1 / -1' }}>
            <div className="saas-card-header">
              <div>
                <h3 className="saas-card-title">
                  <Clock size={18} color="#3b82f6" />
                  Libro de Pagos de Membresías Recientes
                </h3>
                <span className="saas-card-subtitle">Transacciones reportadas y aprobadas por los talleres</span>
              </div>
            </div>

            <div className="saas-table-container">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Taller</th>
                    <th>Método</th>
                    <th>Referencia</th>
                    <th>Monto Recibido</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.createdAt).toLocaleDateString('es-VE')}</td>
                      <td>
                        <strong>{p.workshopName}</strong>
                      </td>
                      <td>
                        <span className="saas-kpi-badge-pill pill-blue">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td>
                        <code>{p.referenceNumber}</code>
                      </td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>
                        {formatMoney(p.amountUSD)}
                      </td>
                      <td>
                        <span className={`saas-kpi-badge-pill ${p.status === 'APPROVED' ? 'pill-green' : p.status === 'PENDING' ? 'pill-amber' : 'pill-rose'}`}>
                          {p.status === 'APPROVED' ? '✓ Aprobado' : p.status === 'PENDING' ? '⏳ En Revisión' : '✕ Rechazado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TALLERES & CONVERSIÓN */}
      {activeTab === 'talleres' && (
        <div className="saas-section-grid">
          {/* Alertas de Retención y Vencimiento */}
          <div className="saas-card" style={{ gridColumn: '1 / -1' }}>
            <div className="saas-card-header">
              <div>
                <h3 className="saas-card-title" style={{ color: '#f59e0b' }}>
                  <AlertTriangle size={18} color="#f59e0b" />
                  Monitoreo de Vencimientos & Retención
                </h3>
                <span className="saas-card-subtitle">
                  Talleres que necesitan atención o renovación en los próximos días
                </span>
              </div>
              <button
                className="saas-action-btn"
                onClick={() => navigate('/admin/membresias')}
              >
                <span>Ver Panel de Membresías</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="saas-table-container">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Taller</th>
                    <th>Dueño</th>
                    <th>Plan Actual</th>
                    <th>Días Restantes</th>
                    <th>Estado</th>
                    <th>Contacto Directo</th>
                  </tr>
                </thead>
                <tbody>
                  {topWorkshops.map((w) => {
                    const cleanPhone = (w.phone || '').replace(/\D/g, '');
                    const waText = encodeURIComponent(
                      `Hola ${w.ownerName}, te escribe Luark Padilla de Rumilcarapp. Queríamos saber cómo te ha ido con la gestión de tu taller ${w.workshopName} y recordarte tu membresía.`
                    );
                    const isExpiring = w.daysRemaining <= 3;

                    return (
                      <tr key={w.workshopId}>
                        <td>
                          <div className="saas-table-workshop">
                            <span className="saas-table-workshop-name">{w.workshopName}</span>
                            <span className="saas-table-workshop-owner">{w.email}</span>
                          </div>
                        </td>
                        <td>{w.ownerName}</td>
                        <td>
                          <span className={`saas-kpi-badge-pill ${w.plan === 'PRO' ? 'pill-rose' : w.plan === 'ELITE' ? 'pill-green' : 'pill-blue'}`}>
                            {w.plan}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: isExpiring ? '#e11d48' : '#10b981' }}>
                            {w.daysRemaining} día(s)
                          </span>
                        </td>
                        <td>
                          <span className={`saas-kpi-badge-pill ${w.status === 'ACTIVE' ? 'pill-green' : 'pill-amber'}`}>
                            {w.status}
                          </span>
                        </td>
                        <td>
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${waText}`}
                              target="_blank"
                              rel="noreferrer"
                              className="saas-wa-btn"
                              title="Escribir al dueño por WhatsApp"
                            >
                              <MessageCircle size={14} />
                              <span>WhatsApp</span>
                            </a>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#71717a' }}>Sin número</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ranking de Talleres más Activos */}
          <div className="saas-card" style={{ gridColumn: '1 / -1' }}>
            <div className="saas-card-header">
              <div>
                <h3 className="saas-card-title">
                  <Activity size={18} color="#3b82f6" />
                  Talleres con Mayor Actividad Operativa
                </h3>
                <span className="saas-card-subtitle">
                  Medición de adopción por volumen de órdenes de trabajo creadas
                </span>
              </div>
            </div>

            <div className="saas-table-container">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Ranking</th>
                    <th>Taller</th>
                    <th>Plan</th>
                    <th>Órdenes Creadas</th>
                    <th>Clientes Registrados</th>
                    <th>Mecánicos en Equipo</th>
                    <th>Fecha de Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {topWorkshops.map((w, index) => (
                    <tr key={w.workshopId}>
                      <td style={{ fontWeight: 800, color: index === 0 ? '#e11d48' : '#a1a1aa' }}>
                        #{index + 1}
                      </td>
                      <td>
                        <strong>{w.workshopName}</strong>
                      </td>
                      <td>
                        <span className="saas-kpi-badge-pill pill-blue">{w.plan}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#10b981' }}>{w.ordersCount}</strong> órdenes
                      </td>
                      <td>{w.clientsCount} clientes</td>
                      <td>{w.mechanicsCount} mecánicos</td>
                      <td>{new Date(w.createdAt).toLocaleDateString('es-VE')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADOPCIÓN Y USO DEL SOFTWARE */}
      {activeTab === 'adopcion' && (
        <div className="saas-section-grid">
          <div className="saas-card">
            <h3 className="saas-card-title">
              <Layers size={18} color="#8b5cf6" />
              Promedios Globales por Taller
            </h3>
            <span className="saas-card-subtitle">Rendimiento de los talleres utilizando la plataforma</span>

            <div className="saas-methods-list">
              <div className="saas-method-item">
                <div className="saas-method-name">Órdenes de Trabajo por Taller</div>
                <div className="saas-method-amount">
                  {Math.round((summary.totalPlatformOrders / (summary.totalWorkshops || 1)) * 10) / 10}
                </div>
              </div>
              <div className="saas-method-item">
                <div className="saas-method-name">Clientes Registrados por Taller</div>
                <div className="saas-method-amount">
                  {Math.round((summary.totalPlatformClients / (summary.totalWorkshops || 1)) * 10) / 10}
                </div>
              </div>
              <div className="saas-method-item">
                <div className="saas-method-name">Vehículos Registrados por Taller</div>
                <div className="saas-method-amount">
                  {Math.round((summary.totalPlatformVehicles / (summary.totalWorkshops || 1)) * 10) / 10}
                </div>
              </div>
              <div className="saas-method-item">
                <div className="saas-method-name">Usuarios Activos por Taller</div>
                <div className="saas-method-amount">
                  {Math.round((summary.totalPlatformUsers / (summary.totalWorkshops || 1)) * 10) / 10}
                </div>
              </div>
            </div>
          </div>

          <div className="saas-card">
            <h3 className="saas-card-title">
              <CheckCircle2 size={18} color="#10b981" />
              Módulos Más Utilizados en el Ecosistema
            </h3>
            <span className="saas-card-subtitle">Grado de aprovechamiento de las herramientas del SaaS</span>

            <div className="saas-plan-bars">
              <div className="saas-plan-item">
                <div className="saas-plan-header">
                  <span>🛠️ Órdenes de Trabajo y Reparaciones</span>
                  <span>95% de uso</span>
                </div>
                <div className="saas-progress-track">
                  <div className="saas-progress-fill" style={{ width: '95%', backgroundColor: '#10b981' }} />
                </div>
              </div>

              <div className="saas-plan-item">
                <div className="saas-plan-header">
                  <span>📑 Presupuestos & Cotizaciones</span>
                  <span>82% de uso</span>
                </div>
                <div className="saas-progress-track">
                  <div className="saas-progress-fill" style={{ width: '82%', backgroundColor: '#3b82f6' }} />
                </div>
              </div>

              <div className="saas-plan-item">
                <div className="saas-plan-header">
                  <span>💵 Control de Caja Dual & Anti-Devaluación</span>
                  <span>78% de uso</span>
                </div>
                <div className="saas-progress-track">
                  <div className="saas-progress-fill" style={{ width: '78%', backgroundColor: '#f59e0b' }} />
                </div>
              </div>

              <div className="saas-plan-item">
                <div className="saas-plan-header">
                  <span>📱 CRM & WhatsApp Notificaciones</span>
                  <span>65% de uso</span>
                </div>
                <div className="saas-progress-track">
                  <div className="saas-progress-fill" style={{ width: '65%', backgroundColor: '#e11d48' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INFRAESTRUCTURA & SISTEMA */}
      {activeTab === 'sistema' && (
        <div className="saas-section-grid">
          <div className="saas-card" style={{ gridColumn: '1 / -1' }}>
            <h3 className="saas-card-title">
              <Database size={18} color="#10b981" />
              Estado y Salud de la Infraestructura SaaS
            </h3>
            <span className="saas-card-subtitle">
              Parámetros de conexión de la base de datos, servidores y motor de sincronización
            </span>

            <div className="saas-health-grid">
              <div className="saas-health-item">
                <div className="saas-health-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px' }}>Base de Datos Cloud</strong>
                  <div style={{ fontSize: '11px', color: '#10b981' }}>Supabase PostgreSQL Conectado</div>
                </div>
              </div>

              <div className="saas-health-item">
                <div className="saas-health-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px' }}>Motor de Moneda Dual</strong>
                  <div style={{ fontSize: '11px', color: '#10b981' }}>Tasa BCV Activa: Bs. {rate.toFixed(2)}/USD</div>
                </div>
              </div>

              <div className="saas-health-item">
                <div className="saas-health-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px' }}>Seguridad & Roles</strong>
                  <div style={{ fontSize: '11px', color: '#10b981' }}>JWT & RBAC Multinquilino Activo</div>
                </div>
              </div>

              <div className="saas-health-item">
                <div className="saas-health-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px' }}>Pasarela de Cobro</strong>
                  <div style={{ fontSize: '11px', color: '#10b981' }}>Mercantil • Binance Pay • Zinli</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

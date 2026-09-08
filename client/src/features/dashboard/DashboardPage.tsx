import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard, Card, Badge, Button } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useWorkOrderStore, WorkOrder } from '../../store/useWorkOrderStore';
import { useCashStore } from '../../store/useCashStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useCRMStore } from '../../store/useCRMStore';
import { useAntiInflationStore } from '../../store/useAntiInflationStore';
import {
  DollarSign, Banknote, Wrench, Calendar,
  AlertTriangle, ArrowRight,
  Plus, FileText, ClipboardCheck, Stethoscope, ShoppingCart,
  Wallet, Send, TrendingUp, ShieldAlert, X
} from 'lucide-react';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';
import { OnboardingChecklist } from '../../components/onboarding/OnboardingChecklist';
import { getOrderWhatsAppContext } from '../../lib/orderActions';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { workOrders } = useWorkOrderStore();
  const { transactions, exchangeRateVES } = useCashStore();
  const { items } = useInventoryStore();
  const { opportunities } = useCRMStore();
  const { saldoVES, obtenerCalculoPerdida } = useAntiInflationStore();
  const antiInflationCalc = obtenerCalculoPerdida();

  const [showQuickActions, setShowQuickActions] = useState(false);
  const [whatsAppOrder, setWhatsAppOrder] = useState<WorkOrder | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuTop, setMenuTop] = useState<number>(180);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') {
      navigate('/admin/membresias', { replace: true });
    }
  }, [user]);

  useEffect(() => {
    if (showQuickActions && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const preferredTop = rect.bottom + 8;
      const maxTop = Math.max(70, window.innerHeight - 400);
      setMenuTop(Math.max(70, Math.min(preferredTop, maxTop)));
    }
  }, [showQuickActions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live KPI metrics
  const activeOrders = workOrders.filter(
    (o) => o.status !== 'Finalizado' && o.status !== 'Rechazado' && o.status !== 'Presupuesto'
  );

  const readyOrders = workOrders.filter((o) => o.status === 'Listo');
  const inProgressOrders = workOrders.filter((o) => o.status === 'En Proceso');
  const receivedOrders = workOrders.filter((o) => o.status === 'Recibido');

  // Revenue calculation from work orders & cash transactions
  const totalRevenueUSD = transactions
    .filter((t) => t.tipo === 'ingreso')
    .reduce((acc, t) => acc + (t.montoUSD || 0), 0) ||
    workOrders.reduce((acc, o) => {
      const paid = (o.payments || []).reduce((pAcc, p) => pAcc + (p.amountUSD || 0), 0);
      return acc + paid;
    }, 0);

  const totalRevenueVES = totalRevenueUSD * (exchangeRateVES || 65);

  // Accounts receivable (pending balances)
  const totalPendingUSD = workOrders.reduce((acc, o) => {
    if (o.status === 'Rechazado' || o.status === 'Presupuesto') return acc;
    const paid = (o.payments || []).reduce((pAcc, p) => pAcc + (p.amountUSD || 0), 0);
    return acc + Math.max(0, (o.totalUSD || 0) - paid);
  }, 0);

  // Low stock inventory alerts (stock <= stockMinimo for physical products)
  const lowStockItems = items.filter(
    (item) => item.tipo === 'PRODUCTO' && (item.stock || 0) <= (item.stockMinimo || 5)
  );

  // WhatsApp 1-click notification for ready vehicles
  const handleNotifyPickup = (order: WorkOrder) => {
    setWhatsAppOrder(order);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Listo':
        return <Badge variant="success" dot>Listo para Entrega</Badge>;
      case 'En Proceso':
        return <Badge variant="warning" dot>En Reparación</Badge>;
      case 'Recibido':
        return <Badge variant="info" dot>Recibido / Patio</Badge>;
      case 'Finalizado':
        return <Badge variant="default" dot>Finalizado / Entregado</Badge>;
      default:
        return <Badge variant="info" dot>{status}</Badge>;
    }
  };

  return (
    <div className="dashboard page-enter">
      
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Buenos días, {user?.name || 'Administrador'} 👋
          </h1>
          <p className="dashboard-subtitle">
            Centro de control y resumen en tiempo real del taller — {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Quick Actions Floating Dropdown */}
        <div className="quick-actions-container" ref={dropdownRef}>
          <button
            ref={buttonRef}
            className={`quick-actions-btn ${showQuickActions ? 'active' : ''}`}
            onClick={() => setShowQuickActions(!showQuickActions)}
            aria-label="Acciones rápidas"
            title="Crear nuevo registro"
          >
            <Plus size={24} />
          </button>

          {showQuickActions && (
            <>
              <div 
                className="quick-actions-backdrop" 
                onClick={() => setShowQuickActions(false)} 
                aria-hidden="true"
              />
              <div 
                className="quick-actions-menu" 
                style={{ '--mobile-menu-top': `${menuTop}px` } as React.CSSProperties}
              >
                <div className="quick-actions-header">
                  <span className="quick-actions-header-title">Acciones Rápidas</span>
                  <button 
                    className="quick-actions-close-btn" 
                    onClick={() => setShowQuickActions(false)}
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>
                <button className="quick-action-item" onClick={() => { setShowQuickActions(false); navigate('/trabajos/nueva'); }}>
                  <FileText size={18} />
                  <span>Nueva Orden de Trabajo</span>
                </button>
                <button className="quick-action-item" onClick={() => { setShowQuickActions(false); navigate('/presupuestos/nuevo'); }}>
                  <Banknote size={18} />
                  <span>Nuevo Presupuesto</span>
                </button>
                <button className="quick-action-item" onClick={() => { setShowQuickActions(false); navigate('/agenda'); }}>
                  <Calendar size={18} />
                  <span>Agendar Cita</span>
                </button>
                <button className="quick-action-item" onClick={() => { setShowQuickActions(false); navigate('/pos'); }}>
                  <ShoppingCart size={18} />
                  <span>Punto de Venta (POS)</span>
                </button>
                <button className="quick-action-item" onClick={() => { setShowQuickActions(false); navigate('/caja'); }}>
                  <Wallet size={18} />
                  <span>Caja & Finanzas</span>
                </button>
                <button className="quick-action-item" onClick={() => { setShowQuickActions(false); navigate('/inspecciones'); }}>
                  <ClipboardCheck size={18} />
                  <span>Inspección Visual</span>
                </button>
                <button className="quick-action-item" onClick={() => { setShowQuickActions(false); navigate('/diagnosticos'); }}>
                  <Stethoscope size={18} />
                  <span>Diagnóstico</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* GUÍA DE PRIMEROS PASOS (ONBOARDING CHECKLIST) */}
      <OnboardingChecklist />

      {/* KPI Cards Grid */}
      <div className="dashboard-kpis">
        <StatsCard
          label="Vehículos en Taller"
          value={activeOrders.length.toString()}
          icon={<Wrench size={20} />}
          color="var(--color-primary)"
        />
        <StatsCard
          label="Ingresos Facturados ($ USD)"
          value={`$${totalRevenueUSD.toFixed(2)}`}
          icon={<DollarSign size={20} />}
          change={{ value: 15, positive: true }}
          color="var(--color-success)"
        />
        <StatsCard
          label={`Ingresos en Bolívares (Tasa: Bs ${exchangeRateVES || 65})`}
          value={`Bs ${totalRevenueVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`}
          icon={<Banknote size={20} />}
          color="var(--color-warning)"
        />
        <StatsCard
          label="Cuentas por Cobrar Pendientes"
          value={`$${totalPendingUSD.toFixed(2)}`}
          icon={<AlertTriangle size={20} />}
          change={{ value: totalPendingUSD > 0 ? -8 : 0, positive: totalPendingUSD === 0 }}
          color={totalPendingUSD > 0 ? '#ef4444' : 'var(--color-info)'}
        />
      </div>

      {/* WIDGET ALERTA DEVALUACIÓN PROTECCIÓN VES */}
      {saldoVES.monto_ves > 0 && antiInflationCalc.perdidaUSD > 0 && (
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(249, 115, 22, 0.18) 100%)',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.12)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#ef4444', padding: '10px', borderRadius: '10px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '15px', color: 'var(--color-text, #fff)', letterSpacing: '0.3px' }}>
                  🛡️ PROTECCIÓN VES
                </strong>
                <span style={{ fontSize: '11px', background: '#ef4444', color: '#fff', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>
                  En Riesgo
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary, #a1a1aa)', marginTop: '2px' }}>
                <strong>Bs. {saldoVES.monto_ves.toLocaleString('es-VE')}</strong> perdiendo valor en caja
              </div>
              <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700, marginTop: '2px' }}>
                📉 -{antiInflationCalc.perdidaPorcentaje}% (${antiInflationCalc.perdidaUSD.toFixed(2)} USD) en {antiInflationCalc.diasTranscurridos} día(s)
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/caja?tab=proteccion')}
            icon={<ArrowRight size={16} />}
            style={{ backgroundColor: '#D32F2F', borderColor: '#D32F2F', fontWeight: 700, padding: '10px 18px' }}
          >
            Ver detalle y convertir →
          </Button>
        </div>
      )}

      {/* SECTION: VEHÍCULOS LISTOS PARA RETIRO (Si existen) */}
      {readyOrders.length > 0 && (
        <div className="ready-vehicles-banner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎉</span>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#10b981' }}>
                Vehículos Listos para Retiro ({readyOrders.length})
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Avisa a los clientes con 1 clic para coordinar la entrega
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {readyOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>
                    {order.vehicle?.marca} {order.vehicle?.modelo} ({order.vehicle?.placa})
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Cliente: <strong>{order.client?.nombre} {order.client?.apellido}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 700, marginTop: '2px' }}>
                    Total: ${order.totalUSD?.toFixed(2)} USD
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleNotifyPickup(order)}
                  icon={<Send size={14} />}
                  style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: '#ffffff' }}
                >
                  Avisar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="dashboard-grid">
        
        {/* Left Column: Órdenes Activas en Taller */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card title="Órdenes Activas en Taller" subtitle={`${activeOrders.length} vehículos en servicio actualmente`}>
            {activeOrders.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No hay órdenes activas en este momento.
              </div>
            ) : (
              <div className="orders-list">
                {activeOrders.map((order) => (
                  <div
                    key={order.id}
                    className="order-row"
                    onClick={() => navigate(`/trabajos/${order.id}`)}
                  >
                    <div className="order-info">
                      <span className="order-id">#{order.id}</span>
                      <span className="order-vehicle">
                        {order.vehicle?.marca} {order.vehicle?.modelo} ({order.vehicle?.placa})
                      </span>
                      <span className="order-client">
                        • {order.client?.nombre} {order.client?.apellido}
                      </span>
                    </div>

                    <div className="order-meta">
                      <span className="order-mechanic">
                        👤 {order.mechanicName || 'Sin asignar'}
                      </span>
                      {getStatusBadge(order.status)}
                      <ArrowRight size={16} color="var(--color-text-muted)" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Workshop Pipeline Capacity Summary */}
          <Card title="Capacidad y Estado Operativo">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>{receivedOrders.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>RECIBIDOS / PATIO</div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>{inProgressOrders.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>EN REPARACIÓN</div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{readyOrders.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>LISTOS PARA ENTREGA</div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#8b5cf6' }}>{opportunities.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>LEADS EN CRM</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Alertas de Stock y CRM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Stock Alerts Card */}
          <Card title="Alertas de Inventario" subtitle={`${lowStockItems.length} repuestos con stock bajo`}>
            {lowStockItems.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#10b981', fontSize: '13px', fontWeight: 600 }}>
                ✅ Todo el stock de repuestos está en niveles óptimos.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lowStockItems.slice(0, 5).map((item) => {
                  const min = item.stockMinimo || 5;
                  const percent = Math.min(100, Math.round(((item.stock || 0) / min) * 100));
                  return (
                    <div key={item.id} className="stock-alert-item">
                      <div style={{ flex: 1, marginRight: '10px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Stock: <strong>{item.stock}</strong> / Mínimo: {min}
                        </div>
                        <div className="stock-meter-bg">
                          <div
                            className="stock-meter-fill"
                            style={{
                              width: `${percent}%`,
                              background: percent <= 30 ? '#ef4444' : '#f59e0b',
                            }}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate('/compras')}
                        icon={<ShoppingCart size={13} />}
                      >
                        Comprar
                      </Button>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/inventario')}
                  style={{ marginTop: '6px' }}
                >
                  Ver Todo el Inventario
                </Button>
              </div>
            )}
          </Card>

          {/* CRM Quick Access Card */}
          <Card title="Seguimiento CRM & Recontacto" subtitle="Fidelización automática">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                Tienes <strong>{opportunities.length}</strong> oportunidades en seguimiento y recordatorios predictivos de cambio de aceite y frenos calculados hoy.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/crm')}
                icon={<TrendingUp size={14} />}
              >
                Abrir Módulo CRM
              </Button>
            </div>
          </Card>

        </div>
      </div>

      {whatsAppOrder && (
        <WhatsAppModal
          isOpen={!!whatsAppOrder}
          onClose={() => setWhatsAppOrder(null)}
          contextData={getOrderWhatsAppContext(whatsAppOrder)}
          initialTemplate="VEHICULO_LISTO"
        />
      )}
    </div>
  );
};

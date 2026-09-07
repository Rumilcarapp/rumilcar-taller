import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkOrderStore, WorkOrder, PaymentRecord } from '../../store/useWorkOrderStore';
import { useCashStore, PaymentMethod } from '../../store/useCashStore';
import { Button, Card, EmptyState, Modal, Badge } from '../../components/ui';
import { 
  DollarSign, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Share2, 
  CreditCard, 
  Search, 
  Eye, 
  CheckCircle,
  Smartphone,
  Coins,
  Building2,
  AlertTriangle,
  Receipt
} from 'lucide-react';

import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';
import { getOrderWhatsAppContext } from '../../lib/orderActions';

export const CobranzaPage: React.FC = () => {
  const navigate = useNavigate();
  const { workOrders, addPartialPayment } = useWorkOrderStore();
  const { exchangeRateVES, isOpened, openBox } = useCashStore();

  const [activeTab, setActiveTab] = useState<'pendientes' | 'historial'>('pendientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOverdue, setFilterOverdue] = useState<'TODOS' | 'VERDE' | 'AMARILLO' | 'ROJO'>('TODOS');

  // Modal payment state
  const [payingOrder, setPayingOrder] = useState<WorkOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // WhatsApp modal state
  const [whatsAppCobranzaOrder, setWhatsAppCobranzaOrder] = useState<WorkOrder | null>(null);

  // -------------------------------------------------------------
  // CALCULATIONS & HELPERS
  // -------------------------------------------------------------
  const now = new Date();

  // Accounts receivable list
  const pendingAccounts = workOrders.map(order => {
    const totalPaid = (order.payments || []).reduce((acc, p) => acc + p.amountUSD, 0);
    const balancePending = Math.max(0, order.totalUSD - totalPaid);
    
    const referenceDate = new Date(order.deliveredAt || order.date);
    const diffTime = Math.abs(now.getTime() - referenceDate.getTime());
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let overdueBadge: 'VERDE' | 'AMARILLO' | 'ROJO' = 'VERDE';
    if (daysOverdue >= 30) overdueBadge = 'ROJO';
    else if (daysOverdue >= 7) overdueBadge = 'AMARILLO';

    return {
      order,
      totalPaid,
      balancePending,
      daysOverdue,
      overdueBadge,
      isPending: balancePending > 0.01 && order.status !== 'Rechazado' && order.status !== 'Presupuesto'
    };
  }).filter(item => item.isPending);

  // KPIs
  const totalPendingUSD = pendingAccounts.reduce((acc, item) => acc + item.balancePending, 0);
  const totalOverdueUSD = pendingAccounts.filter(item => item.daysOverdue >= 7).reduce((acc, item) => acc + item.balancePending, 0);
  const countOverdueOrders = pendingAccounts.filter(item => item.daysOverdue >= 7).length;

  // Flattened History of all payments
  const allPayments = workOrders.flatMap(order => 
    (order.payments || []).map(p => ({
      ...p,
      orderId: order.id,
      clientName: `${order.client?.nombre || ''} ${order.client?.apellido || ''}`,
      clientPhone: order.client?.telefono,
      vehicleInfo: `${order.vehicle?.marca || ''} ${order.vehicle?.modelo || ''} (${order.vehicle?.placa || ''})`
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Today & Month payments calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const paymentsToday = allPayments.filter(p => p.date.startsWith(todayStr));
  const totalCollectedToday = paymentsToday.reduce((acc, p) => acc + p.amountUSD, 0);

  const paymentsMonth = allPayments.filter(p => p.date.startsWith(currentMonthStr));
  const totalCollectedMonth = paymentsMonth.reduce((acc, p) => acc + p.amountUSD, 0);

  // Filtered pending list
  const filteredPending = pendingAccounts.filter(item => {
    const matchesSearch = 
      item.order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${item.order.client?.nombre} ${item.order.client?.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.order.client?.documento && item.order.client.documento.includes(searchTerm)) ||
      (item.order.vehicle?.placa && item.order.vehicle.placa.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterOverdue === 'TODOS') return matchesSearch;
    return matchesSearch && item.overdueBadge === filterOverdue;
  });

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleOpenPaymentModal = (item: typeof pendingAccounts[0]) => {
    setPayingOrder(item.order);
    setPaymentAmount(item.balancePending);
    setPaymentMethod('Efectivo');
    setPaymentRef('');
    setPaymentNote('');
  };

  const handleConfirmPayment = () => {
    if (!payingOrder) return;
    if (paymentAmount <= 0) return alert('El monto del abono debe ser mayor a cero.');

    const currentPending = payingOrder.totalUSD - (payingOrder.payments || []).reduce((acc, p) => acc + p.amountUSD, 0);
    if (paymentAmount > currentPending + 0.01) {
      return alert(`El monto a abonar ($${paymentAmount.toFixed(2)}) no puede exceder el saldo pendiente ($${currentPending.toFixed(2)}).`);
    }

    if (!isOpened) {
      if (confirm('La caja registradora está cerrada. ¿Deseas abrirla ahora para registrar este cobro?')) {
        openBox(0);
      } else {
        return;
      }
    }

    const isVes = paymentMethod === 'Pago Movil' || paymentMethod === 'Punto de Venta';
    const amountVES = isVes ? paymentAmount * exchangeRateVES : undefined;

    addPartialPayment(payingOrder.id, {
      method: paymentMethod,
      amountUSD: paymentAmount,
      amountVES,
      rate: exchangeRateVES,
      reference: paymentRef.trim() || undefined,
      note: paymentNote.trim() || undefined,
      date: new Date().toISOString()
    });

    setPayingOrder(null);
    alert('¡Pago registrado con éxito y cargado en caja!');
  };

  const handleWhatsAppReminder = (item: typeof pendingAccounts[0]) => {
    setWhatsAppCobranzaOrder(item.order);
  };

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Módulo de Cobranza y Cuentas por Cobrar</h1>
        <p className="page-subtitle">Seguimiento de saldos pendientes, abonos parciales y recordatorios de pago.</p>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Por Cobrar (Total)</div>
              <strong style={{ fontSize: '26px', color: 'var(--color-primary)', display: 'block', marginTop: '4px' }}>
                ${totalPendingUSD.toFixed(2)}
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {pendingAccounts.length} órdenes pendientes
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(220, 38, 38, 0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Saldos Vencidos (+7d)</div>
              <strong style={{ fontSize: '26px', color: 'var(--color-warning)', display: 'block', marginTop: '4px' }}>
                ${totalOverdueUSD.toFixed(2)}
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {countOverdueOrders} órdenes atrasadas
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cobrado Hoy</div>
              <strong style={{ fontSize: '26px', color: 'var(--color-success)', display: 'block', marginTop: '4px' }}>
                ${totalCollectedToday.toFixed(2)}
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {paymentsToday.length} cobro(s) procesado(s)
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cobrado Este Mes</div>
              <strong style={{ fontSize: '26px', color: 'var(--color-text-primary)', display: 'block', marginTop: '4px' }}>
                ${totalCollectedMonth.toFixed(2)}
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {paymentsMonth.length} abonos/pagos totales
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveTab('pendientes')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'pendientes' ? 700 : 500,
            color: activeTab === 'pendientes' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'pendientes' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Cuentas Por Cobrar ({pendingAccounts.length})
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'historial' ? 700 : 500,
            color: activeTab === 'historial' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'historial' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Historial de Pagos ({allPayments.length})
        </button>
      </div>

      {/* TAB 1: CUENTAS POR COBRAR */}
      {activeTab === 'pendientes' && (
        <Card>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            {/* Search Input */}
            <div style={{ flex: 1, minWidth: '260px', display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 12px' }}>
              <Search size={16} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder="Buscar por cliente, cédula, placa u orden..." 
                style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)', fontSize: '13px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Overdue Filter Badge Buttons */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px' }}>
              {[
                { id: 'TODOS', label: 'Todas' },
                { id: 'VERDE', label: '🟢 Recientes (<7d)' },
                { id: 'AMARILLO', label: '🟡 Advertencia (7-30d)' },
                { id: 'ROJO', label: '🔴 Vencidas (>30d)' }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setFilterOverdue(btn.id as any)}
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: filterOverdue === btn.id ? 700 : 500,
                    background: filterOverdue === btn.id ? 'var(--color-primary)' : 'transparent',
                    color: filterOverdue === btn.id ? '#fff' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {filteredPending.length === 0 ? (
            <EmptyState 
              icon={<Receipt size={48} />}
              title="No hay cuentas pendientes por cobrar"
              description="Todas las órdenes de trabajo entregadas se encuentran totalmente liquidadas al día."
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}>Cliente</th>
                    <th style={{ padding: '12px 8px' }}>Vehículo / Placa</th>
                    <th style={{ padding: '12px 8px' }}># Orden</th>
                    <th style={{ padding: '12px 8px' }}>Total Orden</th>
                    <th style={{ padding: '12px 8px' }}>Abonado</th>
                    <th style={{ padding: '12px 8px' }}>Saldo Pendiente</th>
                    <th style={{ padding: '12px 8px' }}>Antigüedad</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map(item => {
                    const clientName = `${item.order.client?.nombre || ''} ${item.order.client?.apellido || ''}`;
                    return (
                      <tr key={item.order.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{clientName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.order.client?.documento} · {item.order.client?.telefono || 'Sin telf'}</div>
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 500 }}>{item.order.vehicle?.marca} {item.order.vehicle?.modelo}</div>
                          <span style={{ fontSize: '11px', padding: '1px 6px', background: 'var(--color-bg-secondary)', borderRadius: '4px', fontWeight: 600 }}>
                            {item.order.vehicle?.placa}
                          </span>
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <strong style={{ color: 'var(--color-primary)' }}>{item.order.id}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(item.order.date).toLocaleDateString()}</div>
                        </td>

                        <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                          ${item.order.totalUSD.toFixed(2)}
                        </td>

                        <td style={{ padding: '12px 8px', color: 'var(--color-success)', fontWeight: 600 }}>
                          ${item.totalPaid.toFixed(2)}
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <strong style={{ fontSize: '15px', color: 'var(--color-danger)' }}>
                            ${item.balancePending.toFixed(2)}
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            ≈ Bs. {(item.balancePending * exchangeRateVES).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </div>
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '11px', 
                            fontWeight: 700,
                            background: item.overdueBadge === 'VERDE' ? 'rgba(16, 185, 129, 0.1)' : item.overdueBadge === 'AMARILLO' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: item.overdueBadge === 'VERDE' ? 'var(--color-success)' : item.overdueBadge === 'AMARILLO' ? 'var(--color-warning)' : 'var(--color-danger)',
                            display: 'inline-block'
                          }}>
                            {item.daysOverdue === 0 ? 'Hoy' : `${item.daysOverdue} días`}
                          </span>
                        </td>

                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <Button 
                              size="sm" 
                              style={{ background: 'var(--color-success)', color: '#fff', borderColor: 'var(--color-success)' }} 
                              onClick={() => handleOpenPaymentModal(item)}
                              icon={<CreditCard size={14} />}
                            >
                              Abonar
                            </Button>
                            <button 
                              className="icon-btn" 
                              onClick={() => handleWhatsAppReminder(item)} 
                              title="Enviar Recordatorio por WhatsApp"
                              style={{ color: '#25D366' }}
                            >
                              <Share2 size={16} />
                            </button>
                            <button 
                              className="icon-btn" 
                              onClick={() => navigate('/trabajos/' + item.order.id)} 
                              title="Ver Orden de Trabajo"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: HISTORIAL DE PAGOS */}
      {activeTab === 'historial' && (
        <Card title="Historial Completo de Abonos y Pagos Recibidos">
          {allPayments.length === 0 ? (
            <EmptyState 
              icon={<Receipt size={48} />}
              title="Sin pagos registrados"
              description="Aún no se han procesado abonos ni cobros de órdenes."
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}>Fecha / Hora</th>
                    <th style={{ padding: '12px 8px' }}># Orden</th>
                    <th style={{ padding: '12px 8px' }}>Cliente</th>
                    <th style={{ padding: '12px 8px' }}>Método</th>
                    <th style={{ padding: '12px 8px' }}>Referencia / Nota</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Monto Cobrado</th>
                  </tr>
                </thead>
                <tbody>
                  {allPayments.map(p => (
                    <tr key={p.id || Math.random().toString()} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        {new Date(p.date).toLocaleString()}
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <strong style={{ color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => navigate('/trabajos/' + p.orderId)}>
                          {p.orderId}
                        </strong>
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 600 }}>{p.clientName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{p.vehicleInfo}</div>
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ padding: '2px 8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                          {p.method}
                        </span>
                      </td>

                      <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {p.reference && <div>Ref: <strong>#{p.reference}</strong></div>}
                        {p.note && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{p.note}</div>}
                        {!p.reference && !p.note && '-'}
                      </td>

                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)', fontSize: '15px' }}>
                        +${p.amountUSD.toFixed(2)}
                        {p.amountVES && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                            Bs. {p.amountVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* MODAL REGISTRAR PAGO / ABONO */}
      {payingOrder && (
        <Modal 
          isOpen={true} 
          title={`Registrar Pago / Abono - Orden ${payingOrder.id}`} 
          onClose={() => setPayingOrder(null)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setPayingOrder(null)}>Cancelar</Button>
              <Button onClick={handleConfirmPayment} icon={<CheckCircle size={16} />}>
                Confirmar y Cargar a Caja
              </Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Header info */}
            <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', padding: '16px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>CLIENTE</span>
                <strong style={{ fontSize: '14px' }}>{payingOrder.client?.nombre} {payingOrder.client?.apellido}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>VEHÍCULO</span>
                <span>{payingOrder.vehicle?.marca} {payingOrder.vehicle?.modelo} ({payingOrder.vehicle?.placa})</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>SALDO PENDIENTE ACTUAL</span>
                <strong style={{ fontSize: '20px', color: 'var(--color-danger)' }}>
                  ${(payingOrder.totalUSD - (payingOrder.payments || []).reduce((acc, p) => acc + p.amountUSD, 0)).toFixed(2)} USD
                </strong>
              </div>
            </div>

            {/* Input Amount */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Monto a Abonar (USD)</label>
              <input 
                type="number"
                step="0.01"
                className="input-field"
                value={paymentAmount === 0 ? '' : paymentAmount}
                onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              {(paymentMethod === 'Pago Movil' || paymentMethod === 'Punto de Venta') && paymentAmount > 0 && (
                <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                  Equivalente VES (Tasa {exchangeRateVES} Bs): <strong>Bs. {(paymentAmount * exchangeRateVES).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                </span>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Método de Pago</label>
              <select 
                className="input-field"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
              >
                <option value="Efectivo">Efectivo USD (Gaveta)</option>
                <option value="Pago Movil">Pago Móvil (Bs)</option>
                <option value="USDT">USDT (Binance / Cripto)</option>
                <option value="Zelle">Zelle (Dólares)</option>
                <option value="Punto de Venta">Punto de Venta (Tarjeta Bs)</option>
                <option value="Transferencia">Transferencia Bancaria</option>
              </select>
            </div>

            {/* Reference */}
            {paymentMethod !== 'Efectivo' && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Número de Referencia / Comprobante</label>
                <input 
                  type="text"
                  className="input-field"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  placeholder="Ej: 456789"
                />
              </div>
            )}

            {/* Notes */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Nota u observación (opcional)</label>
              <input 
                type="text"
                className="input-field"
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
                placeholder="Ej: Abono del 50% / Retira el viernes..."
              />
            </div>

          </div>
        </Modal>
      )}

      {whatsAppCobranzaOrder && (
        <WhatsAppModal
          isOpen={!!whatsAppCobranzaOrder}
          onClose={() => setWhatsAppCobranzaOrder(null)}
          contextData={getOrderWhatsAppContext(whatsAppCobranzaOrder)}
          initialTemplate="COBRANZA"
        />
      )}

    </div>
  );
};

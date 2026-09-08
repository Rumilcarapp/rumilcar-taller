import React, { useState, useEffect } from 'react';
import { useSubscriptionStore, SubscriptionPlanKey, SubscriptionStatusKey } from '../../store/useSubscriptionStore';
import { useAuthStore } from '../../stores/authStore';
import { Card, Badge, Button, Input } from '../../components/ui';
import {
  ShieldCheck,
  Building,
  Sparkles,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  RefreshCw,
  Search,
  Phone,
  Mail,
  User,
  Calendar,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import './SuperAdminSubscriptionsPage.css';

export const SuperAdminSubscriptionsPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    adminWorkshops,
    adminKpis,
    fetchAdminWorkshops,
    approvePayment,
    rejectPayment,
    extendTrial,
    changePlan,
    isLoading,
  } = useSubscriptionStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'TRIALING' | 'ACTIVE' | 'EXPIRED'>('ALL');

  // Reject Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Change Plan Modal state
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
  const [selectedWorkshopName, setSelectedWorkshopName] = useState('');
  const [targetPlan, setTargetPlan] = useState<SubscriptionPlanKey>('PRO');
  const [targetStatus, setTargetStatus] = useState<SubscriptionStatusKey>('ACTIVE');

  // Success toast
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchAdminWorkshops();
  }, []);

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleApprove = async (paymentId: string, plan: SubscriptionPlanKey) => {
    const success = await approvePayment(paymentId, plan, 1);
    if (success) {
      showNotification('✅ Pago aprobado con éxito. La membresía del taller se extendió por 30 días.');
    }
  };

  const handleOpenReject = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setRejectionReason('Referencia no encontrada o monto incompleto.');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedPaymentId) return;
    const success = await rejectPayment(selectedPaymentId, rejectionReason);
    if (success) {
      setRejectModalOpen(false);
      showNotification('❌ Pago marcado como rechazado.');
    }
  };

  const handleExtendTrial = async (workshopId: string, days = 7) => {
    const success = await extendTrial(workshopId, days);
    if (success) {
      showNotification(`🎁 Se otorgaron ${days} días de cortesía adicionales al taller.`);
    }
  };

  const handleOpenChangePlan = (wId: string, wName: string, curPlan: SubscriptionPlanKey, curStatus: SubscriptionStatusKey) => {
    setSelectedWorkshopId(wId);
    setSelectedWorkshopName(wName);
    setTargetPlan(curPlan);
    setTargetStatus(curStatus);
    setPlanModalOpen(true);
  };

  const handleConfirmChangePlan = async () => {
    if (!selectedWorkshopId) return;
    const success = await changePlan(selectedWorkshopId, targetPlan, targetStatus);
    if (success) {
      setPlanModalOpen(false);
      showNotification(`⭐ Plan actualizado con éxito para ${selectedWorkshopName}.`);
    }
  };

  // Collect all pending payments across workshops
  const pendingPaymentsList = adminWorkshops.flatMap((w) =>
    w.pendingPayments.map((p) => ({
      ...p,
      workshopName: w.workshopName,
      ownerName: w.ownerName,
      email: w.email,
      phone: w.phone,
      suggestedPlan: w.plan === 'TRIAL' ? 'PRO' : w.plan,
    }))
  );

  // Filter workshops
  const filteredWorkshops = adminWorkshops.filter((w) => {
    const matchesSearch =
      w.workshopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'TRIALING') return w.isTrial;
    if (filterStatus === 'ACTIVE') return w.status === 'ACTIVE';
    if (filterStatus === 'EXPIRED') return w.daysRemaining <= 0;

    return true;
  });

  return (
    <div className="superadmin-page animate-fade-in">
      {/* Top Header */}
      <div className="superadmin-header">
        <div>
          <span className="superadmin-eyebrow">
            <ShieldCheck size={16} color="#e11d48" /> Módulo Exclusivo Super Administrador
          </span>
          <h1 className="superadmin-title">Gestión Global de Membresías y Cobros</h1>
          <p className="superadmin-subtitle">
            Supervisa todos los talleres registrados en Rumilcarapp, verifica comprobantes de pago y aprueba suscripciones.
          </p>
        </div>

        <Button variant="secondary" onClick={() => fetchAdminWorkshops()} loading={isLoading}>
          <RefreshCw size={16} />
          <span>Actualizar Datos</span>
        </Button>
      </div>

      {actionMessage && (
        <div className="superadmin-notification-toast animate-slide-down">
          {actionMessage}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="superadmin-kpis-grid">
        <div className="admin-kpi-card">
          <div className="kpi-icon-wrap kpi-blue">
            <Building size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Total Talleres</span>
            <strong className="kpi-value">{adminKpis.totalWorkshops}</strong>
            <span className="kpi-hint">Registrados en la plataforma</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-icon-wrap kpi-purple">
            <Sparkles size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">En Prueba Gratuita</span>
            <strong className="kpi-value">{adminKpis.trialing}</strong>
            <span className="kpi-hint">15 días de cortesía activos</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-icon-wrap kpi-green">
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Membresías Pagadas</span>
            <strong className="kpi-value">{adminKpis.activePaid}</strong>
            <span className="kpi-hint">Planes activos y solventes</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-icon-wrap kpi-emerald">
            <DollarSign size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">MRR Estimado (USD)</span>
            <strong className="kpi-value">${adminKpis.mrrUSD}</strong>
            <span className="kpi-hint">Ingreso Mensual Recurrente</span>
          </div>
        </div>

        <div className="admin-kpi-card urgent">
          <div className="kpi-icon-wrap kpi-amber">
            <Clock size={22} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Por Verificar</span>
            <strong className="kpi-value text-amber">{pendingPaymentsList.length}</strong>
            <span className="kpi-hint">Comprobantes pendientes</span>
          </div>
        </div>
      </div>

      {/* Pending Payments Inbox */}
      <div className="inbox-section">
        <div className="inbox-header">
          <h2 className="inbox-title">
            <Clock size={20} color="#f59e0b" /> Bandeja de Aprobación de Pagos
            {pendingPaymentsList.length > 0 && (
              <span className="pending-badge-count">{pendingPaymentsList.length} pendientes</span>
            )}
          </h2>
          <span className="inbox-sub">
            Revisa la referencia bancaria en tu banco/billetera y pulsa Aprobar para activar la membresía.
          </span>
        </div>

        {pendingPaymentsList.length === 0 ? (
          <div className="inbox-empty-state">
            <CheckCircle2 size={36} color="#10b981" />
            <p>¡Todo al día! No hay comprobantes de pago pendientes de verificación.</p>
          </div>
        ) : (
          <div className="pending-payments-cards">
            {pendingPaymentsList.map((p) => (
              <div key={p.id} className="payment-review-card">
                <div className="payment-card-left">
                  <div className="workshop-pill-tag">{p.workshopName}</div>
                  <h4 className="payment-owner">{p.ownerName}</h4>
                  <div className="payment-contacts">
                    {p.phone && <span><Phone size={13} /> {p.phone}</span>}
                    {p.email && <span><Mail size={13} /> {p.email}</span>}
                  </div>
                  <div className="payment-notes">
                    <strong>Nota:</strong> {p.notes || 'Membresía reportada'}
                  </div>
                </div>

                <div className="payment-card-middle">
                  <div className="payment-method-tag">
                    {p.paymentMethod === 'PAGO_MOVIL'
                      ? '📱 Pago Móvil'
                      : p.paymentMethod === 'ZINLI'
                      ? '💳 Zinli'
                      : '🪙 USDT Binance Pay'}
                  </div>
                  <div className="payment-ref-row">
                    <span className="ref-label">Referencia:</span>
                    <strong className="ref-value">{p.referenceNumber}</strong>
                  </div>
                  <div className="payment-amount-row">
                    <span className="amount-usd">${p.amountUSD} USD</span>
                    {p.amountVES && (
                      <span className="amount-ves">Bs {p.amountVES.toLocaleString('es-VE')}</span>
                    )}
                  </div>
                  <div className="payment-date">
                    Reportado: {new Date(p.createdAt).toLocaleString('es-VE')}
                  </div>
                </div>

                <div className="payment-card-right">
                  <Button
                    variant="primary"
                    className="approve-btn"
                    onClick={() => handleApprove(p.id, p.suggestedPlan as SubscriptionPlanKey)}
                  >
                    <CheckCircle2 size={16} />
                    <span>Aprobar Pago</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="reject-btn"
                    onClick={() => handleOpenReject(p.id)}
                  >
                    <XCircle size={16} />
                    <span>Rechazar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workshops Directory Section */}
      <div className="workshops-section">
        <div className="workshops-header-row">
          <div>
            <h2 className="section-title">Directorio de Talleres y Membresías</h2>
            <span className="section-sub">
              Controla el estado, días restantes y planes de cada taller mecánico.
            </span>
          </div>

          <div className="workshops-filter-controls">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por taller, dueño o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill ${filterStatus === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterStatus('ALL')}
              >
                Todos ({adminWorkshops.length})
              </button>
              <button
                type="button"
                className={`filter-pill ${filterStatus === 'TRIALING' ? 'active' : ''}`}
                onClick={() => setFilterStatus('TRIALING')}
              >
                Prueba 15d
              </button>
              <button
                type="button"
                className={`filter-pill ${filterStatus === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setFilterStatus('ACTIVE')}
              >
                Pagados
              </button>
              <button
                type="button"
                className={`filter-pill ${filterStatus === 'EXPIRED' ? 'active' : ''}`}
                onClick={() => setFilterStatus('EXPIRED')}
              >
                Vencidos
              </button>
            </div>
          </div>
        </div>

        <div className="workshops-table-container">
          <table className="workshops-table">
            <thead>
              <tr>
                <th>Taller Mecánico</th>
                <th>Propietario / Contacto</th>
                <th>Plan Actual</th>
                <th>Estado</th>
                <th>Días Restantes</th>
                <th>Uso</th>
                <th>Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkshops.map((w) => (
                <tr key={w.workshopId}>
                  <td>
                    <div className="workshop-td-name">
                      <strong>{w.workshopName}</strong>
                      <span className="registered-date">
                        Desde: {new Date(w.createdAt).toLocaleDateString('es-VE')}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="owner-td">
                      <span>{w.ownerName}</span>
                      <small>{w.email || w.phone || 'Sin contacto'}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`plan-badge plan-${w.plan.toLowerCase()}`}>
                      {w.plan === 'TRIAL'
                        ? '15 Días Gratis'
                        : w.plan === 'BASIC'
                        ? 'Emprendedor'
                        : w.plan === 'PRO'
                        ? 'Profesional'
                        : 'Élite'}
                    </span>
                  </td>
                  <td>
                    <Badge variant={w.status === 'ACTIVE' ? 'success' : w.isTrial ? 'info' : 'error'}>
                      {w.status === 'ACTIVE'
                        ? 'Activo Solvente'
                        : w.isTrial
                        ? 'En Prueba'
                        : 'Vencido'}
                    </Badge>
                  </td>
                  <td>
                    <strong className={w.daysRemaining <= 3 ? 'text-danger' : 'text-primary'}>
                      {w.daysRemaining} días
                    </strong>
                  </td>
                  <td>
                    <span className="stats-pill">
                      {w.stats.orders} órdenes · {w.stats.clients} clientes
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn-action-trial"
                        title="Otorgar 7 días de cortesía"
                        onClick={() => handleExtendTrial(w.workshopId, 7)}
                      >
                        +7d Gratis
                      </button>
                      <button
                        className="btn-action-plan"
                        title="Cambiar plan o estado"
                        onClick={() => handleOpenChangePlan(w.workshopId, w.workshopName, w.plan, w.status)}
                      >
                        Editar Plan
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Payment Modal */}
      {rejectModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setRejectModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Rechazar Comprobante de Pago</h3>
            <p className="modal-desc">
              Indica la razón del rechazo para que el taller mecánico pueda verificar y volver a enviar la información correcta.
            </p>
            <div className="form-group">
              <label className="form-label">Motivo del Rechazo:</label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: Referencia no aparece en el banco emisor"
              />
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleConfirmReject}>
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {planModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setPlanModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Modificar Membresía del Taller</h3>
            <p className="modal-desc">
              Taller: <strong>{selectedWorkshopName}</strong>
            </p>

            <div className="form-group">
              <label className="form-label">Asignar Plan:</label>
              <select
                className="modal-select"
                value={targetPlan}
                onChange={(e) => setTargetPlan(e.target.value as SubscriptionPlanKey)}
              >
                <option value="TRIAL">Prueba Gratuita (15 Días)</option>
                <option value="BASIC">Taller Emprendedor ($19/mes)</option>
                <option value="PRO">Taller Profesional ($39/mes)</option>
                <option value="ELITE">Taller Élite / Multisede ($79/mes)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estado de la Membresía:</label>
              <select
                className="modal-select"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as SubscriptionStatusKey)}
              >
                <option value="ACTIVE">Activo (Solvente)</option>
                <option value="TRIALING">En Periodo de Prueba</option>
                <option value="PAST_DUE">Vencido (Periodo de Gracia)</option>
                <option value="SUSPENDED">Suspendido (Solo Lectura)</option>
              </select>
            </div>

            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setPlanModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirmChangePlan}>
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

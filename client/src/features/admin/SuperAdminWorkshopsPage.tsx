import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore, AdminWorkshopItem, SubscriptionPlanKey } from '../../store/useSubscriptionStore';
import {
  Building2,
  Users,
  Key,
  Plus,
  Search,
  MessageCircle,
  Edit,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  Lock,
  AlertTriangle,
  Play,
  Pause,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import './SuperAdminWorkshopsPage.css';

export const SuperAdminWorkshopsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    adminWorkshops,
    fetchAdminWorkshops,
    createClientWorkshop,
    resetOwnerPassword,
    toggleWorkshopStatus,
    updateClientWorkshop,
    adminKpis,
    isLoading
  } = useSubscriptionStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<AdminWorkshopItem | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    workshopName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    plan: 'TRIAL' as SubscriptionPlanKey,
    durationDays: 15,
  });

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    workshopName: '',
    ownerName: '',
    phone: '',
    email: '',
  });

  // Feedback toast message
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAdminWorkshops();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAdminWorkshops();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.workshopName || !createForm.ownerName || !createForm.email || !createForm.password) {
      showToast('error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    const res = await createClientWorkshop(createForm);
    if (res.success) {
      showToast('success', res.message);
      setShowCreateModal(false);
      setCreateForm({
        workshopName: '',
        ownerName: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        plan: 'TRIAL',
        durationDays: 15,
      });
    } else {
      showToast('error', res.message);
    }
  };

  const handleOpenPasswordModal = (w: AdminWorkshopItem) => {
    setSelectedWorkshop(w);
    // Generate an automatic secure 8-char password
    const autoPass = 'Rumil' + Math.floor(1000 + Math.random() * 9000);
    setNewPassword(autoPass);
    setCopiedKey(false);
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop || !newPassword) return;

    const res = await resetOwnerPassword(selectedWorkshop.workshopId, newPassword);
    if (res.success) {
      showToast('success', res.message);
      setShowPasswordModal(false);
    } else {
      showToast('error', res.message);
    }
  };

  const handleCopyCredentials = () => {
    if (!selectedWorkshop) return;
    const textToCopy = `🔑 Credenciales de Acceso a Rumilcarapp:\n\nTaller: ${selectedWorkshop.workshopName}\nUsuario: ${selectedWorkshop.email}\nContraseña: ${newPassword}\n\nIngresa en: ${window.location.origin}/login`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleToggleStatus = async (w: AdminWorkshopItem) => {
    const shouldSuspend = w.status === 'ACTIVE' || w.status === 'TRIALING';
    const confirmMsg = shouldSuspend
      ? `¿Estás seguro de suspender el acceso para el taller "${w.workshopName}"? Sus usuarios no podrán iniciar sesión.`
      : `¿Reactivar el acceso al software para el taller "${w.workshopName}"?`;

    if (!window.confirm(confirmMsg)) return;

    const res = await toggleWorkshopStatus(w.workshopId, shouldSuspend);
    if (res.success) {
      showToast('success', res.message);
    } else {
      showToast('error', res.message);
    }
  };

  const handleOpenEditModal = (w: AdminWorkshopItem) => {
    setSelectedWorkshop(w);
    setEditForm({
      workshopName: w.workshopName,
      ownerName: w.ownerName,
      phone: w.phone,
      email: w.email,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop) return;

    const res = await updateClientWorkshop({
      workshopId: selectedWorkshop.workshopId,
      ...editForm,
    });

    if (res.success) {
      showToast('success', res.message);
      setShowEditModal(false);
    } else {
      showToast('error', res.message);
    }
  };

  // -------------------------------------------------------------
  // FILTERING LOGIC
  // -------------------------------------------------------------
  const filteredWorkshops = adminWorkshops.filter((w) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      w.workshopName.toLowerCase().includes(term) ||
      w.ownerName.toLowerCase().includes(term) ||
      w.email.toLowerCase().includes(term) ||
      w.phone.toLowerCase().includes(term);

    const matchesPlan = filterPlan === 'ALL' || w.plan === filterPlan;

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && w.status === 'ACTIVE') ||
      (filterStatus === 'TRIALING' && w.isTrial) ||
      (filterStatus === 'SUSPENDED' && (w.status === 'SUSPENDED' || w.status === 'PAST_DUE'));

    return matchesSearch && matchesPlan && matchesStatus;
  });

  // KPIs
  const totalWorkshops = adminWorkshops.length;
  const activeWorkshops = adminWorkshops.filter((w) => w.status === 'ACTIVE').length;
  const trialWorkshops = adminWorkshops.filter((w) => w.isTrial).length;
  const suspendedWorkshops = adminWorkshops.filter((w) => w.status === 'SUSPENDED' || w.status === 'PAST_DUE').length;
  const totalUsersInNetwork = adminWorkshops.reduce((acc, w) => acc + (w.stats?.mechanics || 1), 0);

  return (
    <div className="saas-workshops-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '10px',
            background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="saas-workshops-header">
        <div className="saas-workshops-title-area">
          <h1 className="saas-workshops-title">
            <Building2 size={28} color="#e11d48" />
            Directorio de Talleres Clientes & Cuentas Maestras
          </h1>
          <p className="saas-workshops-subtitle">
            Administración centralizada de talleres suscritos, credenciales de dueños, control de acceso y soporte técnico del software.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="saas-icon-btn"
            onClick={handleRefresh}
            title="Actualizar listado"
            style={{ width: '40px', height: '40px' }}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <button
            className="saas-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
            <span>Registrar Nuevo Taller Cliente</span>
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="saas-workshops-kpis">
        <div className="saas-wkpi-card">
          <div className="saas-wkpi-top">
            <span className="saas-wkpi-label">Talleres Registrados</span>
            <Building2 size={18} color="#e11d48" />
          </div>
          <div className="saas-wkpi-value">{totalWorkshops}</div>
          <div className="saas-wkpi-sub">Total de clientes empresa en la plataforma</div>
        </div>

        <div className="saas-wkpi-card">
          <div className="saas-wkpi-top">
            <span className="saas-wkpi-label">Talleres Activos</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div className="saas-wkpi-value" style={{ color: '#10b981' }}>
            {activeWorkshops}
          </div>
          <div className="saas-wkpi-sub">Con membresía de pago vigente</div>
        </div>

        <div className="saas-wkpi-card">
          <div className="saas-wkpi-top">
            <span className="saas-wkpi-label">En Prueba Gratis</span>
            <Clock size={18} color="#3b82f6" />
          </div>
          <div className="saas-wkpi-value" style={{ color: '#3b82f6' }}>
            {trialWorkshops}
          </div>
          <div className="saas-wkpi-sub">15 Días de cortesía activa</div>
        </div>

        <div className="saas-wkpi-card">
          <div className="saas-wkpi-top">
            <span className="saas-wkpi-label">Talleres Suspendidos</span>
            <XCircle size={18} color="#ef4444" />
          </div>
          <div className="saas-wkpi-value" style={{ color: '#ef4444' }}>
            {suspendedWorkshops}
          </div>
          <div className="saas-wkpi-sub">Acceso pausado por vencimiento</div>
        </div>

        <div className="saas-wkpi-card">
          <div className="saas-wkpi-top">
            <span className="saas-wkpi-label">Usuarios en la Red</span>
            <Users size={18} color="#8b5cf6" />
          </div>
          <div className="saas-wkpi-value">{totalUsersInNetwork}</div>
          <div className="saas-wkpi-sub">Mecánicos y operadores creados</div>
        </div>
      </section>

      {/* Toolbar & Search */}
      <section className="saas-workshops-toolbar">
        <div className="saas-search-input-box">
          <Search size={16} color="#71717a" />
          <input
            type="text"
            placeholder="Buscar por nombre de taller, dueño, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="saas-search-input"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="saas-toolbar-filters">
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="saas-filter-select"
          >
            <option value="ALL">Todos los Planes</option>
            <option value="TRIAL">Prueba 15d</option>
            <option value="BASIC">Plan Básico</option>
            <option value="PRO">Plan PRO ⭐</option>
            <option value="ELITE">Plan Élite 👑</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="saas-filter-select"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">Activos (Pagando)</option>
            <option value="TRIALING">En Prueba Gratis</option>
            <option value="SUSPENDED">Suspendidos / Vencidos</option>
          </select>
        </div>
      </section>

      {/* Workshops Directory Table */}
      <div className="saas-workshops-table-card">
        <div className="saas-wtable-container">
          <table className="saas-wtable">
            <thead>
              <tr>
                <th>Taller / Empresa</th>
                <th>Titular / Dueño</th>
                <th>Plan SaaS</th>
                <th>Días Restantes</th>
                <th>Personal Creado</th>
                <th>Estado Acceso</th>
                <th>Acciones de Soporte</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkshops.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="saas-empty-box">
                      <Building2 size={36} />
                      <strong>No se encontraron talleres clientes</strong>
                      <span>Prueba cambiando los términos de búsqueda o registra un nuevo taller</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWorkshops.map((w) => {
                  const cleanPhone = (w.phone || '').replace(/\D/g, '');
                  const waText = encodeURIComponent(
                    `Hola ${w.ownerName}, te saluda Luark Padilla de soporte Rumilcarapp. Nos comunicamos en relación a la cuenta de tu taller ${w.workshopName}.`
                  );
                  const isSuspended = w.status === 'SUSPENDED' || w.status === 'PAST_DUE';

                  return (
                    <tr key={w.workshopId}>
                      <td>
                        <div className="saas-wtable-name">{w.workshopName}</div>
                        <div className="saas-wtable-meta">
                          Registrado: {new Date(w.createdAt).toLocaleDateString('es-VE')}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{w.ownerName}</div>
                        <div className="saas-wtable-meta">{w.email}</div>
                        {w.phone && <div className="saas-wtable-meta">{w.phone}</div>}
                      </td>

                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background:
                              w.plan === 'PRO'
                                ? 'rgba(225, 29, 72, 0.15)'
                                : w.plan === 'ELITE'
                                ? 'rgba(139, 92, 246, 0.15)'
                                : w.plan === 'BASIC'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(100, 116, 139, 0.15)',
                            color:
                              w.plan === 'PRO'
                                ? '#e11d48'
                                : w.plan === 'ELITE'
                                ? '#8b5cf6'
                                : w.plan === 'BASIC'
                                ? '#3b82f6'
                                : '#94a3b8',
                          }}
                        >
                          {w.plan === 'TRIAL' ? '15 Días Gratis' : `Plan ${w.plan}`}
                        </span>
                      </td>

                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: w.daysRemaining <= 3 ? '#ef4444' : '#10b981',
                          }}
                        >
                          {w.daysRemaining} día(s)
                        </span>
                      </td>

                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          {w.stats?.mechanics || 1} mecánico(s)
                        </div>
                        <div className="saas-wtable-meta">
                          {w.stats?.orders || 0} órdenes creadas
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isSuspended ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isSuspended ? '#ef4444' : '#10b981',
                          }}
                        >
                          {isSuspended ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                          {isSuspended ? 'Suspendido' : 'Habilitado'}
                        </span>
                      </td>

                      <td>
                        <div className="saas-table-actions">
                          {/* WhatsApp */}
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${waText}`}
                              target="_blank"
                              rel="noreferrer"
                              className="saas-icon-btn btn-wa"
                              title="Escribir por WhatsApp al dueño"
                            >
                              <MessageCircle size={16} />
                            </a>
                          ) : null}

                          {/* Reset Password */}
                          <button
                            className="saas-icon-btn btn-key"
                            onClick={() => handleOpenPasswordModal(w)}
                            title="Restablecer contraseña del dueño"
                          >
                            <Key size={16} />
                          </button>

                          {/* Toggle Suspend/Activate */}
                          <button
                            className={`saas-icon-btn ${isSuspended ? 'btn-success' : 'btn-danger'}`}
                            onClick={() => handleToggleStatus(w)}
                            title={isSuspended ? 'Reactivar acceso al software' : 'Suspender acceso'}
                          >
                            {isSuspended ? <Play size={15} /> : <Pause size={15} />}
                          </button>

                          {/* Edit Details */}
                          <button
                            className="saas-icon-btn"
                            onClick={() => handleOpenEditModal(w)}
                            title="Editar datos del taller"
                          >
                            <Edit size={16} />
                          </button>

                          {/* Direct link to Membresías */}
                          <button
                            className="saas-icon-btn"
                            onClick={() => navigate('/admin/membresias')}
                            title="Gestionar pagos y membresía"
                          >
                            <ShieldCheck size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: REGISTRAR NUEVO TALLER CLIENTE */}
      {showCreateModal && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <h3 className="saas-modal-title">
                <Building2 size={20} color="#e11d48" />
                Registrar Nuevo Taller Cliente
              </h3>
              <button
                className="saas-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="saas-modal-body">
                <div className="saas-form-group">
                  <label className="saas-form-label">Nombre del Taller / Razón Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Taller Mecánico Los Próceres C.A."
                    value={createForm.workshopName}
                    onChange={(e) => setCreateForm({ ...createForm, workshopName: e.target.value })}
                    className="saas-form-input"
                  />
                </div>

                <div className="saas-form-group">
                  <label className="saas-form-label">Nombre del Titular / Dueño *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Rodríguez"
                    value={createForm.ownerName}
                    onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                    className="saas-form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="saas-form-group">
                    <label className="saas-form-label">Correo Electrónico (Acceso) *</label>
                    <input
                      type="email"
                      required
                      placeholder="taller@gmail.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="saas-form-input"
                    />
                  </div>

                  <div className="saas-form-group">
                    <label className="saas-form-label">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="0414-1234567"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      className="saas-form-input"
                    />
                  </div>
                </div>

                <div className="saas-form-group">
                  <label className="saas-form-label">Contraseña Inicial para el Dueño *</label>
                  <input
                    type="text"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="saas-form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="saas-form-group">
                    <label className="saas-form-label">Plan Inicial Asignado</label>
                    <select
                      value={createForm.plan}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          plan: e.target.value as SubscriptionPlanKey,
                          durationDays: e.target.value === 'TRIAL' ? 15 : 30,
                        })
                      }
                      className="saas-form-input"
                    >
                      <option value="TRIAL">15 Días Gratis (Prueba)</option>
                      <option value="BASIC">Plan Básico ($19/mes)</option>
                      <option value="PRO">Plan PRO ($39/mes) ⭐</option>
                      <option value="ELITE">Plan Élite ($79/mes) 👑</option>
                    </select>
                  </div>

                  <div className="saas-form-group">
                    <label className="saas-form-label">Días de Acceso Inicial</label>
                    <input
                      type="number"
                      value={createForm.durationDays}
                      onChange={(e) => setCreateForm({ ...createForm, durationDays: Number(e.target.value) })}
                      className="saas-form-input"
                      min={1}
                      max={365}
                    />
                  </div>
                </div>

                <div className="saas-form-group">
                  <label className="saas-form-label">Dirección o Ciudad (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Caracas, Bello Monte"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    className="saas-form-input"
                  />
                </div>
              </div>

              <div className="saas-modal-footer">
                <button
                  type="button"
                  className="saas-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="saas-btn-primary">
                  <span>Habilitar y Crear Taller</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESTABLECER CONTRASEÑA */}
      {showPasswordModal && selectedWorkshop && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <h3 className="saas-modal-title">
                <Key size={20} color="#f59e0b" />
                Restablecer Clave de Acceso
              </h3>
              <button
                className="saas-modal-close-btn"
                onClick={() => setShowPasswordModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="saas-modal-body">
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid #3f3f46' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                    {selectedWorkshop.workshopName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a1a1aa' }}>
                    Titular: {selectedWorkshop.ownerName} ({selectedWorkshop.email})
                  </div>
                </div>

                <div className="saas-form-group">
                  <label className="saas-form-label">Nueva Contraseña para el Dueño</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="saas-form-input"
                      style={{ flex: 1, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setNewPassword('Rumil' + Math.floor(1000 + Math.random() * 9000))}
                      className="saas-btn-secondary"
                      title="Generar contraseña aleatoria"
                    >
                      Generar
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="saas-btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: copiedKey ? '#10b981' : '#ffffff' }}
                >
                  {copiedKey ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedKey ? '¡Credenciales copiadas!' : 'Copiar mensaje para enviar por WhatsApp'}</span>
                </button>
              </div>

              <div className="saas-modal-footer">
                <button
                  type="button"
                  className="saas-btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="saas-btn-primary" style={{ background: '#f59e0b' }}>
                  <span>Actualizar Contraseña</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR TALLER */}
      {showEditModal && selectedWorkshop && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal-card">
            <div className="saas-modal-header">
              <h3 className="saas-modal-title">
                <Edit size={20} color="#3b82f6" />
                Editar Datos del Taller Cliente
              </h3>
              <button
                className="saas-modal-close-btn"
                onClick={() => setShowEditModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="saas-modal-body">
                <div className="saas-form-group">
                  <label className="saas-form-label">Nombre del Taller</label>
                  <input
                    type="text"
                    required
                    value={editForm.workshopName}
                    onChange={(e) => setEditForm({ ...editForm, workshopName: e.target.value })}
                    className="saas-form-input"
                  />
                </div>

                <div className="saas-form-group">
                  <label className="saas-form-label">Nombre del Dueño / Titular</label>
                  <input
                    type="text"
                    required
                    value={editForm.ownerName}
                    onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                    className="saas-form-input"
                  />
                </div>

                <div className="saas-form-group">
                  <label className="saas-form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="saas-form-input"
                  />
                </div>

                <div className="saas-form-group">
                  <label className="saas-form-label">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="saas-form-input"
                  />
                </div>
              </div>

              <div className="saas-modal-footer">
                <button
                  type="button"
                  className="saas-btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="saas-btn-primary" style={{ background: '#3b82f6' }}>
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

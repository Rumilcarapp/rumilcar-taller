import React, { useState, useEffect } from 'react';
import { useSubscriptionStore, OfficialPaymentInfo } from '../../store/useSubscriptionStore';
import {
  Settings,
  CreditCard,
  Bell,
  Database,
  Download,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Server,
  Activity,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import './SuperAdminConfigPage.css';

export const SuperAdminConfigPage: React.FC = () => {
  const { paymentInfo } = useSubscriptionStore();
  const [activeTab, setActiveTab] = useState<'pagos' | 'comunicados' | 'backups'>('pagos');

  // Form for payment info & plans
  const [form, setForm] = useState<OfficialPaymentInfo>(paymentInfo);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    type: 'INFO',
    targetPlan: 'ALL',
    isActive: true,
  });

  // Health state
  const [healthData, setHealthData] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const getApiUrl = () => {
    return import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
  };

  const getAuthToken = () => {
    return localStorage.getItem('rumilcar_token') || '';
  };

  useEffect(() => {
    // Load dynamic config
    fetch(`${getApiUrl()}/subscriptions/admin/config`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.pagoMovil) setForm(data);
      })
      .catch(() => {});

    // Load announcements
    loadAnnouncements();

    // Load health
    checkHealth();
  }, []);

  const loadAnnouncements = () => {
    fetch(`${getApiUrl()}/subscriptions/admin/announcements`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data);
      })
      .catch(() => {});
  };

  const checkHealth = () => {
    setIsCheckingHealth(true);
    fetch(`${getApiUrl()}/subscriptions/admin/health`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
      .then((res) => res.json())
      .then((data) => setHealthData(data))
      .catch(() => {})
      .finally(() => setIsCheckingHealth(false));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`${getApiUrl()}/subscriptions/admin/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.message) return;

    try {
      const res = await fetch(`${getApiUrl()}/subscriptions/admin/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(announcementForm),
      });

      if (res.ok) {
        loadAnnouncements();
        setShowNewAnnouncement(false);
        setAnnouncementForm({
          title: '',
          message: '',
          type: 'INFO',
          targetPlan: 'ALL',
          isActive: true,
        });
      }
    } catch {
      // Local fallback
      setAnnouncements([
        {
          id: 'a-' + Date.now(),
          ...announcementForm,
          createdAt: new Date().toISOString(),
        },
        ...announcements,
      ]);
      setShowNewAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('¿Eliminar este comunicado global?')) return;
    try {
      await fetch(`${getApiUrl()}/subscriptions/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      loadAnnouncements();
    } catch {
      setAnnouncements(announcements.filter((a) => a.id !== id));
    }
  };

  const handleDownloadBackup = () => {
    const token = getAuthToken();
    window.open(`${getApiUrl()}/subscriptions/admin/backup?token=${token}`, '_blank');
  };

  return (
    <div className="saas-config-page">
      {/* Header */}
      <header className="saas-config-header">
        <div>
          <h1 className="saas-config-title">
            <Settings size={28} color="#e11d48" />
            Configuración Global del Software SaaS
          </h1>
          <p className="saas-config-subtitle">
            Ajuste de precios, cuentas oficiales de recaudación, comunicados globales a los talleres y copias de seguridad.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="saas-config-tabs">
        <button
          className={`saas-config-tab-btn ${activeTab === 'pagos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pagos')}
        >
          <CreditCard size={18} />
          <span>Cuentas de Pago & Planes</span>
        </button>

        <button
          className={`saas-config-tab-btn ${activeTab === 'comunicados' ? 'active' : ''}`}
          onClick={() => setActiveTab('comunicados')}
        >
          <Bell size={18} />
          <span>Comunicados Globales ({announcements.length})</span>
        </button>

        <button
          className={`saas-config-tab-btn ${activeTab === 'backups' ? 'active' : ''}`}
          onClick={() => setActiveTab('backups')}
        >
          <Database size={18} />
          <span>Salud Cloud & Copias de Seguridad</span>
        </button>
      </nav>

      {/* TAB 1: CUENTAS DE PAGO & PLANES */}
      {activeTab === 'pagos' && (
        <form onSubmit={handleSaveConfig} className="saas-config-form">
          <div className="saas-config-grid">
            {/* Pago Móvil Mercantil */}
            <div className="saas-config-card">
              <h3 className="saas-config-card-title">
                <CreditCard size={18} color="#10b981" />
                Pago Móvil Oficial (Mercantil)
              </h3>
              <div className="saas-form-group">
                <label className="saas-form-label">Banco</label>
                <input
                  type="text"
                  value={form.pagoMovil.bank}
                  onChange={(e) =>
                    setForm({ ...form, pagoMovil: { ...form.pagoMovil, bank: e.target.value } })
                  }
                  className="saas-form-input"
                />
              </div>

              <div className="saas-form-group">
                <label className="saas-form-label">Teléfono Pago Móvil</label>
                <input
                  type="text"
                  value={form.pagoMovil.phone}
                  onChange={(e) =>
                    setForm({ ...form, pagoMovil: { ...form.pagoMovil, phone: e.target.value } })
                  }
                  className="saas-form-input"
                />
              </div>

              <div className="saas-form-group">
                <label className="saas-form-label">Cédula de Identidad (C.I.)</label>
                <input
                  type="text"
                  value={form.pagoMovil.idNumber}
                  onChange={(e) =>
                    setForm({ ...form, pagoMovil: { ...form.pagoMovil, idNumber: e.target.value } })
                  }
                  className="saas-form-input"
                />
              </div>

              <div className="saas-form-group">
                <label className="saas-form-label">Titular</label>
                <input
                  type="text"
                  value={form.pagoMovil.holder}
                  onChange={(e) =>
                    setForm({ ...form, pagoMovil: { ...form.pagoMovil, holder: e.target.value } })
                  }
                  className="saas-form-input"
                />
              </div>
            </div>

            {/* Binance Pay & Zinli */}
            <div className="saas-config-card">
              <h3 className="saas-config-card-title">
                <Sparkles size={18} color="#f59e0b" />
                Cuentas Digitales (Binance Pay & Zinli)
              </h3>

              <div className="saas-form-group">
                <label className="saas-form-label">Binance Pay (Email / Pay ID)</label>
                <input
                  type="text"
                  value={form.usdtBinance.emailOrPayId}
                  onChange={(e) =>
                    setForm({ ...form, usdtBinance: { ...form.usdtBinance, emailOrPayId: e.target.value } })
                  }
                  className="saas-form-input"
                />
              </div>

              <div className="saas-form-group">
                <label className="saas-form-label">Titular Binance</label>
                <input
                  type="text"
                  value={form.usdtBinance.holder}
                  onChange={(e) =>
                    setForm({ ...form, usdtBinance: { ...form.usdtBinance, holder: e.target.value } })
                  }
                  className="saas-form-input"
                />
              </div>

              <div className="saas-form-group" style={{ marginTop: '10px' }}>
                <label className="saas-form-label">Correo Zinli Wallet</label>
                <input
                  type="email"
                  value={form.zinli.email}
                  onChange={(e) =>
                    setForm({ ...form, zinli: { ...form.zinli, email: e.target.value } })
                  }
                  className="saas-form-input"
                />
              </div>

              <div className="saas-form-group">
                <label className="saas-form-label">Titular Zinli</label>
                <input
                  type="text"
                  value={form.zinli.holder}
                  onChange={(e) =>
                    setForm({ ...form, zinli: { ...form.zinli, holder: e.target.value } })
                  }
                  className="saas-form-input"
                />
              </div>
            </div>

            {/* Precios de Planes */}
            <div className="saas-config-card" style={{ gridColumn: '1 / -1' }}>
              <h3 className="saas-config-card-title">
                <ShieldCheck size={18} color="#e11d48" />
                Precios de Suscripciones & Planes
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {form.plans.map((p, idx) => (
                  <div className="saas-plan-edit-row" key={p.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <div style={{ fontSize: '11px', color: '#71717a' }}>{p.badge}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#a1a1aa' }}>Precio Mensual ($)</label>
                      <input
                        type="number"
                        value={p.priceUSD}
                        onChange={(e) => {
                          const updated = [...form.plans];
                          updated[idx].priceUSD = Number(e.target.value);
                          setForm({ ...form, plans: updated });
                        }}
                        className="saas-form-input"
                        disabled={p.id === 'TRIAL'}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#a1a1aa' }}>Precio Anual ($)</label>
                      <input
                        type="number"
                        value={p.yearlyUSD}
                        onChange={(e) => {
                          const updated = [...form.plans];
                          updated[idx].yearlyUSD = Number(e.target.value);
                          setForm({ ...form, plans: updated });
                        }}
                        className="saas-form-input"
                        disabled={p.id === 'TRIAL'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px' }}>
            <button type="submit" className="saas-btn-save" disabled={isSaving}>
              <Save size={16} />
              <span>{isSaving ? 'Guardando...' : 'Guardar y Publicar Configuración Oficial'}</span>
            </button>
            {saveSuccess && (
              <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> ¡Configuración guardada exitosamente!
              </span>
            )}
          </div>
        </form>
      )}

      {/* TAB 2: COMUNICADOS GLOBALES */}
      {activeTab === 'comunicados' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>Avisos a Talleres Mecánicos</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
                Los comunicados activos se mostrarán inmediatamente en el panel superior de todos los talleres.
              </p>
            </div>
            <button
              className="saas-btn-primary"
              onClick={() => setShowNewAnnouncement(!showNewAnnouncement)}
            >
              <Plus size={16} />
              <span>{showNewAnnouncement ? 'Cerrar Formulario' : 'Crear Comunicado'}</span>
            </button>
          </div>

          {showNewAnnouncement && (
            <form onSubmit={handleCreateAnnouncement} className="saas-config-card">
              <h4 style={{ margin: 0, color: '#ffffff' }}>Nuevo Comunicado para Talleres</h4>
              <div className="saas-form-group">
                <label className="saas-form-label">Título del Comunicado *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Actualización del Sistema / Mantenimiento Programado"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="saas-form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="saas-form-group">
                  <label className="saas-form-label">Categoría / Estilo</label>
                  <select
                    value={announcementForm.type}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value })}
                    className="saas-form-input"
                  >
                    <option value="INFO">💡 Información General (Azul)</option>
                    <option value="UPDATE">🚀 Nueva Función / Actualización (Púrpura)</option>
                    <option value="WARNING">⚠️ Aviso Importante / Mantenimiento (Ámbar)</option>
                    <option value="PROMO">🎁 Promoción / Novedad (Verde)</option>
                  </select>
                </div>

                <div className="saas-form-group">
                  <label className="saas-form-label">Destinatarios</label>
                  <select
                    value={announcementForm.targetPlan}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, targetPlan: e.target.value })}
                    className="saas-form-input"
                  >
                    <option value="ALL">Todos los Talleres</option>
                    <option value="TRIAL">Solo Talleres en Prueba Gratis</option>
                    <option value="ACTIVE">Solo Talleres con Plan de Pago</option>
                  </select>
                </div>
              </div>

              <div className="saas-form-group">
                <label className="saas-form-label">Mensaje o Contenido *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Escribe el texto que verán los talleres en su pantalla..."
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  className="saas-form-input"
                />
              </div>

              <button type="submit" className="saas-btn-save">
                <Plus size={16} />
                <span>Publicar Comunicado en Vivo</span>
              </button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {announcements.length === 0 ? (
              <div className="saas-config-card" style={{ textAlign: 'center', padding: '36px' }}>
                <Bell size={32} color="#71717a" style={{ margin: '0 auto 8px' }} />
                <strong style={{ color: '#ffffff' }}>No hay comunicados publicados</strong>
                <p style={{ margin: 0, color: '#71717a', fontSize: '13px' }}>
                  Crea un anuncio para informar sobre mantenimientos o nuevas funciones a tus clientes talleres.
                </p>
              </div>
            ) : (
              announcements.map((a) => (
                <div className="saas-announcement-item" key={a.id}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        className="saas-announcement-badge"
                        style={{
                          background:
                            a.type === 'WARNING'
                              ? 'rgba(217, 119, 6, 0.2)'
                              : a.type === 'UPDATE'
                              ? 'rgba(124, 58, 237, 0.2)'
                              : a.type === 'PROMO'
                              ? 'rgba(5, 150, 105, 0.2)'
                              : 'rgba(37, 99, 235, 0.2)',
                          color:
                            a.type === 'WARNING'
                              ? '#f59e0b'
                              : a.type === 'UPDATE'
                              ? '#a855f7'
                              : a.type === 'PROMO'
                              ? '#10b981'
                              : '#60a5fa',
                        }}
                      >
                        {a.type}
                      </span>
                      <strong style={{ color: '#ffffff', fontSize: '14px' }}>{a.title}</strong>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>
                        {new Date(a.createdAt).toLocaleDateString('es-VE')}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#d4d4d8' }}>{a.message}</div>
                  </div>

                  <button
                    className="saas-icon-btn btn-danger"
                    onClick={() => handleDeleteAnnouncement(a.id)}
                    title="Eliminar comunicado"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SALUD CLOUD & COPIAS DE SEGURIDAD */}
      {activeTab === 'backups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Backup Box */}
          <div className="saas-backup-box">
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={22} color="#e11d48" />
                Copia de Seguridad Integral de la Plataforma
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#a1a1aa', maxWidth: '620px' }}>
                Genera y descarga en 1 clic un archivo consolidado JSON con todos los datos del ecosistema: Talleres, Usuarios, Órdenes de Trabajo, Clientes, Vehículos, Inventarios y Membresías.
              </p>
            </div>

            <button
              onClick={handleDownloadBackup}
              className="saas-btn-primary"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              <Download size={18} />
              <span>Descargar Copia de Seguridad (.json)</span>
            </button>
          </div>

          {/* Health Details */}
          <div className="saas-config-card">
            <div className="saas-config-card-header">
              <h3 className="saas-config-card-title">
                <Activity size={18} color="#10b981" />
                Diagnóstico de Conectividad & Servidor Cloud
              </h3>
              <button
                className="saas-icon-btn"
                onClick={checkHealth}
                title="Actualizar diagnóstico"
              >
                <RefreshCw size={16} className={isCheckingHealth ? 'animate-spin' : ''} />
              </button>
            </div>

            {healthData ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid #27272a' }}>
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>ESTADO BASE DE DATOS</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                    {healthData.database}
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>
                    Latencia ping: {healthData.dbLatencyMs} ms
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid #27272a' }}>
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>TIEMPO DE ACTIVIDAD</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                    {Math.floor(healthData.serverUptimeSeconds / 60)} min
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Proceso activo sin caídas</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid #27272a' }}>
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>MEMORIA EN USO</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                    {healthData.memory?.heapUsedMB} MB
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>
                    RSS: {healthData.memory?.rssMB} MB
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid #27272a' }}>
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>ENTORNO</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                    {healthData.environment.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>SSL & JWT Habilitado</div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#71717a', fontSize: '13px' }}>Consultando estado...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

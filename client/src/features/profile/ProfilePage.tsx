import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Badge, Modal } from '../../components/ui';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useCashStore } from '../../store/useCashStore';
import { usePersonnelStore, PersonnelMember } from '../../store/usePersonnelStore';
import { usePayrollStore } from '../../store/usePayrollStore';
import { useWorkshopStore } from '../../store/useWorkshopStore';
import {
  Sun, Moon, Palette, Building2, User, Globe, Phone, Mail, MapPin, FileText,
  Plus, Edit, UserCheck, UserX, Trash2,
  RefreshCw, DollarSign, Percent, CreditCard, Calendar,
  LogIn, Wrench, LogOut, CheckCircle2, AlertCircle, Home, Check, Smartphone, Landmark, QrCode, Star, ExternalLink,
  Camera, Upload, Image as ImageIcon
} from 'lucide-react';
import './ProfilePage.css';

export const ProfilePage: React.FC = () => {
  // Workshop Profile Store (100% auto-persisted in real-time)
  const {
    workshop,
    updateWorkshop,
    updatePaymentDetails,
    paymentMethods,
    togglePaymentMethod,
    lastSavedAt,
    isSaving,
    fetchWorkshop
  } = useWorkshopStore();

  // CashStore currency and automatic exchange rate state
  const {
    exchangeRateVES,
    autoRate,
    lastRateUpdate,
    isFetchingRate,
    rateError,
    setAutoRate,
    setExchangeRateVES,
    fetchAutoExchangeRate
  } = useCashStore();

  const [manualRateInput, setManualRateInput] = useState(exchangeRateVES.toString());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Google My Business modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleUrlInput, setGoogleUrlInput] = useState('');

  // Personnel Store
  const {
    personnel,
    fetchPersonnel,
    addPersonnel,
    updatePersonnel,
    deletePersonnel,
    togglePersonnelStatus
  } = usePersonnelStore();

  // Personnel Modal state
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);
  const [editingMember, setEditingMember] = useState<PersonnelMember | null>(null);
  const [personnelForm, setPersonnelForm] = useState<{
    name: string;
    specialty: string;
    phone: string;
    isActive: boolean;
    esquema: 'porcentaje' | 'fijo' | 'mixto';
    porcentajeServicios: number;
    montoFijo: number;
  }>({
    name: '',
    specialty: '',
    phone: '',
    isActive: true,
    esquema: 'porcentaje',
    porcentajeServicios: 30,
    montoFijo: 200
  });

  // Profile completeness calculation
  const fields = [
    workshop.name,
    workshop.legalName,
    workshop.taxId,
    workshop.address,
    workshop.ownerName,
    workshop.email,
    workshop.phone,
    exchangeRateVES
  ];
  const filled = fields.filter(Boolean).length;
  const completeness = Math.round((filled / fields.length) * 100);

  const { isLight, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  // Load fresh workshop and personnel from PostgreSQL database on mount
  useEffect(() => {
    fetchWorkshop();
    fetchPersonnel();
  }, []);

  // Automatic Rate sync when page loads or when autoRate changes
  useEffect(() => {
    if (autoRate) {
      fetchAutoExchangeRate();
    }
  }, [autoRate]);

  useEffect(() => {
    setManualRateInput(exchangeRateVES.toString());
  }, [exchangeRateVES]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const triggerSaveFeedback = (msg = '¡Datos guardados con éxito!') => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP o SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize and resize via canvas to ensure light payload (~30-60KB)
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/png');
          updateWorkshop({ logoUrl: optimizedDataUrl });
          triggerSaveFeedback('¡Logotipo del taller actualizado correctamente!');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input value to allow selecting same file again
    e.target.value = '';
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Deseas restablecer el logotipo al predeterminado de Rumilcar?')) {
      updateWorkshop({ logoUrl: '' });
      triggerSaveFeedback('Logotipo restablecido al predeterminado');
    }
  };

  // Personnel Handlers
  const handleOpenAddPersonnel = () => {
    setEditingMember(null);
    setPersonnelForm({
      name: '',
      specialty: 'Mecánica general',
      phone: '',
      isActive: true,
      esquema: 'porcentaje',
      porcentajeServicios: 30,
      montoFijo: 200
    });
    setShowPersonnelModal(true);
  };

  const handleOpenEditPersonnel = (member: PersonnelMember) => {
    setEditingMember(member);
    setPersonnelForm({
      name: member.name,
      specialty: member.specialty,
      phone: member.phone || '',
      isActive: member.isActive,
      esquema: member.esquema || 'porcentaje',
      porcentajeServicios: member.porcentajeServicios ?? 30,
      montoFijo: member.montoFijo ?? 200
    });
    setShowPersonnelModal(true);
  };

  const handleDeletePersonnel = (member: PersonnelMember) => {
    const ok = window.confirm(
      `¿Estás seguro de que deseas eliminar a "${member.name}" del equipo de personal?\n\nEsta acción no se puede deshacer.`
    );
    if (ok) {
      deletePersonnel(member.id);
      if (editingMember?.id === member.id) {
        setShowPersonnelModal(false);
        setEditingMember(null);
      }
      triggerSaveFeedback(`Personal "${member.name}" eliminado`);
    }
  };

  const handleSavePersonnel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!personnelForm.name.trim()) {
      alert('Por favor indica el nombre completo del personal.');
      return;
    }
    if (!personnelForm.specialty.trim()) {
      alert('Por favor especifica la especialidad o cargo.');
      return;
    }

    if (editingMember) {
      updatePersonnel(editingMember.id, {
        name: personnelForm.name.trim(),
        specialty: personnelForm.specialty.trim(),
        phone: personnelForm.phone.trim(),
        isActive: personnelForm.isActive,
        esquema: personnelForm.esquema,
        porcentajeServicios: Number(personnelForm.porcentajeServicios) || 0,
        montoFijo: Number(personnelForm.montoFijo) || 0
      });

      // Synchronize with usePayrollStore config
      usePayrollStore.getState().saveMechanicConfig({
        mecanicoId: editingMember.name,
        mecanicoNombre: personnelForm.name.trim(),
        esquema: personnelForm.esquema,
        porcentajeServicios: Number(personnelForm.porcentajeServicios) || 0,
        montoFijo: Number(personnelForm.montoFijo) || 0
      });
      triggerSaveFeedback('Datos de personal actualizados');
    } else {
      const created = addPersonnel({
        name: personnelForm.name.trim(),
        specialty: personnelForm.specialty.trim(),
        phone: personnelForm.phone.trim(),
        isActive: personnelForm.isActive,
        esquema: personnelForm.esquema,
        porcentajeServicios: Number(personnelForm.porcentajeServicios) || 0,
        montoFijo: Number(personnelForm.montoFijo) || 0
      });

      // Synchronize with usePayrollStore config
      usePayrollStore.getState().saveMechanicConfig({
        mecanicoId: created.name,
        mecanicoNombre: created.name,
        esquema: personnelForm.esquema,
        porcentajeServicios: Number(personnelForm.porcentajeServicios) || 0,
        montoFijo: Number(personnelForm.montoFijo) || 0
      });
      triggerSaveFeedback('Nuevo personal registrado');
    }

    setShowPersonnelModal(false);
    setEditingMember(null);
  };

  return (
    <div className="profile-page page-enter">
      {/* Toast de Guardado Automático */}
      {saveSuccessMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <CheckCircle2 size={18} /> {saveSuccessMsg}
        </div>
      )}

      {/* ===== HEADER ===== */}
      <div className="profile-header-card">
        <div className="profile-header-left">
          {/* Input oculto para subir archivo de logo */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            style={{ display: 'none' }}
            onChange={handleLogoUpload}
          />

          <div 
            className="profile-logo-container" 
            onClick={() => fileInputRef.current?.click()}
            title="Haz clic para subir o cambiar el logotipo de tu taller"
            style={{ 
              background: 'var(--color-bg-tertiary)', 
              border: '2px solid var(--color-border)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '6px',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
          >
            <img 
              src={workshop.logoUrl || '/logo-tight.png'} 
              alt="Logo Taller" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
            {/* Overlay al pasar el mouse */}
            <div 
              className="logo-hover-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
                opacity: 0,
                transition: 'opacity 0.2s ease',
                gap: '2px'
              }}
            >
              <Camera size={18} />
              <span>Cambiar</span>
            </div>
          </div>

          <div className="profile-header-info">
            <h1 className="profile-workshop-name">{workshop.name || 'Mi Taller Mecánico'}</h1>
            <p className="profile-tax-id">RIF: {workshop.taxId || 'Sin RIF'}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  background: 'transparent',
                  border: 'none',
                  padding: '0',
                  cursor: 'pointer'
                }}
              >
                <Upload size={12} /> {workshop.logoUrl ? 'Cambiar logotipo' : 'Subir logotipo'}
              </button>

              {workshop.logoUrl && (
                <>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>•</span>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-danger, #ef4444)',
                      background: 'transparent',
                      border: 'none',
                      padding: '0',
                      cursor: 'pointer'
                    }}
                  >
                    Restablecer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botón de Sincronización Manual con la Nube */}
          <button
            type="button"
            onClick={async () => {
              try {
                await fetchWorkshop();
                await fetchPersonnel();
                triggerSaveFeedback('¡Datos actualizados desde la nube!');
              } catch {
                triggerSaveFeedback('Error al sincronizar datos');
              }
            }}
            title="Recargar datos más recientes directamente desde la nube"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCw size={13} />
            <span>Sincronizar Nube</span>
          </button>

          {/* Indicador de Guardado Automático */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: isSaving ? 'var(--color-primary)' : '#10b981',
            background: isSaving ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${isSaving ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
            padding: '5px 12px',
            borderRadius: '20px',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }} title="Todos los campos se guardan automáticamente al escribir o cambiar opciones">
            {isSaving ? (
              <>
                <RefreshCw size={14} className="spin-icon" />
                <span>Guardando en la nube...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>Guardado automáticamente{lastSavedAt ? ` (${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}</span>
              </>
            )}
          </div>

          <div className="profile-completeness">
            <div className="completeness-info">
              <span className="completeness-label">Perfil</span>
              <span className="completeness-value">{completeness}%</span>
            </div>
            <div className="completeness-bar">
              <div className="completeness-fill" style={{ width: `${completeness}%` }} />
            </div>
          </div>

          {/* BOTÓN: LISTO, VOLVER AL INICIO */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/')}
            icon={<CheckCircle2 size={16} />}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
            }}
            title="Guardar cambios y volver al panel principal de inicio"
          >
            Listo, Volver al Inicio
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
            icon={<LogOut size={16} />}
            title="Cerrar Sesión de Rumilcarapp"
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>

      <div className="profile-grid">
        {/* ===== CARD B: DATOS DE LA EMPRESA ===== */}
        <Card
          title="Datos de la Empresa"
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<Check size={14} />}
              onClick={() => triggerSaveFeedback('¡Datos de la empresa guardados con éxito!')}
            >
              Guardado Auto
            </Button>
          }
        >
          <div className="form-grid">
            <Input
              label="Nombre comercial del taller"
              value={workshop.name}
              icon={<Building2 size={16} />}
              placeholder="Ej: Taller Rumilcar Motors"
              hint="Se mostrará en la cabecera, presupuestos y órdenes impresas."
              onChange={e => updateWorkshop({ name: e.target.value })}
            />
            <Input
              label="Razón social fiscal"
              value={workshop.legalName}
              placeholder="Ej: Inversiones Rumilcar C.A."
              onChange={e => updateWorkshop({ legalName: e.target.value })}
            />
            <Input
              label="Número de Identificación Fiscal (RIF / CUIT / RFC)"
              value={workshop.taxId}
              icon={<FileText size={16} />}
              placeholder="J-00000000-0"
              onChange={e => updateWorkshop({ taxId: e.target.value })}
            />
            <Input
              label="Dirección física del taller"
              value={workshop.address}
              icon={<MapPin size={16} />}
              placeholder="Av. Principal, Galpón #5..."
              onChange={e => updateWorkshop({ address: e.target.value })}
            />
            <Input
              label="Sitio web o enlace a redes sociales"
              value={workshop.website}
              icon={<Globe size={16} />}
              placeholder="www.mitaller.com o instagram.com/mitaller"
              onChange={e => updateWorkshop({ website: e.target.value })}
            />
          </div>
        </Card>

        {/* ===== CARD C: DATOS DEL RESPONSABLE ===== */}
        <Card
          title="Datos del Responsable"
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<Check size={14} />}
              onClick={() => triggerSaveFeedback('¡Datos del responsable guardados con éxito!')}
            >
              Guardado Auto
            </Button>
          }
        >
          <div className="form-grid">
            <Input
              label="Nombre del responsable o gerente"
              value={workshop.ownerName}
              icon={<User size={16} />}
              placeholder="Ej: Ing. Juan Pérez"
              onChange={e => updateWorkshop({ ownerName: e.target.value })}
            />
            <Input
              label="Correo electrónico de contacto"
              value={workshop.email}
              icon={<Mail size={16} />}
              type="email"
              placeholder="contacto@taller.com"
              onChange={e => updateWorkshop({ email: e.target.value })}
            />
            <div className="phone-input-group">
              <div className="phone-prefix">
                <span>+58</span>
              </div>
              <Input
                label="Teléfono principal del taller"
                value={workshop.phone}
                icon={<Phone size={16} />}
                placeholder="0212-5551234 o 0414-1234567"
                onChange={e => updateWorkshop({ phone: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* ===== CARD D: CONFIG REGIONAL Y MONEDAS ===== */}
        <Card title="Configuración Regional y Monedas" subtitle="Configura las monedas y tasas de cambio de tu taller" className="profile-currency-card">
          <div className="currency-config">
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Moneda ancla</label>
                <select
                  className="input-field"
                  value={workshop.anchorCurrency}
                  onChange={e => updateWorkshop({ anchorCurrency: e.target.value as any })}
                >
                  <option value="USD">USD - Dólar estadounidense</option>
                  <option value="VES">VES - Bolívar</option>
                </select>
              </div>

              <div className="rate-input-row">
                <Input
                  label="Tasa VES/USD"
                  value={autoRate ? exchangeRateVES.toString() : manualRateInput}
                  type="number"
                  step="0.01"
                  icon={<DollarSign size={16} />}
                  suffix={<span className="rate-suffix">Bs/$</span>}
                  disabled={autoRate}
                  hint={
                    autoRate
                      ? `🟢 Tasa oficial actualizada automáticamente vía BCV${
                          lastRateUpdate
                            ? ` (${new Date(lastRateUpdate).toLocaleDateString('es-VE')} ${new Date(lastRateUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                            : ''
                        }`
                      : 'Modo manual: escribe la tasa personalizada que prefieras aplicar.'
                  }
                  onChange={e => {
                    setManualRateInput(e.target.value);
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setExchangeRateVES(val);
                    }
                  }}
                />

                <div className="rate-toggle">
                  <label className="toggle-label" title={autoRate ? "Modo automático activado (sincroniza con BCV)" : "Modo manual activado"}>
                    <input
                      type="checkbox"
                      className="toggle-input"
                      checked={autoRate}
                      onChange={e => {
                        const checked = e.target.checked;
                        setAutoRate(checked);
                      }}
                    />
                    <span className="toggle-track"><span className="toggle-thumb" /></span>
                    <span className="toggle-text" style={{ fontWeight: 700 }}>
                      {autoRate ? 'Automático (BCV)' : 'Manual'}
                    </span>
                  </label>

                  {autoRate && (
                    <button
                      type="button"
                      className="rate-refresh-btn"
                      onClick={() => fetchAutoExchangeRate()}
                      disabled={isFetchingRate}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isFetchingRate ? 'wait' : 'pointer'
                      }}
                      title="Consultar y actualizar tasa oficial en este momento"
                    >
                      <RefreshCw size={14} className={isFetchingRate ? 'spin-icon' : ''} />
                      {isFetchingRate ? 'Actualizando...' : 'Actualizar'}
                    </button>
                  )}
                </div>
              </div>

              {rateError && (
                <div style={{ fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> {rateError}
                </div>
              )}

              <Input
                label="Spread USDT"
                value={workshop.usdtSpread}
                type="number"
                step="0.1"
                icon={<Percent size={16} />}
                hint="Comisión adicional al cobrar en USDT. 0% = igual que USD."
                onChange={e => updateWorkshop({ usdtSpread: e.target.value })}
              />
            </div>

            <div className="payment-methods-section">
              <h4 className="methods-title">
                <CreditCard size={16} /> Métodos de pago habilitados (Se guardan automáticamente)
              </h4>
              <div className="methods-grid">
                {paymentMethods.map(m => (
                  <label key={m.key} className={`method-item ${m.enabled ? 'method-enabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={m.enabled}
                      onChange={() => togglePaymentMethod(m.key)}
                    />
                    <span className="method-check" />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ===== CARD E: DATOS DE PAGO Y CUENTAS BANCARIAS DEL TALLER ===== */}
        <Card
          title="Datos de Pago y Cuentas Bancarias del Taller"
          subtitle="Estos datos aparecerán automáticamente en tus mensajes de WhatsApp, facturas y comprobantes"
          className="profile-payment-details-card"
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<Check size={14} />}
              onClick={() => triggerSaveFeedback('¡Datos de pago bancarios guardados con éxito!')}
            >
              Guardado Auto
            </Button>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Sección Pago Móvil */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '18px', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 800 }}>
                <Smartphone size={18} />
                <span>Datos para Pago Móvil (VES)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input
                  label="Banco"
                  value={workshop.paymentDetails?.pagoMovil?.banco || ''}
                  placeholder="Ej: Banesco (0134), Mercantil (0105), BDV..."
                  onChange={e => updatePaymentDetails({
                    pagoMovil: {
                      ...(workshop.paymentDetails?.pagoMovil || { banco: '', telefono: '', cedulaRif: '', titular: '' }),
                      banco: e.target.value
                    }
                  })}
                />
                <Input
                  label="Teléfono Pago Móvil"
                  value={workshop.paymentDetails?.pagoMovil?.telefono || ''}
                  placeholder="Ej: 0414-1234567 / 0412-9876543"
                  onChange={e => updatePaymentDetails({
                    pagoMovil: {
                      ...(workshop.paymentDetails?.pagoMovil || { banco: '', telefono: '', cedulaRif: '', titular: '' }),
                      telefono: e.target.value
                    }
                  })}
                />
                <Input
                  label="Cédula / RIF"
                  value={workshop.paymentDetails?.pagoMovil?.cedulaRif || ''}
                  placeholder="Ej: V-18234567 o J-12345678-0"
                  onChange={e => updatePaymentDetails({
                    pagoMovil: {
                      ...(workshop.paymentDetails?.pagoMovil || { banco: '', telefono: '', cedulaRif: '', titular: '' }),
                      cedulaRif: e.target.value.toUpperCase()
                    }
                  })}
                />
                <Input
                  label="Nombre del Titular"
                  value={workshop.paymentDetails?.pagoMovil?.titular || ''}
                  placeholder="Ej: Multiservicios Rumilcar C.A. / Juan Pérez"
                  onChange={e => updatePaymentDetails({
                    pagoMovil: {
                      ...(workshop.paymentDetails?.pagoMovil || { banco: '', telefono: '', cedulaRif: '', titular: '' }),
                      titular: e.target.value
                    }
                  })}
                />
              </div>
            </div>

            {/* Sección Transferencia Bancaria */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '18px', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 800 }}>
                <Landmark size={18} />
                <span>Datos para Transferencia Bancaria Nacional</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input
                  label="Banco"
                  value={workshop.paymentDetails?.transferencia?.banco || ''}
                  placeholder="Ej: Banesco, Banco de Venezuela, Provincial..."
                  onChange={e => updatePaymentDetails({
                    transferencia: {
                      ...(workshop.paymentDetails?.transferencia || { banco: '', numeroCuenta: '', cedulaRif: '', titular: '' }),
                      banco: e.target.value
                    }
                  })}
                />
                <Input
                  label="Número de Cuenta (20 dígitos)"
                  value={workshop.paymentDetails?.transferencia?.numeroCuenta || ''}
                  placeholder="0134-XXXX-XX-XXXXXXXXXX"
                  onChange={e => updatePaymentDetails({
                    transferencia: {
                      ...(workshop.paymentDetails?.transferencia || { banco: '', numeroCuenta: '', cedulaRif: '', titular: '' }),
                      numeroCuenta: e.target.value
                    }
                  })}
                />
                <Input
                  label="RIF / Cédula"
                  value={workshop.paymentDetails?.transferencia?.cedulaRif || ''}
                  placeholder="Ej: J-12345678-0"
                  onChange={e => updatePaymentDetails({
                    transferencia: {
                      ...(workshop.paymentDetails?.transferencia || { banco: '', numeroCuenta: '', cedulaRif: '', titular: '' }),
                      cedulaRif: e.target.value.toUpperCase()
                    }
                  })}
                />
                <Input
                  label="Nombre / Razón Social del Titular"
                  value={workshop.paymentDetails?.transferencia?.titular || ''}
                  placeholder="Ej: Multiservicios Rumilcar C.A."
                  onChange={e => updatePaymentDetails({
                    transferencia: {
                      ...(workshop.paymentDetails?.transferencia || { banco: '', numeroCuenta: '', cedulaRif: '', titular: '' }),
                      titular: e.target.value
                    }
                  })}
                />
              </div>
            </div>

            {/* Sección Zelle (USD) */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '18px', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6', fontWeight: 800 }}>
                <CreditCard size={18} />
                <span>Zelle (USD)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input
                  label="Correo Electrónico Zelle"
                  value={workshop.paymentDetails?.zelle?.email || ''}
                  placeholder="pagos@taller.com"
                  onChange={e => updatePaymentDetails({
                    zelle: {
                      ...(workshop.paymentDetails?.zelle || { email: '', titular: '' }),
                      email: e.target.value
                    }
                  })}
                />
                <Input
                  label="Nombre del Titular Zelle"
                  value={workshop.paymentDetails?.zelle?.titular || ''}
                  placeholder="Ej: Nombre Empresa / Persona"
                  onChange={e => updatePaymentDetails({
                    zelle: {
                      ...(workshop.paymentDetails?.zelle || { email: '', titular: '' }),
                      titular: e.target.value
                    }
                  })}
                />
              </div>
            </div>

            {/* Sección Binance Pay / USDT */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '18px', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 800 }}>
                <QrCode size={18} />
                <span>Binance Pay / USDT</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input
                  label="Binance Pay ID o Correo Binance"
                  value={workshop.paymentDetails?.binanceUSDT?.payIdOrEmail || ''}
                  placeholder="Ej: 123456789 o binance@taller.com"
                  onChange={e => updatePaymentDetails({
                    binanceUSDT: {
                      ...(workshop.paymentDetails?.binanceUSDT || { payIdOrEmail: '', red: 'TRC-20 / Binance Pay' }),
                      payIdOrEmail: e.target.value
                    }
                  })}
                />
                <Input
                  label="Red / Protocolo"
                  value={workshop.paymentDetails?.binanceUSDT?.red || ''}
                  placeholder="Ej: Binance Pay / Tron (TRC-20)"
                  onChange={e => updatePaymentDetails({
                    binanceUSDT: {
                      ...(workshop.paymentDetails?.binanceUSDT || { payIdOrEmail: '', red: 'TRC-20 / Binance Pay' }),
                      red: e.target.value
                    }
                  })}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* ===== CARD F: EQUIPO DE MECÁNICOS / PERSONAL ===== */}
        <Card
          title="Equipo de Mecánicos y Personal"
          subtitle={`${personnel.filter(m => m.isActive).length} miembros del personal activos`}
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={handleOpenAddPersonnel}
            >
              Agregar Personal
            </Button>
          }
          className="profile-mechanics-card"
        >
          <div className="mechanics-table-container">
            <table className="mechanics-table">
              <thead>
                <tr>
                  <th>Personal / Mecánico</th>
                  <th>Especialidad / Cargo</th>
                  <th>Esquema Nómina</th>
                  <th>Órdenes Activas</th>
                  <th>Completadas</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {personnel.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                      No hay miembros registrados en el personal. Haz clic en "Agregar Personal" para comenzar.
                    </td>
                  </tr>
                ) : (
                  personnel.map(mech => (
                    <tr key={mech.id} className={!mech.isActive ? 'row-inactive' : ''}>
                      <td>
                        <div className="mechanic-cell">
                          <div className="mechanic-avatar">{mech.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <span className="mechanic-name">{mech.name}</span>
                            <span className="mechanic-phone">{mech.phone || 'Sin teléfono'}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="mechanic-specialty">{mech.specialty}</span></td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)'
                        }}>
                          {mech.esquema === 'porcentaje'
                            ? `${mech.porcentajeServicios || 30}% comisión`
                            : mech.esquema === 'fijo'
                            ? `$${mech.montoFijo || 200} fijo`
                            : `Mixto ($${mech.montoFijo || 100} + ${mech.porcentajeServicios || 15}%)`}
                        </span>
                      </td>
                      <td><span className="mechanic-stat">{mech.activeOrders || 0}</span></td>
                      <td><span className="mechanic-stat">{mech.completedOrders || 0}</span></td>
                      <td>
                        <Badge variant={mech.isActive ? 'success' : 'default'} dot>
                          {mech.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td>
                        <div className="mechanic-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="action-btn"
                            title="Editar datos del personal"
                            onClick={() => handleOpenEditPersonnel(mech)}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            className="action-btn action-btn-delete"
                            title="Eliminar este miembro del personal"
                            onClick={() => handleDeletePersonnel(mech)}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            title={mech.isActive ? 'Desactivar personal' : 'Activar personal'}
                            onClick={() => togglePersonnelStatus(mech.id)}
                          >
                            {mech.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ===== CARD G: ACTIVIDAD DE LA CUENTA ===== */}
        <Card title="Actividad de la Cuenta">
          <div className="account-activity">
            <div className="activity-item">
              <Calendar size={18} className="activity-icon" />
              <div>
                <span className="activity-label">Cuenta creada</span>
                <span className="activity-value">{workshop.createdAt}</span>
              </div>
            </div>
            <div className="activity-item">
              <LogIn size={18} className="activity-icon" />
              <div>
                <span className="activity-label">Último ingreso</span>
                <span className="activity-value">{workshop.lastLogin}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ===== CARD H: PREFERENCIAS DE INTERFAZ ===== */}
        <Card title="Preferencias de Interfaz">
          <div className="account-activity">
            <div className="activity-item" style={{ justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Palette size={18} className="activity-icon" />
                <div>
                  <span className="activity-label">Modo de visualización</span>
                  <span className="activity-value">{isLight ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </div>
              </div>
              <div className="rate-toggle">
                <label className="toggle-label">
                  <input type="checkbox" className="toggle-input" checked={isLight} onChange={toggleTheme} />
                  <span className="toggle-track"><span className="toggle-thumb" /></span>
                  <span className="toggle-text">{isLight ? <Sun size={14}/> : <Moon size={14}/>}</span>
                </label>
              </div>
            </div>
          </div>
        </Card>
        {/* ===== CARD I: INTEGRACIONES ===== */}
        <Card title="Integraciones y Canales" className="profile-integrations-card">
          <div className="integrations-list">
            <div className="integration-item">
              <div className="integration-icon integration-whatsapp">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div className="integration-info">
                <span className="integration-name">WhatsApp Business</span>
                <span className="integration-desc">Envía recordatorios y notificaciones a tus clientes</span>
              </div>
              <Badge variant="success" dot>Conectado</Badge>
              <Button variant="ghost" size="sm">Configurar</Button>
            </div>

            <div className="integration-item">
              <div className="integration-icon integration-google">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </div>
              <div className="integration-info">
                <span className="integration-name">Google My Business / Maps</span>
                <span className="integration-desc">
                  {workshop.googleReviewUrl
                    ? 'Reseñas de 5 estrellas activas en WhatsApp y seguimiento'
                    : 'Solicita reseñas de 5 estrellas en Google a tus clientes'}
                </span>
              </div>
              {workshop.googleReviewUrl ? (
                <Badge variant="success" dot>Conectado</Badge>
              ) : (
                <Badge variant="default">Desconectado</Badge>
              )}
              <Button
                variant={workshop.googleReviewUrl ? "outline" : "secondary"}
                size="sm"
                onClick={() => {
                  setGoogleUrlInput(workshop.googleReviewUrl || '');
                  setShowGoogleModal(true);
                }}
              >
                {workshop.googleReviewUrl ? 'Configurar' : 'Conectar'}
              </Button>
            </div>
          </div>
        </Card>

      </div>

      {/* ===== BANNER INFERIOR: LISTO PARA VOLVER AL INICIO ===== */}
      <div style={{
        marginTop: '28px',
        padding: '20px 24px',
        borderRadius: '12px',
        background: 'var(--color-bg-surface, #1e1e1e)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>
              ¡Perfil y configuración listos!
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Todos los datos de tu taller se guardan automáticamente en tiempo real.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/trabajos')}
          >
            Ir a Órdenes de Trabajo
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/')}
            icon={<Home size={18} />}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              fontWeight: 700,
              padding: '10px 22px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            Listo, Volver al Inicio
          </Button>
        </div>
      </div>

      {/* Modal para Agregar / Editar Personal */}
      <Modal
        isOpen={showPersonnelModal}
        onClose={() => {
          setShowPersonnelModal(false);
          setEditingMember(null);
        }}
        title={editingMember ? `Editar Personal: ${editingMember.name}` : 'Registrar Nuevo Miembro del Personal'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            {editingMember ? (
              <Button
                variant="danger"
                size="sm"
                type="button"
                icon={<Trash2 size={14} />}
                onClick={() => handleDeletePersonnel(editingMember)}
              >
                Eliminar
              </Button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setShowPersonnelModal(false);
                  setEditingMember(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleSavePersonnel}
                icon={editingMember ? <CheckCircle2 size={16} /> : <Plus size={16} />}
              >
                {editingMember ? 'Guardar Cambios' : 'Registrar Personal'}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSavePersonnel} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="Ej: Carlos Martínez"
              value={personnelForm.name}
              onChange={e => setPersonnelForm({ ...personnelForm, name: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Especialidad / Cargo *
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Ej: Mecánica general, Electricidad..."
                value={personnelForm.specialty}
                onChange={e => setPersonnelForm({ ...personnelForm, specialty: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Teléfono / Celular
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="0412-1234567"
                value={personnelForm.phone}
                onChange={e => setPersonnelForm({ ...personnelForm, phone: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
            <input
              type="checkbox"
              id="personnelActiveCheck"
              checked={personnelForm.isActive}
              onChange={e => setPersonnelForm({ ...personnelForm, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="personnelActiveCheck" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Personal Activo (Disponible para asignación de órdenes y liquidación)
            </label>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '4px' }}>
            <label className="input-label" style={{ fontWeight: 700, fontSize: '13px', display: 'block', marginBottom: '8px' }}>
              💼 Esquema de Pago de Nómina
            </label>

            <div className="input-group">
              <label className="input-label">Tipo de Esquema</label>
              <select
                className="input-field"
                value={personnelForm.esquema}
                onChange={e => setPersonnelForm({ ...personnelForm, esquema: e.target.value as any })}
              >
                <option value="porcentaje">Opción A — Porcentaje (%) sobre mano de obra de órdenes</option>
                <option value="fijo">Opción B — Monto Fijo Acordado ($ quincenal o mensual)</option>
                <option value="mixto">Opción C — Mixto (Monto base fijo + % comisión)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              {(personnelForm.esquema === 'porcentaje' || personnelForm.esquema === 'mixto') && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Porcentaje Comisión (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input-field"
                    placeholder="30"
                    value={personnelForm.porcentajeServicios}
                    onChange={e => setPersonnelForm({ ...personnelForm, porcentajeServicios: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Sobre servicios (excluye repuestos)</span>
                </div>
              )}

              {(personnelForm.esquema === 'fijo' || personnelForm.esquema === 'mixto') && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Monto Fijo / Base ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    placeholder="200"
                    value={personnelForm.montoFijo}
                    onChange={e => setPersonnelForm({ ...personnelForm, montoFijo: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal para Conectar Google My Business */}
      <Modal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        title="Conectar Google My Business / Reseñas de Google"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            {workshop.googleReviewUrl ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  updateWorkshop({ googleReviewUrl: '' });
                  setShowGoogleModal(false);
                  triggerSaveFeedback('Integración de Google desconectada');
                }}
              >
                Desconectar
              </Button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowGoogleModal(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Star size={14} />}
                onClick={() => {
                  if (googleUrlInput && !googleUrlInput.startsWith('http://') && !googleUrlInput.startsWith('https://')) {
                    alert('Por favor introduce un enlace web válido (debe comenzar con https://)');
                    return;
                  }
                  updateWorkshop({ googleReviewUrl: googleUrlInput.trim() });
                  setShowGoogleModal(false);
                  triggerSaveFeedback('¡Google My Business conectado con éxito!');
                }}
              >
                Guardar y Conectar
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '6px 0' }}>
          <div style={{
            background: 'rgba(66, 133, 244, 0.08)',
            border: '1px solid rgba(66, 133, 244, 0.25)',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <div style={{ color: '#4285F4', marginTop: '2px' }}>
              <Star size={20} fill="#FBBC05" color="#FBBC05" />
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
              <strong style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '2px' }}>
                Atrae más clientes en tu zona con Google Maps
              </strong>
              Al ingresar tu enlace directo para opiniones, tus clientes recibirán una invitación de 5 estrellas al retirar su auto por WhatsApp y en su comprobante web.
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Enlace de tu Perfil de Google Maps o Solicitud de Reseñas:
            </label>
            <Input
              value={googleUrlInput}
              placeholder="Ej: https://g.page/r/tu-taller/review o https://maps.app.goo.gl/..."
              icon={<ExternalLink size={16} />}
              onChange={e => setGoogleUrlInput(e.target.value)}
              hint="Puedes obtener este link abriendo Google Maps > Tu Perfil de Negocio > 'Solicitar opiniones'."
            />
          </div>

          {googleUrlInput && (
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
              <CheckCircle2 size={14} /> Enlace listo para ser incluido en los mensajes y comprobantes
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
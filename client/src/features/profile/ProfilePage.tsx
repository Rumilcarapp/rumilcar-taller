import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Badge, Modal } from '../../components/ui';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../stores/authStore';
import {
  Sun, Moon, Palette, Building2, User, Globe, Phone, Mail, MapPin, FileText,
  Upload, Wifi, WifiOff, Plus, Edit, UserCheck, UserX,
  RefreshCw, DollarSign, Percent, CreditCard, Calendar,
  LogIn, Wrench, Clock, LogOut
} from 'lucide-react';
import './ProfilePage.css';

// Mock data
const mockMechanics = [
  { id: '1', name: 'Carlos Martinez', specialty: 'Mecanica general', phone: '0412-5551234', isActive: true, activeOrders: 3, completedOrders: 47, avgTime: '2.5 dias' },
  { id: '2', name: 'Pedro Rodriguez', specialty: 'Electricidad automotriz', phone: '0414-5554567', isActive: true, activeOrders: 2, completedOrders: 35, avgTime: '1.8 dias' },
  { id: '3', name: 'Luis Garcia', specialty: 'Frenos y suspension', phone: '0424-5557890', isActive: true, activeOrders: 1, completedOrders: 52, avgTime: '1.2 dias' },
  { id: '4', name: 'Jose Hernandez', specialty: 'Aire acondicionado', phone: '0416-5550123', isActive: false, activeOrders: 0, completedOrders: 28, avgTime: '3.1 dias' },
];

const paymentMethods = [
  { key: 'CASH_USD', label: 'Efectivo USD', enabled: true },
  { key: 'CASH_VES', label: 'Efectivo VES', enabled: true },
  { key: 'PAGO_MOVIL', label: 'Pago Movil', enabled: true },
  { key: 'BANK_TRANSFER', label: 'Transferencia bancaria', enabled: true },
  { key: 'ZELLE', label: 'Zelle', enabled: true },
  { key: 'USDT_WALLET', label: 'USDT / Binance Pay', enabled: true },
  { key: 'POS', label: 'Punto de venta (POS)', enabled: false },
];

export const ProfilePage: React.FC = () => {
  const [workshop, setWorkshop] = useState({
    name: 'Taller Don Pedro',
    legalName: 'Inversiones Don Pedro C.A.',
    taxId: 'J-12345678-9',
    address: 'Av. Principal, Centro Comercial El Mecanico, Local 5, Caracas',
    website: 'www.tallerdonpedro.com',
    ownerName: 'Pedro Rodriguez',
    email: 'contacto@tallerdonpedro.com',
    phone: '0212-5551234',
    anchorCurrency: 'USD',
    vesRate: '36.50',
    autoRate: false,
    usdtSpread: '2',
    createdAt: '15 de marzo de 2024',
    lastLogin: 'Hoy, 10:45 AM',
  });

  const [methods, setMethods] = useState(paymentMethods);
  const [mechanics, setMechanics] = useState(mockMechanics);
  const [showMechanicModal, setShowMechanicModal] = useState(false);

  // Profile completeness
  const fields = [workshop.name, workshop.legalName, workshop.taxId, workshop.address, workshop.ownerName, workshop.email, workshop.phone, workshop.vesRate];
  const filled = fields.filter(Boolean).length;
  const completeness = Math.round((filled / fields.length) * 100);

  const { isLight, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleMethod = (key: string) => {
    setMethods(methods.map(m => m.key === key ? { ...m, enabled: !m.enabled } : m));
  };

  return (
    <div className="profile-page page-enter">
      {/* ===== HEADER ===== */}
      <div className="profile-header-card">
        <div className="profile-header-left">
          <div className="profile-logo-container" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
            <img src="/logo-tight.png" alt="Logo Taller" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="profile-header-info">
            <h1 className="profile-workshop-name">{workshop.name}</h1>
            <p className="profile-tax-id">RIF: {workshop.taxId}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div className="profile-completeness">
            <div className="completeness-info">
              <span className="completeness-label">Perfil completo</span>
              <span className="completeness-value">{completeness}%</span>
            </div>
            <div className="completeness-bar">
              <div className="completeness-fill" style={{ width: `${completeness}%` }} />
            </div>
          </div>
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
        <Card title="Datos de la Empresa" action={<Button variant="secondary" size="sm">Guardar</Button>}>
          <div className="form-grid">
            <Input label="Nombre de la empresa" value={workshop.name} icon={<Building2 size={16} />}
              onChange={e => setWorkshop({...workshop, name: e.target.value})} />
            <Input label="Razon social" value={workshop.legalName}
              onChange={e => setWorkshop({...workshop, legalName: e.target.value})} />
            <Input label="RIF" value={workshop.taxId} icon={<FileText size={16} />} placeholder="J-00000000-0"
              onChange={e => setWorkshop({...workshop, taxId: e.target.value})} />
            <Input label="Direccion" value={workshop.address} icon={<MapPin size={16} />}
              onChange={e => setWorkshop({...workshop, address: e.target.value})} />
            <Input label="Sitio web" value={workshop.website} icon={<Globe size={16} />} placeholder="www.ejemplo.com"
              onChange={e => setWorkshop({...workshop, website: e.target.value})} />
          </div>
        </Card>

        {/* ===== CARD C: DATOS DEL RESPONSABLE ===== */}
        <Card title="Datos del Responsable" action={<Button variant="secondary" size="sm">Guardar</Button>}>
          <div className="form-grid">
            <Input label="Nombre del responsable" value={workshop.ownerName} icon={<User size={16} />}
              onChange={e => setWorkshop({...workshop, ownerName: e.target.value})} />
            <Input label="Email" value={workshop.email} icon={<Mail size={16} />} type="email"
              onChange={e => setWorkshop({...workshop, email: e.target.value})} />
            <div className="phone-input-group">
              <div className="phone-prefix">
                <span>+58</span>
              </div>
              <Input label="Telefono" value={workshop.phone} icon={<Phone size={16} />}
                onChange={e => setWorkshop({...workshop, phone: e.target.value})} />
            </div>
          </div>
        </Card>

        {/* ===== CARD D: CONFIG REGIONAL Y MONEDAS ===== */}
        <Card title="Configuracion Regional y Monedas" subtitle="Configura las monedas y tasas de cambio de tu taller" className="profile-currency-card">
          <div className="currency-config">
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Moneda ancla</label>
                <select className="input-field" value={workshop.anchorCurrency}
                  onChange={e => setWorkshop({...workshop, anchorCurrency: e.target.value})}>
                  <option value="USD">USD - Dolar estadounidense</option>
                  <option value="VES">VES - Bolivar</option>
                </select>
              </div>

              <div className="rate-input-row">
                <Input label="Tasa VES/USD" value={workshop.vesRate} type="number" step="0.01"
                  icon={<DollarSign size={16} />}
                  suffix={<span className="rate-suffix">Bs/$</span>}
                  onChange={e => setWorkshop({...workshop, vesRate: e.target.value})} />
                <div className="rate-toggle">
                  <label className="toggle-label">
                    <input type="checkbox" className="toggle-input" checked={workshop.autoRate}
                      onChange={e => setWorkshop({...workshop, autoRate: e.target.checked})} />
                    <span className="toggle-track"><span className="toggle-thumb" /></span>
                    <span className="toggle-text">{workshop.autoRate ? 'Automatico' : 'Manual'}</span>
                  </label>
                  {workshop.autoRate && (
                    <button className="rate-refresh-btn">
                      <RefreshCw size={14} /> Actualizar
                    </button>
                  )}
                </div>
              </div>

              <Input label="Spread USDT" value={workshop.usdtSpread} type="number" step="0.1"
                icon={<Percent size={16} />}
                hint="Comision adicional al cobrar en USDT. 0% = igual que USD."
                onChange={e => setWorkshop({...workshop, usdtSpread: e.target.value})} />
            </div>

            <div className="payment-methods-section">
              <h4 className="methods-title">
                <CreditCard size={16} /> Metodos de pago habilitados
              </h4>
              <div className="methods-grid">
                {methods.map(m => (
                  <label key={m.key} className={`method-item ${m.enabled ? 'method-enabled' : ''}`}>
                    <input type="checkbox" checked={m.enabled} onChange={() => toggleMethod(m.key)} />
                    <span className="method-check" />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ===== CARD E: INTEGRACIONES ===== */}
        <Card title="Integraciones">
          <div className="integrations-list">
            <div className="integration-item">
              <div className="integration-icon integration-whatsapp">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div className="integration-info">
                <span className="integration-name">WhatsApp Business</span>
                <span className="integration-desc">Envia recordatorios y notificaciones a tus clientes</span>
              </div>
              <Badge variant="success" dot>Conectado</Badge>
              <Button variant="ghost" size="sm">Configurar</Button>
            </div>

            <div className="integration-item">
              <div className="integration-icon integration-google">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              </div>
              <div className="integration-info">
                <span className="integration-name">Google My Business</span>
                <span className="integration-desc">Gestiona tu presencia en Google Maps</span>
              </div>
              <Badge variant="default">Desconectado</Badge>
              <Button variant="secondary" size="sm">Conectar</Button>
            </div>
          </div>
        </Card>

        {/* ===== CARD F: EQUIPO DE MECANICOS ===== */}
        <Card
          title="Equipo de Mecanicos"
          subtitle={`${mechanics.filter(m => m.isActive).length} mecanicos activos`}
          action={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowMechanicModal(true)}>Agregar</Button>}
          className="profile-mechanics-card"
        >
          <div className="mechanics-table-container">
            <table className="mechanics-table">
              <thead>
                <tr>
                  <th>Mecanico</th>
                  <th>Especialidad</th>
                  <th>Ordenes activas</th>
                  <th>Completadas</th>
                  <th>Tiempo prom.</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mechanics.map(mech => (
                  <tr key={mech.id} className={!mech.isActive ? 'row-inactive' : ''}>
                    <td>
                      <div className="mechanic-cell">
                        <div className="mechanic-avatar">{mech.name.charAt(0)}</div>
                        <div>
                          <span className="mechanic-name">{mech.name}</span>
                          <span className="mechanic-phone">{mech.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="mechanic-specialty">{mech.specialty}</span></td>
                    <td><span className="mechanic-stat">{mech.activeOrders}</span></td>
                    <td><span className="mechanic-stat">{mech.completedOrders}</span></td>
                    <td><span className="mechanic-stat">{mech.avgTime}</span></td>
                    <td>
                      <Badge variant={mech.isActive ? 'success' : 'default'} dot>
                        {mech.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td>
                      <div className="mechanic-actions">
                        <button className="action-btn" title="Editar"><Edit size={14} /></button>
                        <button className="action-btn" title={mech.isActive ? 'Desactivar' : 'Activar'}>
                          {mech.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                <span className="activity-label">Ultimo ingreso</span>
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
                  <span className="activity-label">Modo de visualizacion</span>
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
      </div>

      {/* Modal para agregar mecanico */}
      <Modal
        isOpen={showMechanicModal}
        onClose={() => setShowMechanicModal(false)}
        title="Agregar Mecanico"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowMechanicModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={() => setShowMechanicModal(false)}>Guardar</Button>
          </>
        }
      >
        <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Nombre completo" placeholder="Ej: Carlos Martinez" icon={<User size={16} />} />
          <Input label="Especialidad" placeholder="Ej: Mecanica general" icon={<Wrench size={16} />} />
          <Input label="Telefono" placeholder="0412-5551234" icon={<Phone size={16} />} />

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '4px' }}>
            <label className="input-label" style={{ fontWeight: 700, fontSize: '13px', display: 'block', marginBottom: '8px' }}>
              💼 Esquema de Pago de Nómina
            </label>

            <div className="input-group">
              <label className="input-label">Tipo de Esquema</label>
              <select className="input-field">
                <option value="porcentaje">Opción A — Porcentaje (%) sobre servicios de órdenes</option>
                <option value="fijo">Opción B — Monto Fijo Acordado</option>
                <option value="mixto">Opción C — Mixto (Monto base fijo + % comisión)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <Input label="Porcentaje comisión (%)" type="number" placeholder="Ej: 30" hint="Aplica sobre el valor de los servicios (excluye repuestos)" />
              <Input label="Monto Fijo / Base ($)" type="number" placeholder="Ej: 200" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
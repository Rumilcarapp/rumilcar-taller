import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, Calendar, FileText, Stethoscope,
  ClipboardCheck, Car, Users, Package, ShoppingCart,
  Wallet, CarFront, Truck, CreditCard, HeartHandshake,
  BarChart3, UserCircle, ChevronLeft, ChevronRight, ShieldCheck, LogOut, X, Sparkles
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUserManagementStore, AppModuleKey } from '../../store/useUserManagementStore';
import './Sidebar.css';

interface NavItemConfig {
  path: string;
  icon: any;
  label: string;
  module: AppModuleKey;
}

const navSections: { label: string; items: NavItemConfig[] }[] = [
  {
    label: 'Principal',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Inicio', module: 'dashboard' },
      { path: '/trabajos', icon: Wrench, label: 'Trabajos', module: 'workOrders' },
      { path: '/agenda', icon: Calendar, label: 'Agenda', module: 'agenda' },
      { path: '/presupuestos', icon: FileText, label: 'Presupuestos', module: 'budgets' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { path: '/diagnosticos', icon: Stethoscope, label: 'Diagnósticos', module: 'diagnostics' },
      { path: '/inspecciones', icon: ClipboardCheck, label: 'Inspecciones', module: 'inspections' },
      { path: '/vehiculos', icon: Car, label: 'Vehículos', module: 'vehicles' },
      { path: '/clientes', icon: Users, label: 'Clientes', module: 'clients' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { path: '/inventario', icon: Package, label: 'Inventario', module: 'inventory' },
      { path: '/pos', icon: ShoppingCart, label: 'Punto de Venta', module: 'pos' },
      { path: '/caja', icon: Wallet, label: 'Caja & Finanzas', module: 'cashRegister' },
    ],
  },
  {
    label: 'Avanzado',
    items: [
      { path: '/pre-compra', icon: CarFront, label: 'Pre-Compra', module: 'prePurchase' },
      { path: '/compras', icon: Truck, label: 'Compras', module: 'purchases' },
      { path: '/cobranza', icon: CreditCard, label: 'Cobranza', module: 'collections' },
      { path: '/crm', icon: HeartHandshake, label: 'CRM & WhatsApp', module: 'crm' },
      { path: '/reportes', icon: BarChart3, label: 'Reportes', module: 'reports' },
      { path: '/usuarios', icon: ShieldCheck, label: 'Usuarios & Permisos', module: 'users' },
      { path: '/membresia', icon: Sparkles, label: 'Mi Membresía', module: 'dashboard' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, mobileOpen = false, onCloseMobile }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { hasPermission } = useUserManagementStore();

  const userRole = user?.role || 'RECEPTIONIST';

  const handleLogout = () => {
    onCloseMobile?.();
    logout();
    navigate('/login', { replace: true });
  };

  const handleItemClick = () => {
    if (mobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  const isFullView = !collapsed || mobileOpen;

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-open' : ''}`}>
      {/* Logo & Header */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src="/logo-tight.png" alt="Rumilcarapp" className="sidebar-brand-img" />
          {isFullView && <span className="logo-text">Rumilcar<span className="logo-accent">app</span></span>}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button className="sidebar-toggle" onClick={onToggle} aria-label="Colapsar menú lateral" title={collapsed ? "Expandir menú" : "Colapsar menú"}>
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          
          <button className="sidebar-mobile-close" onClick={onCloseMobile} aria-label="Cerrar menú móvil" title="Cerrar menú">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation filtered by user role permissions */}
      <nav className="sidebar-nav">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) =>
            hasPermission(userRole, item.module, 'view')
          );

          if (visibleItems.length === 0) return null;

          return (
            <div className="nav-section" key={section.label}>
              {isFullView && <span className="nav-section-label">{section.label}</span>}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={handleItemClick}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : ''}`
                  }
                  title={!isFullView ? item.label : undefined}
                >
                  <item.icon size={20} className="nav-item-icon" />
                  {isFullView && <span className="nav-item-label">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}

        {/* SuperAdmin SaaS Section */}
        {userRole === 'SUPERADMIN' && (
          <div className="nav-section" key="SUPERADMIN">
            {isFullView && (
              <span className="nav-section-label" style={{ color: '#e11d48', fontWeight: 800 }}>
                👑 SaaS Admin
              </span>
            )}
            <NavLink
              to="/admin/membresias"
              onClick={handleItemClick}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              title={!isFullView ? 'Control de Membresías' : undefined}
              style={{
                background: 'rgba(225, 29, 72, 0.08)',
                border: '1px solid rgba(225, 29, 72, 0.2)',
                borderRadius: '8px',
                marginTop: '4px',
              }}
            >
              <ShieldCheck size={20} className="nav-item-icon" color="#e11d48" />
              {isFullView && (
                <span className="nav-item-label" style={{ fontWeight: 800, color: '#e11d48' }}>
                  Control de Membresías
                </span>
              )}
            </NavLink>
          </div>
        )}
      </nav>

      {/* Profile & User Role badge in Footer */}
      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--color-border)', padding: (!isFullView) ? '8px' : '12px' }}>
        {isFullView && user && (
          <div style={{ marginBottom: '8px', padding: '0 8px' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
              Rol: {user.role}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '4px' }}>
          <NavLink
            to="/perfil"
            onClick={handleItemClick}
            className={({ isActive }) =>
              `nav-item nav-item-profile ${isActive ? 'nav-item-active' : ''}`
            }
            style={{ flex: 1 }}
            title={!isFullView ? 'Mi Perfil' : undefined}
          >
            <UserCircle size={18} className="nav-item-icon" />
            {isFullView && <span className="nav-item-label">Mi Perfil</span>}
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className="nav-item"
            style={{ width: (!isFullView) ? '100%' : 'auto', padding: '8px 12px', justifyContent: 'center', color: '#ef4444', cursor: 'pointer', border: 'none', background: 'transparent' }}
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

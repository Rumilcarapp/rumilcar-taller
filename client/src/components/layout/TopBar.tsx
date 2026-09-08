import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Sun, Moon, ShieldAlert, AlertTriangle, ArrowRight, X, Rocket, UserCircle, LogOut } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useAntiInflationStore } from '../../store/useAntiInflationStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useAuthStore } from '../../stores/authStore';
import './TopBar.css';

interface TopBarProps {
  title?: string;
  onMenuClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, onMenuClick }) => {
  const navigate = useNavigate();
  const { isLight, toggleTheme } = useThemeStore();
  const { saldoVES, obtenerCalculoPerdida, alertaConfig } = useAntiInflationStore();
  const { openWelcomeModal } = useOnboardingStore();
  const { user, logout } = useAuthStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const calc = obtenerCalculoPerdida();
  const hasInflationAlert = alertaConfig.activa && saldoVES.monto_ves > 0 && (
    calc.perdidaPorcentaje >= alertaConfig.umbral_porcentaje ||
    calc.diasTranscurridos >= alertaConfig.umbral_dias
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate('/login', { replace: true });
  };

  const handleGoToProtection = () => {
    setShowNotifications(false);
    navigate('/caja?tab=proteccion');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Menu">
          <Menu size={20} />
        </button>
        {title && <h1 className="topbar-title">{title}</h1>}
      </div>
      <div className="topbar-right">
        <div className="topbar-search">
          <Search size={16} className="topbar-search-icon" />
          <input type="text" placeholder="Buscar..." className="topbar-search-input" />
        </div>
        
        {user?.role !== 'SUPERADMIN' && (
          <button
            className="topbar-icon-btn"
            aria-label="Primeros Pasos"
            onClick={openWelcomeModal}
            title="Guía de Primeros Pasos & Limpieza de Taller"
          >
            <Rocket size={19} color="#ef4444" />
          </button>
        )}

        <button className="topbar-icon-btn" aria-label="Cambiar tema" onClick={toggleTheme} title="Cambiar tema claro/oscuro">
          {isLight ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        
        {/* Notificaciones Campanita */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button 
            className="topbar-icon-btn" 
            aria-label="Notificaciones" 
            onClick={() => setShowNotifications(!showNotifications)}
            title="Centro de notificaciones"
          >
            <Bell size={20} />
            {hasInflationAlert && <span className="notification-dot" />}
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: '0',
                width: '360px',
                background: 'var(--color-bg-surface, #1e1e1e)',
                border: '1px solid var(--color-border, #3f3f46)',
                borderRadius: '12px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
                zIndex: 1000,
                padding: '16px',
                animation: 'fadeIn 0.2s ease-in-out'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--color-border, #3f3f46)', paddingBottom: '8px' }}>
                <strong style={{ fontSize: '14px' }}>Centro de Notificaciones</strong>
                <button 
                  onClick={() => setShowNotifications(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #71717a)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              {hasInflationAlert ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <ShieldAlert size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>
                        Alerta de Devaluación VES
                      </div>
                      <div style={{ color: 'var(--color-text, #fff)', lineHeight: '1.4' }}>
                        Tu saldo en bolívares (<strong>Bs. {saldoVES.monto_ves.toLocaleString('es-VE')}</strong>) ha perdido <strong>${calc.perdidaUSD.toFixed(2)} USD ({calc.perdidaPorcentaje}%)</strong> de valor en los últimos {calc.diasTranscurridos} días.
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <button
                          onClick={handleGoToProtection}
                          style={{
                            background: '#D32F2F',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          Convertir ahora a USDT <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--color-text-muted, #71717a)', fontSize: '13px' }}>
                  No tienes notificaciones urgentes pendientes.
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu Avatar */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <div
            className="topbar-avatar"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{ cursor: 'pointer' }}
            title={user?.name ? `${user.name} (${user.role})` : 'Mi Perfil'}
          >
            <div className="avatar-circle">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
            </div>
          </div>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: '0',
                width: '220px',
                background: 'var(--color-bg-surface, #1e1e1e)',
                border: '1px solid var(--color-border, #3f3f46)',
                borderRadius: '12px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
                zIndex: 1000,
                padding: '10px',
                animation: 'fadeIn 0.15s ease-in-out',
              }}
            >
              <div style={{ padding: '6px 8px 10px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  {user?.name || 'Usuario Taller'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>
                  {user?.email || 'admin@taller.com'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 700, marginTop: '4px' }}>
                  ROL: {user?.role || 'OWNER'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/perfil');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <UserCircle size={16} /> Mi Perfil
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <LogOut size={16} /> Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
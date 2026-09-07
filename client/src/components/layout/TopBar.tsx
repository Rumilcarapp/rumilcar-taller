import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Sun, Moon, ShieldAlert, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useAntiInflationStore } from '../../store/useAntiInflationStore';
import './TopBar.css';

interface TopBarProps {
  title?: string;
  onMenuClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, onMenuClick }) => {
  const navigate = useNavigate();
  const { isLight, toggleTheme } = useThemeStore();
  const { saldoVES, obtenerCalculoPerdida, alertaConfig } = useAntiInflationStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        <div className="topbar-avatar" onClick={() => navigate('/perfil')}>
          <div className="avatar-circle">R</div>
        </div>
      </div>
    </header>
  );
};
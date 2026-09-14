import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Eye, ArrowLeft, ShieldAlert } from 'lucide-react';
import './ImpersonationBanner.css';

export const ImpersonationBanner: React.FC = () => {
  const navigate = useNavigate();
  const { user, impersonatedFrom, stopImpersonation } = useAuthStore();

  if (!impersonatedFrom || !user) return null;

  const handleReturn = () => {
    stopImpersonation();
    navigate('/admin/talleres', { replace: true });
  };

  return (
    <div className="impersonation-banner">
      <div className="impersonation-content">
        <div className="impersonation-icon-box">
          <Eye size={18} className="animate-pulse" />
        </div>
        <div className="impersonation-text">
          <strong>MODO SOPORTE ACTIVO:</strong> Visualizando sesión de{' '}
          <span className="impersonation-target">{user.workshopName || 'Taller Cliente'}</span>{' '}
          (Rol: {user.role})
        </div>
      </div>

      <button className="impersonation-return-btn" onClick={handleReturn}>
        <ArrowLeft size={16} />
        <span>Salir y Volver a SuperAdmin</span>
      </button>
    </div>
  );
};

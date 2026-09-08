import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useAuthStore } from '../../stores/authStore';
import { Sparkles, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';
import './SubscriptionBanner.css';

export const SubscriptionBanner: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { subscription, fetchSubscription } = useSubscriptionStore();

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      fetchSubscription(user.workshopId);
    }
  }, [user]);

  // Do not show banner for SuperAdmin
  if (!user || user.role === 'SUPERADMIN') return null;

  if (!subscription) return null;

  const { isTrial, daysRemaining, isExpired, status, plan } = subscription;

  // Active paid plan with more than 5 days remaining: hide banner to keep interface clean
  if (status === 'ACTIVE' && daysRemaining > 5) {
    return null;
  }

  // 1. Expired state
  if (isExpired || status === 'SUSPENDED' || status === 'PAST_DUE') {
    return (
      <div className="subscription-banner banner-danger">
        <div className="subscription-banner-content">
          <ShieldAlert className="banner-icon" size={20} />
          <div className="banner-text">
            <strong>Membresía Vencida:</strong> Tu taller se encuentra en periodo de gracia. Reporta tu pago para mantener todas las funciones activas.
          </div>
        </div>
        <button
          className="banner-action-btn btn-danger"
          onClick={() => navigate('/membresia')}
        >
          <span>Renovar Membresía</span>
          <ArrowRight size={15} />
        </button>
      </div>
    );
  }

  // 2. Urgent renewal (3 days or less remaining)
  if (daysRemaining <= 3) {
    return (
      <div className="subscription-banner banner-warning">
        <div className="subscription-banner-content">
          <AlertTriangle className="banner-icon" size={20} />
          <div className="banner-text">
            <strong>Atención:</strong> {isTrial ? 'Tu prueba de 15 días gratis' : 'Tu membresía'} vence en{' '}
            <span className="banner-days-pill">{daysRemaining === 1 ? '1 día' : `${daysRemaining} días`}</span>. Evita interrupciones en la atención de tu taller.
          </div>
        </div>
        <button
          className="banner-action-btn btn-warning"
          onClick={() => navigate('/membresia')}
        >
          <span>Elegir Plan</span>
          <ArrowRight size={15} />
        </button>
      </div>
    );
  }

  // 3. Normal Trial active (more than 3 days)
  if (isTrial) {
    return (
      <div className="subscription-banner banner-trial">
        <div className="subscription-banner-content">
          <Sparkles className="banner-icon" size={18} />
          <div className="banner-text">
            <strong>Prueba Gratuita Activa:</strong> Te quedan{' '}
            <span className="banner-days-highlight">{daysRemaining} días</span> de acceso ilimitado a todas las herramientas de Rumilcarapp.
          </div>
        </div>
        <button
          className="banner-action-btn btn-trial"
          onClick={() => navigate('/membresia')}
        >
          <span>Ver Planes</span>
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return null;
};

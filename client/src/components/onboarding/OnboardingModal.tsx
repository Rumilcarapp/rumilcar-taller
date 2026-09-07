import React from 'react';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui';
import { Sparkles, Trash2, Eye, ShieldCheck, ArrowRight, X } from 'lucide-react';
import './OnboardingModal.css';

export const OnboardingModal: React.FC = () => {
  const { showWelcomeModal, dismissWelcomeModal, clearAllMockData } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  if (!showWelcomeModal) return null;

  const workshopName = user?.workshopName || 'tu Taller Mecánico';
  const userName = user?.name ? user.name.split(' ')[0] : 'colega';

  const handleStartClean = () => {
    clearAllMockData();
  };

  const handleExploreDemo = () => {
    dismissWelcomeModal();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card animate-scale-in">
        <button
          className="onboarding-close-btn"
          onClick={dismissWelcomeModal}
          aria-label="Cerrar"
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div className="onboarding-header">
          <div className="onboarding-header-icon">
            <img
              src="/logo-tight.png"
              alt="Rumilcarapp"
              style={{
                width: '56px',
                height: '56px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(220, 38, 38, 0.4))',
              }}
            />
          </div>
          <div className="onboarding-badge">
            <Sparkles size={13} /> Bienvenido a Rumilcarapp
          </div>
          <h2 className="onboarding-title">¡Bienvenido a Rumilcarapp, {userName}!</h2>
          <p className="onboarding-subtitle">
            Vamos a poner en marcha <strong>{workshopName}</strong>. Elige cómo te gustaría
            comenzar a usar la plataforma hoy:
          </p>
        </div>

        <div className="onboarding-options">
          {/* Option 1: Clean Slate (Recommended) */}
          <div className="onboarding-option-card primary" onClick={handleStartClean}>
            <div>
              <div className="onboarding-option-icon clean">
                <Trash2 size={20} />
              </div>
              <h3 className="onboarding-option-title">Empezar en Blanco</h3>
              <p className="onboarding-option-desc">
                Limpiaremos todas las órdenes, clientes y repuestos de prueba para que empieces desde cero con tus datos reales.
              </p>
            </div>
            <Button variant="primary" fullWidth size="md">
              Comenzar en Blanco <ArrowRight size={15} style={{ marginLeft: 4 }} />
            </Button>
          </div>

          {/* Option 2: Explore with demo data */}
          <div className="onboarding-option-card" onClick={handleExploreDemo}>
            <div>
              <div className="onboarding-option-icon demo">
                <Eye size={20} />
              </div>
              <h3 className="onboarding-option-title">Explorar con Ejemplos</h3>
              <p className="onboarding-option-desc">
                Conserva las órdenes ficticias para practicar, revisar los reportes y ver cómo se imprimen los comprobantes.
              </p>
            </div>
            <Button variant="outline" fullWidth size="md">
              Mantener Ejemplos
            </Button>
          </div>
        </div>

        <div className="onboarding-footer">
          <p className="onboarding-footer-note">
            💡 <em>Nota: Podrás alternar o limpiar los datos en cualquier momento desde el menú de Primeros Pasos.</em>
          </p>
        </div>
      </div>
    </div>
  );
};

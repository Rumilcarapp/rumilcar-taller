import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useAuthStore } from '../../stores/authStore';
import {
  Rocket,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  Database,
  Building,
  CreditCard,
  UserPlus,
  Car,
  FilePlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import './OnboardingChecklist.css';

interface StepDef {
  id: string;
  title: string;
  desc: string;
  route: string;
  btnLabel: string;
  icon: React.ReactNode;
}

const STEPS: StepDef[] = [
  {
    id: 'profile',
    title: '1. Datos de tu Taller',
    desc: 'Registra RIF, dirección física, teléfono y carga tu logotipo.',
    route: '/perfil',
    btnLabel: 'Configurar Taller',
    icon: <Building size={16} />,
  },
  {
    id: 'payments',
    title: '2. Métodos de Pago y Tasa',
    desc: 'Configura Pago Móvil, Zelle, cuentas bancarias y tasa oficial.',
    route: '/caja',
    btnLabel: 'Configurar Pagos',
    icon: <CreditCard size={16} />,
  },
  {
    id: 'first_client',
    title: '3. Registrar tu Primer Cliente',
    desc: 'Añade un cliente real con su cédula/RIF y número de WhatsApp.',
    route: '/clientes',
    btnLabel: 'Añadir Cliente',
    icon: <UserPlus size={16} />,
  },
  {
    id: 'first_vehicle',
    title: '4. Registrar tu Primer Vehículo',
    desc: 'Vincula el auto (marca, modelo, año y placa) al cliente.',
    route: '/vehiculos',
    btnLabel: 'Añadir Vehículo',
    icon: <Car size={16} />,
  },
  {
    id: 'first_order',
    title: '5. Crear tu Primera Orden de Trabajo',
    desc: 'Genera la recepción mecánica, diagnóstico y presupuesto.',
    route: '/trabajos/nueva',
    btnLabel: 'Crear Orden',
    icon: <FilePlus size={16} />,
  },
];

export const OnboardingChecklist: React.FC = () => {
  const navigate = useNavigate();
  const {
    isChecklistDismissed,
    toggleChecklist,
    completedStepIds,
    completeStep,
    isCleanSlate,
    clearAllMockData,
    loadMockData,
  } = useOnboardingStore();

  const user = useAuthStore((s) => s.user);
  const [collapsed, setCollapsed] = useState(false);

  if (isChecklistDismissed) return null;

  const totalSteps = STEPS.length;
  const completedCount = completedStepIds.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  const handleStepClick = (step: StepDef) => {
    completeStep(step.id);
    navigate(step.route);
  };

  const handleToggleStepCheckbox = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    completeStep(stepId);
  };

  return (
    <div className="onboarding-checklist animate-fade-in">
      {/* Header */}
      <div className="onboarding-checklist-header">
        <div className="onboarding-checklist-title-box">
          <div className="onboarding-checklist-icon">
            <Rocket size={20} />
          </div>
          <div>
            <div className="onboarding-checklist-title">
              <span>Primeros Pasos para tu Taller</span>
              {isCleanSlate ? (
                <span className="onboarding-banner-clean-tag">✨ Modo Real (Limpio)</span>
              ) : (
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                  (Modo Prueba Activo)
                </span>
              )}
            </div>
            <div className="onboarding-checklist-subtitle">
              {completedCount} de {totalSteps} tareas completadas ({progressPercent}%) • Sigue estos
              pasos para empezar a operar.
            </div>
          </div>
        </div>

        <div className="onboarding-checklist-actions">
          {/* Quick toggle clean slate */}
          {!isCleanSlate ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Deseas vaciar todas las órdenes y clientes de prueba para empezar tu taller en blanco?')) {
                  clearAllMockData();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--color-primary)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Borra todos los datos ficticios"
            >
              <Trash2 size={13} /> Limpiar datos de prueba
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Deseas cargar algunos ejemplos de prueba para practicar?')) {
                  loadMockData();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: '#3b82f6',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Carga datos ficticios para practicar"
            >
              <Database size={13} /> Cargar ejemplos
            </button>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Colapsar"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>

          <button
            type="button"
            onClick={toggleChecklist}
            aria-label="Cerrar guía"
            title="Ocultar guía de primeros pasos"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="onboarding-progress-bar-container">
        <div className="onboarding-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Steps List */}
      {!collapsed && (
        <div className="onboarding-steps-grid">
          {STEPS.map((step) => {
            const isDone = completedStepIds.includes(step.id);
            return (
              <div
                key={step.id}
                className={`onboarding-step-item ${isDone ? 'completed' : ''}`}
                onClick={() => handleStepClick(step)}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className={`onboarding-step-checkbox ${isDone ? 'checked' : ''}`}
                  onClick={(e) => handleToggleStepCheckbox(step.id, e)}
                  title={isDone ? 'Marcado como hecho' : 'Marcar como hecho'}
                >
                  {isDone && <Check size={14} />}
                </div>

                <div className="onboarding-step-info">
                  <div className="onboarding-step-name" style={{ textDecoration: isDone ? 'line-through' : 'none' }}>
                    {step.title}
                  </div>
                  <div className="onboarding-step-desc">{step.desc}</div>
                  <button type="button" className="onboarding-step-btn">
                    {step.btnLabel} <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

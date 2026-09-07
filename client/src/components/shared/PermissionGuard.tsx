import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUserManagementStore, AppModuleKey } from '../../store/useUserManagementStore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button, Card } from '../ui';
import { useNavigate } from 'react-router-dom';

interface PermissionGuardProps {
  module: AppModuleKey;
  action?: 'view' | 'create' | 'edit' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  action = 'view',
  children,
  fallback,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hasPermission } = useUserManagementStore();

  const userRole = user?.role || 'RECEPTIONIST';
  const isAllowed = hasPermission(userRole, module, action);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="page-enter" style={{ padding: '32px 16px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
      <Card>
        <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <ShieldAlert size={48} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Acceso Restringido</h2>
          
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, maxWidth: '420px', lineHeight: '1.5' }}>
            Tu usuario actual (Rol: <strong>{userRole}</strong>) no cuenta con permisos suficientes para acceder al módulo <strong>{module}</strong> ({action}).
          </p>

          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
            Si requieres acceso a esta función, por favor contacta al administrador del taller para que habilite este permiso en tu rol.
          </p>

          <Button
            variant="primary"
            onClick={() => navigate('/')}
            icon={<ArrowLeft size={16} />}
            style={{ marginTop: '8px' }}
          >
            Volver al Inicio
          </Button>
        </div>
      </Card>
    </div>
  );
};

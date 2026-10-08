import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { useUserManagementStore, ManagedUser } from '../../../store/useUserManagementStore';
import { useAuthStore } from '../../../stores/authStore';
import { capitalizeWords } from '../../../lib/stringUtils';
import { apiClient } from '../../../services/api';
import { Eye, EyeOff, Key, Sparkles, Copy, Check } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUser?: ManagedUser | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  initialUser,
}) => {
  const { roles, addUser, updateUser, deleteUser, addAuditLog } = useUserManagementStore();

  const [name, setName] = useState(initialUser?.name ? capitalizeWords(initialUser.name) : '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [phone, setPhone] = useState(initialUser?.phone || '');
  const [role, setRole] = useState(initialUser?.role || 'RECEPTIONIST');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(initialUser !== undefined ? initialUser?.isActive ?? true : true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Sync state when initialUser changes
  React.useEffect(() => {
    if (initialUser) {
      setName(capitalizeWords(initialUser.name));
      setEmail(initialUser.email || '');
      setPhone(initialUser.phone || '');
      setRole(initialUser.role || 'RECEPTIONIST');
      setIsActive(initialUser.isActive ?? true);
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setRole('RECEPTIONIST');
      setIsActive(true);
      setPassword('');
    }
    setCopiedCredentials(false);
  }, [initialUser, isOpen]);

  const handleGeneratePassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const generated = `Taller.${randomDigits}`;
    setPassword(generated);
    setShowPassword(true);
  };

  const handleCopyCredentials = () => {
    if (!email.trim() || !password.trim()) {
      alert('Por favor indica un correo y escribe o genera una contraseña primero.');
      return;
    }
    const workshopName = useAuthStore.getState().user?.workshopName || 'Taller Rumilcar';
    const message = `🛠️ *Bienvenido a Rumilcarapp (${workshopName})*\n\nTus credenciales para ingresar al sistema son:\n👤 *Usuario:* ${email.trim()}\n🔑 *Contraseña:* ${password.trim()}\n🌐 *Enlace:* ${window.location.origin}/login\n\n_Por favor guarda tu contraseña en un lugar seguro._`;
    navigator.clipboard.writeText(message);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      return alert('Por favor completa el nombre y correo electrónico.');
    }

    if (!initialUser && (!password || password.trim().length < 6)) {
      return alert('Por favor ingresa una contraseña de al menos 6 caracteres para esta subcuenta.');
    }

    if (initialUser && password && password.trim().length < 6) {
      return alert('La nueva contraseña debe tener al menos 6 caracteres.');
    }

    const currentUser = useAuthStore.getState().user;
    const cleanName = capitalizeWords(name.trim());
    const cleanEmail = email.trim().toLowerCase();

    setIsSubmitting(true);

    try {
      if (initialUser) {
        // Update user in PostgreSQL database via API
        try {
          await apiClient(`/workshop/users/${initialUser.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              name: cleanName,
              role,
              isActive,
              password: password.trim() ? password.trim() : undefined,
            }),
          });
        } catch (apiErr: any) {
          console.warn('API update notice:', apiErr);
        }

        updateUser(initialUser.id, {
          name: cleanName,
          email: cleanEmail,
          phone,
          role,
          isActive,
        });

        addAuditLog({
          workshopId: currentUser?.workshopId,
          userId: currentUser?.id || 'admin',
          userName: currentUser?.name || 'Administrador',
          userRole: currentUser?.role || 'OWNER',
          action: password.trim() ? 'Actualización y Cambio de Clave' : 'Actualización de Gestor',
          module: 'users',
          details: `Se actualizaron los datos del gestor/empleado ${cleanName} (${cleanEmail})${password.trim() ? ' y se renovó su contraseña' : ''}`,
        });
      } else {
        // Create user in PostgreSQL database via API with passwordHash
        let createdId = 'usr-' + Date.now();
        try {
          const res = await apiClient('/workshop/users', {
            method: 'POST',
            body: JSON.stringify({
              name: cleanName,
              email: cleanEmail,
              password: password.trim(),
              role,
              isActive,
            }),
          });
          if (res?.id) {
            createdId = res.id;
          }
        } catch (apiErr: any) {
          alert(`Error al registrar en la nube: ${apiErr.message || 'Verifica la conexión'}`);
          setIsSubmitting(false);
          return;
        }

        addUser({
          id: createdId,
          workshopId: currentUser?.workshopId,
          name: cleanName,
          email: cleanEmail,
          phone,
          role,
          isActive,
        });

        addAuditLog({
          workshopId: currentUser?.workshopId,
          userId: currentUser?.id || 'admin',
          userName: currentUser?.name || 'Administrador',
          userRole: currentUser?.role || 'OWNER',
          action: 'Creación de Subcuenta de Gestor',
          module: 'users',
          details: `Se creó la subcuenta para ${cleanName} (${cleanEmail}) con rol ${role}`,
        });
      }

      onClose();
    } catch (err: any) {
      alert(err.message || 'Error al guardar el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialUser ? 'Editar Gestor / Subcuenta' : 'Registrar Nueva Subcuenta del Taller'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Nombre Completo</label>
          <input
            type="text"
            required
            placeholder="Ej: Carlos Silva"
            value={name}
            onChange={(e) => setName(capitalizeWords(e.target.value))}
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px', textTransform: 'capitalize', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Correo Electrónico (Login)</label>
            <input
              type="email"
              required
              disabled={!!initialUser}
              placeholder="carlos@taller.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: initialUser ? 'var(--color-bg-tertiary)' : 'var(--color-bg-surface)', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Teléfono / WhatsApp</label>
            <input
              type="text"
              placeholder="0414-1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Rol Asignado (Permisos de Acceso)</label>
          <select
            value={role}
            disabled={initialUser?.role === 'OWNER'}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px', boxSizing: 'border-box' }}
          >
            {roles.filter((r) => r.id !== 'SUPERADMIN').map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sección Contraseña de Acceso */}
        <div style={{ background: 'var(--color-bg-tertiary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={15} color="var(--color-primary)" /> {initialUser ? 'Cambiar Contraseña (Opcional)' : 'Contraseña de Acceso'}
            </label>
            <button
              type="button"
              onClick={handleGeneratePassword}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-primary)',
                background: 'var(--color-primary-subtle)',
                border: '1px solid var(--color-primary-light)',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={12} /> Generar Clave Automática
            </button>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              required={!initialUser}
              placeholder={initialUser ? 'Dejar en blanco para mantener la clave actual' : 'Mínimo 6 caracteres'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 38px 8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-surface)',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {password && (
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCopyCredentials}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: copiedCredentials ? '#10b981' : 'var(--color-text-primary)',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  cursor: 'pointer'
                }}
              >
                {copiedCredentials ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {copiedCredentials ? '¡Copiado para WhatsApp!' : 'Copiar datos para WhatsApp'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <input
            type="checkbox"
            id="isActiveUser"
            disabled={initialUser?.role === 'OWNER'}
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="isActiveUser" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Subcuenta Activa (Permite iniciar sesión en el sistema)
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
          {initialUser && initialUser.role !== 'OWNER' ? (
            <Button
              variant="danger"
              size="sm"
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la cuenta de ${initialUser.name}?`)) {
                  try {
                    await apiClient(`/workshop/users/${initialUser.id}`, { method: 'DELETE' });
                  } catch (e) {
                    console.warn(e);
                  }
                  const currentUser = useAuthStore.getState().user;
                  deleteUser(initialUser.id);
                  addAuditLog({
                    workshopId: currentUser?.workshopId,
                    userId: currentUser?.id || 'admin',
                    userName: currentUser?.name || 'Administrador',
                    userRole: currentUser?.role || 'OWNER',
                    action: 'Eliminación de Gestor',
                    module: 'users',
                    details: `Se eliminó la cuenta del gestor/empleado: ${initialUser.name} (${initialUser.email})`,
                  });
                  onClose();
                }
              }}
            >
              Eliminar Personal
            </Button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : initialUser ? 'Guardar Cambios' : 'Crear Subcuenta'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

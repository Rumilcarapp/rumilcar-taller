import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { useUserManagementStore, ManagedUser } from '../../../store/useUserManagementStore';

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
  const { roles, addUser, updateUser, addAuditLog } = useUserManagementStore();

  const [name, setName] = useState(initialUser?.name || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [phone, setPhone] = useState(initialUser?.phone || '');
  const [password, setPassword] = useState(initialUser?.password || '123456');
  const [role, setRole] = useState(initialUser?.role || 'RECEPTIONIST');
  const [isActive, setIsActive] = useState(initialUser !== undefined ? initialUser?.isActive ?? true : true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      return alert('Por favor completa el nombre y correo electrónico.');
    }

    if (initialUser) {
      updateUser(initialUser.id, {
        name,
        email,
        phone,
        password,
        role,
        isActive,
      });

      addAuditLog({
        userId: 'admin',
        userName: 'Administrador',
        userRole: 'ADMIN',
        action: 'Actualización de Usuario',
        module: 'users',
        details: `Se actualizaron los datos del usuario ${name} (${email})`,
      });
    } else {
      addUser({
        name,
        email,
        phone,
        password,
        role,
        isActive,
      });

      addAuditLog({
        userId: 'admin',
        userName: 'Administrador',
        userRole: 'ADMIN',
        action: 'Creación de Usuario',
        module: 'users',
        details: `Se registró el nuevo usuario ${name} (${email}) con rol ${role}`,
      });
    }

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialUser ? 'Editar Gestor / Usuario' : 'Registrar Nuevo Gestor / Usuario'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Nombre Completo</label>
          <input
            type="text"
            required
            placeholder="Ej: Carlos Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Correo Electrónico (Login)</label>
            <input
              type="email"
              required
              placeholder="ejemplo@taller.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Teléfono / Celular</label>
            <input
              type="text"
              placeholder="0414-1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Rol Asignado</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Contraseña de Acceso</label>
            <input
              type="text"
              required
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <input
            type="checkbox"
            id="isActiveUser"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="isActiveUser" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Usuario Activo (Permite iniciar sesión en el sistema)
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            {initialUser ? 'Guardar Cambios' : 'Registrar Gestor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

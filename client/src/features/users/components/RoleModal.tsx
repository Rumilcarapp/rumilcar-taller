import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { useUserManagementStore, AppModuleKey, ModulePermissions } from '../../../store/useUserManagementStore';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_PERMISSIONS: Record<AppModuleKey, ModulePermissions> = {
  dashboard: { view: true, create: false, edit: false, delete: false },
  workOrders: { view: false, create: false, edit: false, delete: false },
  agenda: { view: false, create: false, edit: false, delete: false },
  budgets: { view: false, create: false, edit: false, delete: false },
  diagnostics: { view: false, create: false, edit: false, delete: false },
  inspections: { view: false, create: false, edit: false, delete: false },
  vehicles: { view: false, create: false, edit: false, delete: false },
  clients: { view: false, create: false, edit: false, delete: false },
  inventory: { view: false, create: false, edit: false, delete: false },
  pos: { view: false, create: false, edit: false, delete: false },
  cashRegister: { view: false, create: false, edit: false, delete: false },
  prePurchase: { view: false, create: false, edit: false, delete: false },
  purchases: { view: false, create: false, edit: false, delete: false },
  collections: { view: false, create: false, edit: false, delete: false },
  crm: { view: false, create: false, edit: false, delete: false },
  reports: { view: false, create: false, edit: false, delete: false },
  users: { view: false, create: false, edit: false, delete: false },
};

export const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose }) => {
  const { addCustomRole, addAuditLog } = useUserManagementStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Por favor ingresa un nombre para el rol.');

    const roleId = 'ROLE_' + name.toUpperCase().replace(/\s+/g, '_');

    addCustomRole({
      id: roleId,
      name,
      description,
      color,
      isSystem: false,
      permissions: EMPTY_PERMISSIONS,
    });

    addAuditLog({
      userId: 'admin',
      userName: 'Administrador',
      userRole: 'ADMIN',
      action: 'Creación de Rol',
      module: 'users',
      details: `Se creó el rol personalizado: ${name}`,
    });

    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Nuevo Rol Personalizado">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Nombre del Rol</label>
          <input
            type="text"
            required
            placeholder="Ej: Supervisor de Patio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Descripción de Funciones</label>
          <input
            type="text"
            placeholder="Ej: Responsable de asignar mecánicos y revisar vehículos listos"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Color Identificador</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Color del distintivo que aparecerá en los perfiles
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            Crear Rol y Configurar Permisos
          </Button>
        </div>
      </form>
    </Modal>
  );
};

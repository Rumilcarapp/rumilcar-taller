import React, { useState } from 'react';
import { Button, Card } from '../../components/ui';
import { 
  useUserManagementStore, 
  ManagedUser, 
  AppRoleKey, 
  AppModuleKey 
} from '../../store/useUserManagementStore';
import { UserModal } from './components/UserModal';
import { RoleModal } from './components/RoleModal';
import { 
  Users, 
  ShieldCheck, 
  Key, 
  Plus, 
  Check, 
  X, 
  Clock, 
  UserPlus, 
  Lock, 
  Trash2, 
  Edit, 
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const MODULE_LABELS: { key: AppModuleKey; label: string; icon: string; category: string }[] = [
  { key: 'dashboard', label: 'Inicio / Panel de Control', icon: '📊', category: 'General' },
  { key: 'workOrders', label: 'Órdenes de Trabajo', icon: '🔧', category: 'Operaciones' },
  { key: 'agenda', label: 'Agenda & Citas', icon: '📅', category: 'Operaciones' },
  { key: 'budgets', label: 'Presupuestos & Cotizaciones', icon: '📋', category: 'Operaciones' },
  { key: 'diagnostics', label: 'Diagnósticos Computarizados', icon: '🩺', category: 'Operaciones' },
  { key: 'inspecciones' as any, label: 'Inspecciones Visuales', icon: '🔍', category: 'Operaciones' },
  { key: 'vehicles', label: 'Vehículos Registrados', icon: '🚗', category: 'Operaciones' },
  { key: 'clients', label: 'Clientes & Flotas', icon: '👥', category: 'Operaciones' },
  { key: 'inventory', label: 'Inventario & Repuestos', icon: '📦', category: 'Finanzas & Stock' },
  { key: 'pos', label: 'Punto de Venta (POS)', icon: '🛒', category: 'Finanzas & Stock' },
  { key: 'cashRegister', label: 'Caja & Finanzas', icon: '💵', category: 'Finanzas & Stock' },
  { key: 'prePurchase', label: 'Revisión Pre-Compra', icon: '🚘', category: 'Avanzado' },
  { key: 'purchases', label: 'Compras a Proveedores', icon: '🚚', category: 'Avanzado' },
  { key: 'collections', label: 'Cobranza & Cuentas por Cobrar', icon: '💳', category: 'Avanzado' },
  { key: 'crm', label: 'CRM & Campañas de WhatsApp', icon: '📲', category: 'Avanzado' },
  { key: 'reports', label: 'Reportes & Estadísticas', icon: '📈', category: 'Avanzado' },
  { key: 'users', label: 'Gestión de Usuarios & Roles', icon: '🛡️', category: 'Administración' },
];

export const UsersPage: React.FC = () => {
  const { 
    users, 
    roles, 
    auditLogs, 
    toggleUserStatus, 
    deleteUser, 
    updateRolePermissions,
    deleteCustomRole 
  } = useUserManagementStore();

  const [activeTab, setActiveTab] = useState<'usuarios' | 'permisos' | 'auditoria'>('usuarios');
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<AppRoleKey>('RECEPTIONIST');

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const activeUsersCount = users.filter((u) => u.isActive).length;
  const currentRoleDef = roles.find((r) => r.id === selectedRoleForPermissions) || roles[0];

  const handleTogglePerm = (module: AppModuleKey, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (selectedRoleForPermissions === 'OWNER') {
      return alert('El rol de Dueño / Super Administrador siempre cuenta con todos los permisos.');
    }

    const currentModulePerms = currentRoleDef.permissions[module] || { view: false, create: false, edit: false, delete: false };
    const newVal = !currentModulePerms[action];

    updateRolePermissions(selectedRoleForPermissions, module, {
      [action]: newVal,
    });
  };

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck color="var(--color-primary)" /> Control de Usuarios, Gestores y Permisos
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Administración del personal del taller, creación de cuentas y configuración granular de accesos (RBAC).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="outline"
            onClick={() => setIsRoleModalOpen(true)}
            icon={<Key size={16} />}
          >
            Nuevo Rol
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingUser(null);
              setIsUserModalOpen(true);
            }}
            icon={<UserPlus size={16} />}
          >
            Registrar Gestor
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total de Usuarios</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '4px' }}>{users.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Cuentas registradas</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Users size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Usuarios Activos</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{activeUsersCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Con acceso habilitado</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Roles Definidos</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>{roles.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Perfiles de permisos</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <ShieldCheck size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Acciones Registradas</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{auditLogs.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Eventos en auditoría</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Activity size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '4px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('usuarios')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'usuarios' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'usuarios' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          <Users size={16} /> Gestores & Empleados ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('permisos')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'permisos' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'permisos' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          <ShieldCheck size={16} /> Matriz de Roles & Permisos
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auditoria')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'auditoria' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'auditoria' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          <Clock size={16} /> Registro de Auditoría ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: GESTORES Y USUARIOS */}
      {activeTab === 'usuarios' && (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '12px 10px' }}>Gestor / Usuario</th>
                  <th style={{ padding: '12px 10px' }}>Rol Asignado</th>
                  <th style={{ padding: '12px 10px' }}>Teléfono</th>
                  <th style={{ padding: '12px 10px' }}>Último Acceso</th>
                  <th style={{ padding: '12px 10px' }}>Estado</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleObj = roles.find((r) => r.id === u.role);
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 700 }}>{u.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{u.email}</div>
                      </td>

                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: `${roleObj?.color || '#3b82f6'}15`,
                          color: roleObj?.color || '#3b82f6',
                          border: `1px solid ${roleObj?.color || '#3b82f6'}30`,
                        }}>
                          {roleObj?.name || u.role}
                        </span>
                      </td>

                      <td style={{ padding: '12px 10px', color: 'var(--color-text-muted)' }}>
                        {u.phone || 'No registrado'}
                      </td>

                      <td style={{ padding: '12px 10px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Nunca'}
                      </td>

                      <td style={{ padding: '12px 10px' }}>
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(u.id)}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: u.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: u.isActive ? '#10b981' : '#ef4444',
                          }}
                        >
                          {u.isActive ? '● Activo' : '○ Inactivo'}
                        </button>
                      </td>

                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingUser(u);
                              setIsUserModalOpen(true);
                            }}
                            icon={<Edit size={14} />}
                          >
                            Editar
                          </Button>
                          {u.role !== 'OWNER' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`¿Eliminar al usuario ${u.name}?`)) deleteUser(u.id);
                              }}
                              icon={<Trash2 size={14} color="#ef4444" />}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: MATRIZ DE ROLES Y PERMISOS */}
      {activeTab === 'permisos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Role selector chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoleForPermissions(r.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: selectedRoleForPermissions === r.id ? `2px solid ${r.color}` : '1px solid var(--color-border)',
                  background: selectedRoleForPermissions === r.id ? `${r.color}15` : 'var(--color-bg-surface)',
                  color: selectedRoleForPermissions === r.id ? r.color : 'var(--color-text-main)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {r.name}
              </button>
            ))}
          </div>

          {/* Active Role Description */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: currentRoleDef.color }}>
                  Permisos para: {currentRoleDef.name}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {currentRoleDef.description}
                </p>
              </div>

              {!currentRoleDef.isSystem && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`¿Eliminar el rol ${currentRoleDef.name}?`)) {
                      deleteCustomRole(currentRoleDef.id);
                      setSelectedRoleForPermissions('RECEPTIONIST');
                    }
                  }}
                  icon={<Trash2 size={14} color="#ef4444" />}
                >
                  Eliminar Rol Personalizado
                </Button>
              )}
            </div>
          </Card>

          {/* Granular Permission Matrix Table */}
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '12px 10px', width: '35%' }}>Módulo del Software</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>👁️ Ver (Menú)</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>➕ Crear</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>✏️ Editar</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>🗑️ Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULE_LABELS.map((mod) => {
                    const perms = currentRoleDef.permissions[mod.key] || { view: false, create: false, edit: false, delete: false };
                    const isOwner = selectedRoleForPermissions === 'OWNER';

                    return (
                      <tr key={mod.key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{mod.icon}</span>
                            <span>{mod.label}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{mod.category}</span>
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            disabled={isOwner}
                            checked={perms.view}
                            onChange={() => handleTogglePerm(mod.key, 'view')}
                            style={{ width: '18px', height: '18px', cursor: isOwner ? 'not-allowed' : 'pointer' }}
                          />
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            disabled={isOwner}
                            checked={perms.create}
                            onChange={() => handleTogglePerm(mod.key, 'create')}
                            style={{ width: '18px', height: '18px', cursor: isOwner ? 'not-allowed' : 'pointer' }}
                          />
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            disabled={isOwner}
                            checked={perms.edit}
                            onChange={() => handleTogglePerm(mod.key, 'edit')}
                            style={{ width: '18px', height: '18px', cursor: isOwner ? 'not-allowed' : 'pointer' }}
                          />
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            disabled={isOwner}
                            checked={perms.delete}
                            onChange={() => handleTogglePerm(mod.key, 'delete')}
                            style={{ width: '18px', height: '18px', cursor: isOwner ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}

      {/* TAB 3: REGISTRO DE AUDITORIA */}
      {activeTab === 'auditoria' && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 700 }}>Actividades Recientes de los Gestores</h3>
            {auditLogs.map((log) => (
              <div key={log.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-subtle, rgba(0,0,0,0.02))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{log.userName}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                      {log.userRole}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>{log.action}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {log.details}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        initialUser={editingUser}
      />

      <RoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />

    </div>
  );
};

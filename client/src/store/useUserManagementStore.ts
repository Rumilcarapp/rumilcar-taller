import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '../stores/authStore';

export type AppRoleKey = 'OWNER' | 'ADMIN' | 'RECEPTIONIST' | 'MECHANIC' | 'CASHIER' | 'INVENTORY' | string;

export type AppModuleKey = 
  | 'dashboard'
  | 'workOrders'
  | 'agenda'
  | 'budgets'
  | 'diagnostics'
  | 'inspections'
  | 'vehicles'
  | 'clients'
  | 'inventory'
  | 'pos'
  | 'cashRegister'
  | 'prePurchase'
  | 'purchases'
  | 'collections'
  | 'crm'
  | 'reports'
  | 'users';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  special?: Record<string, boolean>; // e.g. seeCost, applyDiscount, closeCashRegister
}

export interface RoleDefinition {
  id: AppRoleKey;
  name: string;
  description: string;
  color: string;
  isSystem?: boolean;
  permissions: Record<AppModuleKey, ModulePermissions>;
}

export interface ManagedUser {
  id: string;
  workshopId?: string;
  name: string;
  email: string;
  phone?: string;
  role: AppRoleKey;
  isActive: boolean;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  workshopId?: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: AppModuleKey | 'auth' | 'settings' | 'users' | 'caja' | 'workOrders' | 'inventory';
  details: string;
  timestamp: string;
}

interface UserManagementState {
  users: ManagedUser[];
  roles: RoleDefinition[];
  auditLogs: AuditLog[];

  // User Actions
  addUser: (user: Omit<ManagedUser, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<ManagedUser>) => void;
  toggleUserStatus: (id: string) => void;
  deleteUser: (id: string) => void;

  // Role Actions
  updateRolePermissions: (roleId: AppRoleKey, module: AppModuleKey, perms: Partial<ModulePermissions>) => void;
  addCustomRole: (role: RoleDefinition) => void;
  deleteCustomRole: (roleId: string) => void;

  // Audit Log
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;

  // Helper
  hasPermission: (roleId: AppRoleKey, module: AppModuleKey, action: 'view' | 'create' | 'edit' | 'delete' | string) => boolean;
}

const ALL_PERMISSIONS_TRUE: Record<AppModuleKey, ModulePermissions> = {
  dashboard: { view: true, create: true, edit: true, delete: true },
  workOrders: { view: true, create: true, edit: true, delete: true },
  agenda: { view: true, create: true, edit: true, delete: true },
  budgets: { view: true, create: true, edit: true, delete: true },
  diagnostics: { view: true, create: true, edit: true, delete: true },
  inspections: { view: true, create: true, edit: true, delete: true },
  vehicles: { view: true, create: true, edit: true, delete: true },
  clients: { view: true, create: true, edit: true, delete: true },
  inventory: { view: true, create: true, edit: true, delete: true, special: { seeCost: true } },
  pos: { view: true, create: true, edit: true, delete: true },
  cashRegister: { view: true, create: true, edit: true, delete: true, special: { closeCash: true } },
  prePurchase: { view: true, create: true, edit: true, delete: true },
  purchases: { view: true, create: true, edit: true, delete: true },
  collections: { view: true, create: true, edit: true, delete: true },
  crm: { view: true, create: true, edit: true, delete: true },
  reports: { view: true, create: true, edit: true, delete: true },
  users: { view: true, create: true, edit: true, delete: true },
};

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'SUPERADMIN',
    name: '👑 Super Administrador SaaS',
    description: 'Control global de la plataforma Rumilcarapp, gestión de talleres, membresías y verificación de pagos.',
    color: '#e11d48',
    isSystem: true,
    permissions: ALL_PERMISSIONS_TRUE,
  },
  {
    id: 'OWNER',
    name: '🏢 Dueño del Taller',
    description: 'Acceso y control total de su taller, finanzas, inventario y gestión de usuarios.',
    color: '#8b5cf6',
    isSystem: true,
    permissions: ALL_PERMISSIONS_TRUE,
  },
  {
    id: 'ADMIN',
    name: '⭐ Administrador General',
    description: 'Gestión operativa, administrativa, inventario y reportes.',
    color: '#3b82f6',
    isSystem: true,
    permissions: {
      ...ALL_PERMISSIONS_TRUE,
      users: { view: true, create: true, edit: true, delete: false },
    },
  },
  {
    id: 'RECEPTIONIST',
    name: '📋 Recepcionista / Asesor de Servicio',
    description: 'Atención a clientes, agenda de citas, órdenes de trabajo, presupuestos y CRM.',
    color: '#06b6d4',
    isSystem: true,
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false },
      workOrders: { view: true, create: true, edit: true, delete: false },
      agenda: { view: true, create: true, edit: true, delete: true },
      budgets: { view: true, create: true, edit: true, delete: false },
      diagnostics: { view: true, create: true, edit: true, delete: false },
      inspections: { view: true, create: true, edit: true, delete: false },
      vehicles: { view: true, create: true, edit: true, delete: false },
      clients: { view: true, create: true, edit: true, delete: false },
      inventory: { view: true, create: false, edit: false, delete: false, special: { seeCost: false } },
      pos: { view: false, create: false, edit: false, delete: false },
      cashRegister: { view: false, create: false, edit: false, delete: false },
      prePurchase: { view: true, create: true, edit: true, delete: false },
      purchases: { view: false, create: false, edit: false, delete: false },
      collections: { view: true, create: true, edit: false, delete: false },
      crm: { view: true, create: true, edit: true, delete: false },
      reports: { view: false, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
    },
  },
  {
    id: 'MECHANIC',
    name: '🔧 Mecánico / Jefe de Taller',
    description: 'Enfocado en diagnóstico, inspecciones y progreso técnico de órdenes.',
    color: '#f59e0b',
    isSystem: true,
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false },
      workOrders: { view: true, create: false, edit: true, delete: false },
      agenda: { view: true, create: false, edit: false, delete: false },
      budgets: { view: false, create: false, edit: false, delete: false },
      diagnostics: { view: true, create: true, edit: true, delete: false },
      inspections: { view: true, create: true, edit: true, delete: false },
      vehicles: { view: true, create: false, edit: false, delete: false },
      clients: { view: false, create: false, edit: false, delete: false },
      inventory: { view: true, create: false, edit: false, delete: false, special: { seeCost: false } },
      pos: { view: false, create: false, edit: false, delete: false },
      cashRegister: { view: false, create: false, edit: false, delete: false },
      prePurchase: { view: true, create: true, edit: true, delete: false },
      purchases: { view: false, create: false, edit: false, delete: false },
      collections: { view: false, create: false, edit: false, delete: false },
      crm: { view: false, create: false, edit: false, delete: false },
      reports: { view: false, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
    },
  },
  {
    id: 'CASHIER',
    name: '💵 Cajero / Facturación',
    description: 'Manejo de caja, cobros, cobranza, punto de venta y compras operativas.',
    color: '#10b981',
    isSystem: true,
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false },
      workOrders: { view: true, create: false, edit: true, delete: false },
      agenda: { view: false, create: false, edit: false, delete: false },
      budgets: { view: true, create: false, edit: false, delete: false },
      diagnostics: { view: false, create: false, edit: false, delete: false },
      inspections: { view: false, create: false, edit: false, delete: false },
      vehicles: { view: true, create: false, edit: false, delete: false },
      clients: { view: true, create: true, edit: true, delete: false },
      inventory: { view: true, create: false, edit: false, delete: false, special: { seeCost: false } },
      pos: { view: true, create: true, edit: true, delete: true },
      cashRegister: { view: true, create: true, edit: true, delete: false, special: { closeCash: true } },
      prePurchase: { view: false, create: false, edit: false, delete: false },
      purchases: { view: true, create: true, edit: false, delete: false },
      collections: { view: true, create: true, edit: true, delete: false },
      crm: { view: false, create: false, edit: false, delete: false },
      reports: { view: true, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
    },
  },
  {
    id: 'INVENTORY',
    name: '📦 Encargado de Inventario & Bodega',
    description: 'Gestión de repuestos, stock, entradas/salidas y compras a proveedores.',
    color: '#ec4899',
    isSystem: true,
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false },
      workOrders: { view: true, create: false, edit: false, delete: false },
      agenda: { view: false, create: false, edit: false, delete: false },
      budgets: { view: false, create: false, edit: false, delete: false },
      diagnostics: { view: false, create: false, edit: false, delete: false },
      inspections: { view: false, create: false, edit: false, delete: false },
      vehicles: { view: false, create: false, edit: false, delete: false },
      clients: { view: false, create: false, edit: false, delete: false },
      inventory: { view: true, create: true, edit: true, delete: true, special: { seeCost: true } },
      pos: { view: false, create: false, edit: false, delete: false },
      cashRegister: { view: false, create: false, edit: false, delete: false },
      prePurchase: { view: false, create: false, edit: false, delete: false },
      purchases: { view: true, create: true, edit: true, delete: true },
      collections: { view: false, create: false, edit: false, delete: false },
      crm: { view: false, create: false, edit: false, delete: false },
      reports: { view: true, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
    },
  },
];

// Users are loaded from the authenticated backend. Never seed accounts locally.
const DEFAULT_USERS: ManagedUser[] = [];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [];

export const useUserManagementStore = create<UserManagementState>()(
  persist(
    (set, get) => ({
      users: DEFAULT_USERS,
      roles: DEFAULT_ROLES,
      auditLogs: DEFAULT_AUDIT_LOGS,

      addUser: (user) => {
        const currentWorkshopId = user.workshopId || useAuthStore.getState().user?.workshopId || '';
        set((state) => ({
          users: [
            {
              ...user,
              workshopId: currentWorkshopId,
              id: 'usr-' + Date.now(),
              createdAt: new Date().toISOString(),
            },
            ...state.users,
          ],
        }));
      },

      updateUser: (id, updates) => set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
      })),

      toggleUserStatus: (id) => {
        const state = get();
        const targetUser = state.users.find((u) => u.id === id);
        const currentUser = useAuthStore.getState().user;
        const newStatus = targetUser ? !targetUser.isActive : false;

        set({
          users: state.users.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)),
        });

        if (targetUser) {
          get().addAuditLog({
            workshopId: targetUser.workshopId || currentUser?.workshopId,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrador',
            userRole: currentUser?.role || 'OWNER',
            action: newStatus ? 'Activación de Gestor' : 'Desactivación de Gestor',
            module: 'users',
            details: `${newStatus ? 'Habilitó' : 'Deshabilitó'} el acceso al sistema para ${targetUser.name} (${targetUser.email})`,
          });
        }
      },

      deleteUser: (id) => set((state) => ({
        users: state.users.filter((u) => u.id !== id),
      })),

      updateRolePermissions: (roleId, module, perms) => {
        const state = get();
        const currentUser = useAuthStore.getState().user;
        const role = state.roles.find((r) => r.id === roleId);

        set({
          roles: state.roles.map((r) => {
            if (r.id !== roleId) return r;
            const currentModulePerms = r.permissions[module] || { view: false, create: false, edit: false, delete: false };
            return {
              ...r,
              permissions: {
                ...r.permissions,
                [module]: { ...currentModulePerms, ...perms },
              },
            };
          }),
        });

        if (role) {
          const keys = Object.entries(perms)
            .map(([k, v]) => `${k}: ${v ? 'Permitido' : 'Bloqueado'}`)
            .join(', ');
          get().addAuditLog({
            workshopId: currentUser?.workshopId,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrador',
            userRole: currentUser?.role || 'OWNER',
            action: 'Modificación de Permisos',
            module: 'users',
            details: `Ajustó permisos del rol ${role.name} en módulo "${module}": [${keys}]`,
          });
        }
      },

      addCustomRole: (role) => set((state) => ({
        roles: [...state.roles, role],
      })),

      deleteCustomRole: (roleId) => {
        const state = get();
        const roleToDelete = state.roles.find((r) => r.id === roleId);
        const currentUser = useAuthStore.getState().user;

        set({
          roles: state.roles.filter((r) => r.id !== roleId),
        });

        if (roleToDelete) {
          get().addAuditLog({
            workshopId: currentUser?.workshopId,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Administrador',
            userRole: currentUser?.role || 'OWNER',
            action: 'Eliminación de Rol',
            module: 'users',
            details: `Se eliminó el rol personalizado: ${roleToDelete.name}`,
          });
        }
      },

      addAuditLog: (log) => {
        const currentUser = useAuthStore.getState().user;
        const currentWorkshopId = log.workshopId || currentUser?.workshopId || '';
        set((state) => ({
          auditLogs: [
            {
              ...log,
              workshopId: currentWorkshopId,
              userId: log.userId || currentUser?.id || 'anon',
              userName: log.userName || currentUser?.name || 'Usuario',
              userRole: log.userRole || currentUser?.role || 'OWNER',
              id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              timestamp: new Date().toISOString(),
            },
            ...state.auditLogs.slice(0, 199), // Keep latest 200 logs
          ],
        }));
      },

      hasPermission: (roleId, module, action) => {
        if (roleId === 'SUPERADMIN' || roleId === 'OWNER') return true;
        const state = get();
        const role = state.roles.find((r) => r.id === roleId);
        if (!role) return false;

        const modulePerms = role.permissions[module];
        if (!modulePerms) return false;

        if (action === 'view') return !!modulePerms.view;
        if (action === 'create') return !!modulePerms.create;
        if (action === 'edit') return !!modulePerms.edit;
        if (action === 'delete') return !!modulePerms.delete;

        if (modulePerms.special && modulePerms.special[action] !== undefined) {
          return !!modulePerms.special[action];
        }

        return false;
      },
    }),
    {
      name: 'rumilcar-users-storage',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.users)) {
          state.users = state.users.map((u) => {
            if (u.name.includes('Don Pedro')) {
              return { ...u, name: 'Administrador (Dueño)' };
            }
            return u;
          });
        }
        if (state && Array.isArray(state.auditLogs)) {
          state.auditLogs = state.auditLogs.map((l) => {
            // Retrofit workshopId if missing on legacy logs
            if (!l.workshopId) {
              if (l.userRole === 'SUPERADMIN' || l.details?.includes('Rumilcar Central') || l.userName?.includes('Luark')) {
                return { ...l, workshopId: '19c1bb78-46e2-4434-b629-33f2cae7d00c' };
              }
              if (l.details?.includes('Multiservicios Rumilcar') || l.userName?.includes('Daniel')) {
                return { ...l, workshopId: '0ea6fc7a-889d-46ad-8efa-a8e3f4831e89' };
              }
            }
            if (l.userName.includes('Don Pedro')) {
              return { ...l, userName: 'Administrador (Dueño)' };
            }
            return l;
          });
        }
      },
    }
  )
);

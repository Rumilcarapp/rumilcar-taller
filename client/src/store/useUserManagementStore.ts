import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: AppRoleKey;
  isActive: boolean;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: AppModuleKey | 'auth' | 'settings';
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
    id: 'OWNER',
    name: '👑 Dueño / Super Administrador',
    description: 'Acceso y control total de todos los módulos, finanzas, inventario y gestión de usuarios.',
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

const DEFAULT_USERS: ManagedUser[] = [
  {
    id: 'usr-1',
    name: 'Don Pedro (Dueño)',
    email: 'admin@taller.com',
    password: 'admin',
    phone: '0414-1112233',
    role: 'OWNER',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'usr-2',
    name: 'Mariana Silva (Recepcionista)',
    email: 'recepcion@taller.com',
    password: '123',
    phone: '0424-9988776',
    role: 'RECEPTIONIST',
    isActive: true,
    lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'usr-3',
    name: 'Carlos Mendoza (Mecánico Jefe)',
    email: 'mecanico@taller.com',
    password: '123',
    phone: '0412-5554433',
    role: 'MECHANIC',
    isActive: true,
    lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'usr-4',
    name: 'Lucía Torres (Cajera)',
    email: 'caja@taller.com',
    password: '123',
    phone: '0416-3332211',
    role: 'CASHIER',
    isActive: true,
    lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'usr-5',
    name: 'Roberto Gómez (Almacenista)',
    email: 'inventario@taller.com',
    password: '123',
    phone: '0414-7776655',
    role: 'INVENTORY',
    isActive: true,
    lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'usr-1',
    userName: 'Don Pedro (Dueño)',
    userRole: 'OWNER',
    action: 'Inicio de Sesión',
    module: 'auth',
    details: 'Acceso exitoso al sistema',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-2',
    userId: 'usr-2',
    userName: 'Mariana Silva',
    userRole: 'RECEPTIONIST',
    action: 'Creación de Cita',
    module: 'agenda',
    details: 'Cita creada para Luis Perez (Toyota Corolla)',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-3',
    userId: 'usr-4',
    userName: 'Lucía Torres',
    userRole: 'CASHIER',
    action: 'Cobro de Orden',
    module: 'cashRegister',
    details: 'Cobro registrado por $50 USD en efectivo (Orden #RMC-2026-1001)',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

export const useUserManagementStore = create<UserManagementState>()(
  persist(
    (set, get) => ({
      users: DEFAULT_USERS,
      roles: DEFAULT_ROLES,
      auditLogs: DEFAULT_AUDIT_LOGS,

      addUser: (user) => set((state) => ({
        users: [
          {
            ...user,
            id: 'usr-' + Date.now(),
            createdAt: new Date().toISOString(),
          },
          ...state.users,
        ],
      })),

      updateUser: (id, updates) => set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
      })),

      toggleUserStatus: (id) => set((state) => ({
        users: state.users.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)),
      })),

      deleteUser: (id) => set((state) => ({
        users: state.users.filter((u) => u.id !== id),
      })),

      updateRolePermissions: (roleId, module, perms) => set((state) => ({
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
      })),

      addCustomRole: (role) => set((state) => ({
        roles: [...state.roles, role],
      })),

      deleteCustomRole: (roleId) => set((state) => ({
        roles: state.roles.filter((r) => r.id !== roleId),
      })),

      addAuditLog: (log) => set((state) => ({
        auditLogs: [
          {
            ...log,
            id: 'log-' + Date.now(),
            timestamp: new Date().toISOString(),
          },
          ...state.auditLogs.slice(0, 99), // Keep latest 100 logs
        ],
      })),

      hasPermission: (roleId, module, action) => {
        const state = get();
        const role = state.roles.find((r) => r.id === roleId);
        if (!role) return false;
        if (role.id === 'OWNER') return true; // Owner always has all permissions

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
    }
  )
);

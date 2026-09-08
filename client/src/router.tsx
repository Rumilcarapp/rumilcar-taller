import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { InventoryPage } from './features/inventory/InventoryPage';
import { POSPage } from './features/pos/POSPage';
import { CashRegisterPage } from './features/caja/CashRegisterPage';
import { ClientsPage } from './features/clients/ClientsPage';
import { ClientDetailPage } from './features/clients/ClientDetailPage';
import { VehiclesPage } from './features/vehicles/VehiclesPage';
import { VehicleDetailPage } from './features/vehicles/VehicleDetailPage';
import { DiagnosticsPage } from './features/diagnostics/DiagnosticsPage';
import { InspectionsPage } from './features/inspections/InspectionsPage';
import { WorkOrdersPage } from './features/workOrders/WorkOrdersPage';
import { CreateWorkOrderPage } from './features/workOrders/CreateWorkOrderPage';
import { PreCompraPage } from './features/pre-compra/PreCompraPage';
import { CobranzaPage } from './features/cobranza/CobranzaPage';
import { ComprasPage } from './features/compras/ComprasPage';
import { ReportesPage } from './features/reportes/ReportesPage';
import { CRMPage } from './features/crm/CRMPage';
import { AgendaPage } from './features/agenda/AgendaPage';
import { BudgetsPage } from './features/budgets/BudgetsPage';
import { UsersPage } from './features/users/UsersPage';
import { TrackingPage } from './features/tracking/TrackingPage';
import { SubscriptionPage } from './features/subscription/SubscriptionPage';
import { SuperAdminSubscriptionsPage } from './features/admin/SuperAdminSubscriptionsPage';
import { PermissionGuard } from './components/shared/PermissionGuard';
import { useAuthStore } from './stores/authStore';

// Auth guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = localStorage.getItem('rumilcar_token');
  if (!isAuthenticated || !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// SuperAdmin guard
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== 'SUPERADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Index route guard (Redirects SuperAdmin to SaaS Admin panel)
const RootIndexRoute: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'SUPERADMIN') {
    return <Navigate to="/admin/membresias" replace />;
  }
  return <DashboardPage />;
};

// Workshop users route guard (Staff management is for workshops, not SuperAdmin)
const WorkshopUsersRoute: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'SUPERADMIN') {
    return <Navigate to="/admin/membresias" replace />;
  }
  return (
    <PermissionGuard module="users">
      <UsersPage />
    </PermissionGuard>
  );
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/rastreo/:id',
    element: <TrackingPage />,
  },
  {
    path: '/tracking/:id',
    element: <TrackingPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <RootIndexRoute /> },
      { path: 'trabajos', element: <PermissionGuard module="workOrders"><WorkOrdersPage /></PermissionGuard> },
      { path: 'trabajos/nueva', element: <PermissionGuard module="workOrders" action="create"><CreateWorkOrderPage /></PermissionGuard> },
      { path: 'trabajos/:id', element: <PermissionGuard module="workOrders"><CreateWorkOrderPage /></PermissionGuard> },
      { path: 'agenda', element: <PermissionGuard module="agenda"><AgendaPage /></PermissionGuard> },
      { path: 'presupuestos', element: <PermissionGuard module="budgets"><BudgetsPage /></PermissionGuard> },
      { path: 'presupuestos/nuevo', element: <PermissionGuard module="budgets" action="create"><CreateWorkOrderPage /></PermissionGuard> },
      { path: 'presupuestos/:id', element: <PermissionGuard module="budgets"><CreateWorkOrderPage /></PermissionGuard> },
      { path: 'diagnosticos', element: <PermissionGuard module="diagnostics"><DiagnosticsPage /></PermissionGuard> },
      { path: 'inspecciones', element: <PermissionGuard module="inspections"><InspectionsPage /></PermissionGuard> },
      { path: 'vehiculos', element: <PermissionGuard module="vehicles"><VehiclesPage /></PermissionGuard> },
      { path: 'vehiculos/:id', element: <PermissionGuard module="vehicles"><VehicleDetailPage /></PermissionGuard> },
      { path: 'clientes', element: <PermissionGuard module="clients"><ClientsPage /></PermissionGuard> },
      { path: 'clientes/:id', element: <PermissionGuard module="clients"><ClientDetailPage /></PermissionGuard> },
      { path: 'inventario', element: <PermissionGuard module="inventory"><InventoryPage /></PermissionGuard> },
      { path: 'pos', element: <PermissionGuard module="pos"><POSPage /></PermissionGuard> },
      { path: 'caja', element: <PermissionGuard module="cashRegister"><CashRegisterPage /></PermissionGuard> },
      { path: 'pre-compra', element: <PermissionGuard module="prePurchase"><PreCompraPage /></PermissionGuard> },
      { path: 'compras', element: <PermissionGuard module="purchases"><ComprasPage /></PermissionGuard> },
      { path: 'cobranza', element: <PermissionGuard module="collections"><CobranzaPage /></PermissionGuard> },
      { path: 'crm', element: <PermissionGuard module="crm"><CRMPage /></PermissionGuard> },
      { path: 'reportes', element: <PermissionGuard module="reports"><ReportesPage /></PermissionGuard> },
      { path: 'usuarios', element: <WorkshopUsersRoute /> },
      { path: 'perfil', element: <ProfilePage /> },
      { path: 'membresia', element: <SubscriptionPage /> },
      { path: 'admin/membresias', element: <SuperAdminRoute><SuperAdminSubscriptionsPage /></SuperAdminRoute> },
    ],
  },
]);

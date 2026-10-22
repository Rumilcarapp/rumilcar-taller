import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { LoadingFallback } from './components/ui';
import { PermissionGuard } from './components/shared/PermissionGuard';
import { useAuthStore } from './stores/authStore';

// Code-split dynamic routes for ultra-fast initial load (Standard Appli-Car / TuulApp)
const LoginPage = React.lazy(() => import('./features/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const ResetPasswordPage = React.lazy(() => import('./features/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const DashboardPage = React.lazy(() => import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProfilePage = React.lazy(() => import('./features/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const InventoryPage = React.lazy(() => import('./features/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const POSPage = React.lazy(() => import('./features/pos/POSPage').then(m => ({ default: m.POSPage })));
const CashRegisterPage = React.lazy(() => import('./features/caja/CashRegisterPage').then(m => ({ default: m.CashRegisterPage })));
const ClientsPage = React.lazy(() => import('./features/clients/ClientsPage').then(m => ({ default: m.ClientsPage })));
const ClientDetailPage = React.lazy(() => import('./features/clients/ClientDetailPage').then(m => ({ default: m.ClientDetailPage })));
const VehiclesPage = React.lazy(() => import('./features/vehicles/VehiclesPage').then(m => ({ default: m.VehiclesPage })));
const VehicleDetailPage = React.lazy(() => import('./features/vehicles/VehicleDetailPage').then(m => ({ default: m.VehicleDetailPage })));
const DiagnosticsPage = React.lazy(() => import('./features/diagnostics/DiagnosticsPage').then(m => ({ default: m.DiagnosticsPage })));
const InspectionsPage = React.lazy(() => import('./features/inspections/InspectionsPage').then(m => ({ default: m.InspectionsPage })));
const WorkOrdersPage = React.lazy(() => import('./features/workOrders/WorkOrdersPage').then(m => ({ default: m.WorkOrdersPage })));
const CreateWorkOrderPage = React.lazy(() => import('./features/workOrders/CreateWorkOrderPage').then(m => ({ default: m.CreateWorkOrderPage })));
const PreCompraPage = React.lazy(() => import('./features/pre-compra/PreCompraPage').then(m => ({ default: m.PreCompraPage })));
const CobranzaPage = React.lazy(() => import('./features/cobranza/CobranzaPage').then(m => ({ default: m.CobranzaPage })));
const ComprasPage = React.lazy(() => import('./features/compras/ComprasPage').then(m => ({ default: m.ComprasPage })));
const ReportesPage = React.lazy(() => import('./features/reportes/ReportesPage').then(m => ({ default: m.ReportesPage })));
const CRMPage = React.lazy(() => import('./features/crm/CRMPage').then(m => ({ default: m.CRMPage })));
const AgendaPage = React.lazy(() => import('./features/agenda/AgendaPage').then(m => ({ default: m.AgendaPage })));
const AppointmentConfirmationPage = React.lazy(() => import('./features/agenda/AppointmentConfirmationPage').then(m => ({ default: m.AppointmentConfirmationPage })));
const BudgetsPage = React.lazy(() => import('./features/budgets/BudgetsPage').then(m => ({ default: m.BudgetsPage })));
const UsersPage = React.lazy(() => import('./features/users/UsersPage').then(m => ({ default: m.UsersPage })));
const TrackingPage = React.lazy(() => import('./features/tracking/TrackingPage').then(m => ({ default: m.TrackingPage })));
const SubscriptionPage = React.lazy(() => import('./features/subscription/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const SuperAdminSubscriptionsPage = React.lazy(() => import('./features/admin/SuperAdminSubscriptionsPage').then(m => ({ default: m.SuperAdminSubscriptionsPage })));
const SuperAdminWorkshopsPage = React.lazy(() => import('./features/admin/SuperAdminWorkshopsPage').then(m => ({ default: m.SuperAdminWorkshopsPage })));
const SuperAdminSupportHubPage = React.lazy(() => import('./features/admin/SuperAdminSupportHubPage').then(m => ({ default: m.SuperAdminSupportHubPage })));
const SuperAdminFeedbackPage = React.lazy(() => import('./features/admin/SuperAdminFeedbackPage').then(m => ({ default: m.SuperAdminFeedbackPage })));
const SuperAdminConfigPage = React.lazy(() => import('./features/admin/SuperAdminConfigPage').then(m => ({ default: m.SuperAdminConfigPage })));

const lazyWrap = (element: React.ReactNode, message?: string) => (
  <React.Suspense fallback={<LoadingFallback message={message} />}>
    {element}
  </React.Suspense>
);

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
    return <Navigate to="/admin/talleres" replace />;
  }
  return (
    <PermissionGuard module="users">
      <UsersPage />
    </PermissionGuard>
  );
};

const RouteErrorBoundary: React.FC = () => {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      color: '#f3f4f6',
      background: 'radial-gradient(circle at top center, #111827 0%, #090d16 100%)',
    }}>
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '480px',
        width: '100%',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: '#f87171' }}>
          Inconveniente al cargar la vista
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Hemos protegido tu sesión y tus datos. Puedes recargar la pantalla o volver al panel principal del taller.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.65rem 1.25rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Recargar pantalla
          </button>
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              padding: '0.65rem 1.25rem',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#d1d5db',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: lazyWrap(<LoginPage />, 'Cargando acceso al taller...'),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/restablecer-contrasena',
    element: lazyWrap(<ResetPasswordPage />, 'Cargando restablecimiento de contraseña...'),
  },
  {
    path: '/reset-password',
    element: lazyWrap(<ResetPasswordPage />, 'Cargando restablecimiento de contraseña...'),
  },
  {
    path: '/rastreo/:id',
    element: lazyWrap(<TrackingPage />, 'Consultando estado del vehículo en taller...'),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/tracking/:id',
    element: lazyWrap(<TrackingPage />, 'Consultando estado del vehículo en taller...'),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/cita/:id',
    element: lazyWrap(<AppointmentConfirmationPage />, 'Cargando reserva de cita...'),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/confirmar-cita/:id',
    element: lazyWrap(<AppointmentConfirmationPage />, 'Cargando confirmación de cita...'),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
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
      { path: 'admin/talleres', element: <SuperAdminRoute><SuperAdminWorkshopsPage /></SuperAdminRoute> },
      { path: 'admin/soporte', element: <SuperAdminRoute><SuperAdminSupportHubPage /></SuperAdminRoute> },
      { path: 'admin/feedback', element: <SuperAdminRoute><SuperAdminFeedbackPage /></SuperAdminRoute> },
      { path: 'admin/configuracion', element: <SuperAdminRoute><SuperAdminConfigPage /></SuperAdminRoute> },
    ],
  },
]);

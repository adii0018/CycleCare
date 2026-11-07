import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminLayout } from '../components/layout/AdminLayout';
import { RegisterPage } from '../pages/customer/RegisterPage';
import { ConfirmationPage } from '../pages/customer/ConfirmationPage';
import { NotFoundPage } from '../pages/customer/NotFoundPage';
import { Skeleton } from '../components/ui/Skeleton';

// Route-level lazy loading for admin bundle separation
const AdminLoginPage = lazy(() =>
  import('../pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage }))
);
const AdminOverviewPage = lazy(() =>
  import('../pages/admin/AdminOverviewPage').then((m) => ({
    default: m.AdminOverviewPage,
  }))
);
const AdminRepairsPage = lazy(() =>
  import('../pages/admin/AdminRepairsPage').then((m) => ({ default: m.AdminRepairsPage }))
);
const AdminDetailPage = lazy(() =>
  import('../pages/admin/AdminDetailPage').then((m) => ({ default: m.AdminDetailPage }))
);
const AdminManualPage = lazy(() =>
  import('../pages/admin/AdminManualPage').then((m) => ({ default: m.AdminManualPage }))
);
const AdminArchivePage = lazy(() =>
  import('../pages/admin/AdminArchivePage').then((m) => ({ default: m.AdminArchivePage }))
);
const AdminNotFoundPage = lazy(() =>
  import('../pages/admin/AdminNotFoundPage').then((m) => ({
    default: m.AdminNotFoundPage,
  }))
);

function AdminSuspense({ children }) {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Customer Routes */}
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/confirmation" element={<ConfirmationPage />} />

      {/* Admin Public Login */}
      <Route
        path="/admin/login"
        element={
          <AdminSuspense>
            <AdminLoginPage />
          </AdminSuspense>
        }
      />

      {/* Admin Protected Routes */}
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route
            index
            element={
              <AdminSuspense>
                <AdminOverviewPage />
              </AdminSuspense>
            }
          />
          <Route
            path="repairs"
            element={
              <AdminSuspense>
                <AdminRepairsPage />
              </AdminSuspense>
            }
          />
          <Route
            path="repairs/:repairId"
            element={
              <AdminSuspense>
                <AdminDetailPage />
              </AdminSuspense>
            }
          />
          <Route
            path="new"
            element={
              <AdminSuspense>
                <AdminManualPage />
              </AdminSuspense>
            }
          />
          <Route
            path="archive"
            element={
              <AdminSuspense>
                <AdminArchivePage />
              </AdminSuspense>
            }
          />
          <Route
            path="*"
            element={
              <AdminSuspense>
                <AdminNotFoundPage />
              </AdminSuspense>
            }
          />
        </Route>
      </Route>

      {/* Customer 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

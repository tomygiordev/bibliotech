import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { MainLayout } from '@/shared/components/layout/MainLayout';
import { AdminLayout } from '@/shared/components/layout/AdminLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { CatalogPage } from '@/features/books/pages/CatalogPage';
import { BookDetailPage } from '@/features/books/pages/BookDetailPage';
import { MyLoansPage } from '@/features/loans/pages/MyLoansPage';
import { MyReservationsPage } from '@/features/reservations/pages/MyReservationsPage';
import { DashboardPage } from '@/features/admin/pages/DashboardPage';
import { UsersPage } from '@/features/admin/pages/UsersPage';
import { ReportsPage } from '@/features/admin/pages/ReportsPage';
import { AdminBooksPage } from '@/features/admin/pages/AdminBooksPage';
import { AdminBranchesPage } from '@/features/admin/pages/AdminBranchesPage';
import { AdminCopiesPage } from '@/features/admin/pages/AdminCopiesPage';
import { AdminLoansPage } from '@/features/admin/pages/AdminLoansPage';
import { AdminReservationsPage } from '@/features/admin/pages/AdminReservationsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/loans" element={<AdminLoansPage />} />
          <Route path="/admin/reservations" element={<AdminReservationsPage />} />
          <Route path="/admin/books" element={<AdminBooksPage />} />
          <Route path="/admin/copies" element={<AdminCopiesPage />} />
          <Route path="/admin/branches" element={<AdminBranchesPage />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/catalog" replace />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/catalog/:id" element={<BookDetailPage />} />
          <Route
            path="/my-loans"
            element={
              <ProtectedRoute>
                <MyLoansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-reservations"
            element={
              <ProtectedRoute>
                <MyReservationsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}

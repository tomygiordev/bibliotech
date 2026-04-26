import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { BookOpen, Building2, LogOut, LayoutDashboard, Users, FileBarChart, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function AdminLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  if (!user || (user.role !== 'ADMIN' && user.role !== 'LIBRARIAN')) {
    return <Navigate to="/catalog" replace />;
  }

  const adminNavItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/users', label: 'Usuarios', icon: Users },
    { to: '/admin/reports', label: 'Reportes', icon: FileBarChart },
    { to: '/admin/books', label: 'Libros', icon: BookOpen },
    { to: '/admin/branches', label: 'Sucursales', icon: Building2 },
  ];

  return (
    <div className="flex min-h-screen bg-stone-950">
      <aside className="w-64 bg-stone-900/80 backdrop-blur-xl border-r border-stone-800/50 flex flex-col">
        <div className="p-6 border-b border-stone-800/50">
          <Link to="/admin" className="flex items-center gap-3 group">
            <motion.div 
              className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LayoutDashboard className="w-5 h-5 text-amber-500" />
            </motion.div>
            <div>
              <p className="font-display text-lg text-stone-100">Admin</p>
              <p className="text-xs text-stone-500 font-sans">{user.name}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {adminNavItems.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg font-sans text-sm transition-all duration-200',
                  isActive
                    ? 'bg-amber-500/10 text-amber-500 border-l-2 border-amber-500 ml-[-2px]'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-white/5'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-800/50 space-y-1">
          <Link
            to="/catalog"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-white/5 font-sans text-sm transition-all duration-200"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Volver al catálogo</span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 font-sans text-sm transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-stone-950 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
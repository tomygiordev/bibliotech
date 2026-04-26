import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { BookOpen, User, LogOut, BookMarked } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { to: '/catalog', label: 'Catálogo', icon: BookOpen },
    { to: '/my-loans', label: 'Mis Préstamos', icon: BookMarked },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-950">
      <header className="bg-stone-900/80 backdrop-blur-xl border-b border-stone-800/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:border-amber-500/30 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <BookOpen className="w-5 h-5 text-amber-500" />
            </motion.div>
            <span className="font-display text-xl text-stone-100 tracking-tight">
              Bibliotech<span className="text-amber-500">Premium</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-sm transition-all duration-200',
                  location.pathname === to
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
              </Link>
            ))}

            {user ? (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-stone-400" />
                  </div>
                  <span className="font-sans text-sm text-stone-100 font-medium hidden sm:block">{user.name}</span>
                  {(user.role === 'ADMIN' || user.role === 'LIBRARIAN') && (
                    <Link
                      to="/admin"
                      className="badge-amber ml-1"
                    >
                      Admin
                    </Link>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm ml-4">
                Iniciar Sesión
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-stone-900/50 backdrop-blur-xl border-t border-stone-800/50 py-8 mt-12">
        <div className="container mx-auto px-6 text-left">
          <p className="text-stone-500 text-sm font-sans">
            © 2026 Bibliotech Premium. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
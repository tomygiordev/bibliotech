import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function UsersPage() {
  const roleColors: Record<string, string> = {
    ADMIN: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
    LIBRARIAN: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    MEMBER: 'bg-stone-800 text-stone-400 border border-stone-700',
  };

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    LIBRARIAN: 'Bibliotecario',
    MEMBER: 'Socio',
  };

  const mockUsers = [
    { id: '1', name: 'Administrador', email: 'admin@bibliotech.com', role: 'ADMIN', isActive: true },
    { id: '2', name: 'María López', email: 'librarian@bibliotech.com', role: 'LIBRARIAN', isActive: true },
    { id: '3', name: 'Juan Pérez', email: 'member@bibliotech.com', role: 'MEMBER', isActive: true },
  ];

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-10 max-w-xl">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 mb-3 tracking-tight">
          Gestión de Usuarios
        </h1>
        <p className="text-stone-500 font-sans">
          Administrá los usuarios del sistema
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="card p-0"
      >
        <div className="px-5 py-4 border-b border-stone-800/50 bg-stone-900/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-stone-400 font-sans text-sm">{mockUsers.length} usuarios</span>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-800/50">
              <th className="table-header">Nombre</th>
              <th className="table-header">Email</th>
              <th className="table-header">Rol</th>
              <th className="table-header">Estado</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((u, index) => (
              <motion.tr 
                key={u.id} 
                className="table-row"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <td className="table-cell font-medium">{u.name}</td>
                <td className="table-cell text-stone-400">{u.email}</td>
                <td className="table-cell">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-sans font-medium', roleColors[u.role])}>
                    {roleLabels[u.role]}
                  </span>
                </td>
                <td className="table-cell">
                  {u.isActive ? (
                    <span className="flex items-center gap-2 text-amber-500 font-sans text-sm">
                      <span className="w-2 h-2 bg-amber-500 rounded-full" />
                      Activo
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-rose-500 font-sans text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Inactivo
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
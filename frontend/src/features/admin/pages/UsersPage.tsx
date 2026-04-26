import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Search, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { usersApi, type User } from '@/lib/api';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.getAll({ q: search || undefined, limit: 100 }),
  });

  const users = data?.data?.data ?? [];

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Pick<User, 'role' | 'isActive'>> }) =>
      usersApi.update(id, payload),
    onMutate: () => setError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: () => setError('No se pudo actualizar el usuario'),
  });

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-10 max-w-xl">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 mb-3 tracking-tight">
          Gestión de Usuarios
        </h1>
        <p className="text-stone-500 font-sans">
          Administrá usuarios, roles y estados del sistema
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="card p-0"
      >
        <div className="px-5 py-4 border-b border-stone-800/50 bg-stone-900/50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-amber-500" />
            <span className="text-stone-400 font-sans text-sm">{users.length} usuarios</span>
          </div>
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Buscar nombre o email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field pl-11"
            />
          </div>
        </div>
        {error && (
          <div className="mx-5 mt-5 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-500 text-sm font-sans">
            {error}
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-800/50">
              <th className="table-header">Nombre</th>
              <th className="table-header">Email</th>
              <th className="table-header">Rol</th>
              <th className="table-header">Estado</th>
              <th className="table-header">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="table-cell text-stone-500">
                  Cargando usuarios...
                </td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="table-cell text-stone-500">
                  No se encontraron usuarios
                </td>
              </tr>
            )}
            {users.map((u: User, index: number) => (
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
                  <select
                    value={u.role}
                    onChange={(event) =>
                      updateUserMutation.mutate({
                        id: u.id,
                        payload: { role: event.target.value as User['role'] },
                      })
                    }
                    disabled={updateUserMutation.isPending}
                    className={cn(
                      'bg-transparent px-2.5 py-1 rounded-full text-xs font-sans font-medium outline-none',
                      roleColors[u.role]
                    )}
                  >
                    {Object.entries(roleLabels).map(([role, label]) => (
                      <option key={role} value={role} className="bg-stone-900 text-stone-100">
                        {label}
                      </option>
                    ))}
                  </select>
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
                <td className="table-cell">
                  <button
                    onClick={() =>
                      updateUserMutation.mutate({
                        id: u.id,
                        payload: { isActive: !u.isActive },
                      })
                    }
                    disabled={updateUserMutation.isPending}
                    className={cn(
                      'font-sans text-sm transition-colors',
                      u.isActive
                        ? 'text-rose-500 hover:text-rose-400'
                        : 'text-amber-500 hover:text-amber-400'
                    )}
                  >
                    {u.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}

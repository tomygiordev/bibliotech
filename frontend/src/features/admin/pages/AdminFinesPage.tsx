import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  Search,
  User,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  finesApi,
  type Fine,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const emptyFines: Fine[] = [];

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'PAID', label: 'Pagados' },
  { value: 'WAIVED', label: 'Perdonados' },
];

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }
  const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
  return response?.data?.error?.message ?? fallback;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return format(new Date(value), 'dd MMM yyyy', { locale: es });
}

export function AdminFinesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-fines', selectedStatus, deferredSearch],
    queryFn: () =>
      finesApi.getAll({
        status: selectedStatus || undefined,
        q: deferredSearch.trim() || undefined,
        limit: 100,
      }),
  });

  const fines = (data?.data?.data as Fine[] | undefined) ?? emptyFines;

  const summary = useMemo(() => {
    return fines.reduce(
      (current, fine) => {
        current[fine.status] = (current[fine.status] || 0) + fine.amount;
        return current;
      },
      { PENDING: 0, PAID: 0, WAIVED: 0 } as Record<string, number>
    );
  }, [fines]);

  const payMutation = useMutation({
    mutationFn: (fineId: string) => finesApi.pay(fineId),
    onMutate: () => {
      setPageError(null);
      setPageSuccess(null);
    },
    onSuccess: () => {
      setPageError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-fines'] });
      setPageSuccess('Pago registrado');
    },
    onError: (error) => {
      setPageError(getApiErrorMessage(error, 'No se pudo registrar el pago'));
      setPageSuccess(null);
    },
  });

  const waiveMutation = useMutation({
    mutationFn: (fineId: string) => finesApi.waive(fineId),
    onMutate: () => {
      setPageError(null);
      setPageSuccess(null);
    },
    onSuccess: () => {
      setPageError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-fines'] });
      setPageSuccess('Multa perdonada');
    },
    onError: (error) => {
      setPageError(getApiErrorMessage(error, 'No se pudo perdonar la multa'));
      setPageSuccess(null);
    },
  });

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-8 max-w-xl">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 tracking-tight">
          Gestión de Pagos
        </h1>
        <p className="text-stone-500 font-sans mt-2">
          {data?.data?.meta?.total ?? fines.length} registros
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-sans text-sm font-medium">Pendiente</span>
          </div>
          <p className="font-display text-3xl text-stone-100">${summary.PENDING.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 text-emerald-500 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-sans text-sm font-medium">Pagado</span>
          </div>
          <p className="font-display text-3xl text-stone-100">${summary.PAID.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 text-stone-400 mb-2">
            <XCircle className="w-4 h-4" />
            <span className="font-sans text-sm font-medium">Perdonado</span>
          </div>
          <p className="font-display text-3xl text-stone-100">${summary.WAIVED.toFixed(2)}</p>
        </div>
      </div>

      {pageError && (
        <div className="mb-5 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-500 text-sm font-sans">
          {pageError}
        </div>
      )}

      {pageSuccess && (
        <div className="mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-emerald-500 text-sm font-sans flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {pageSuccess}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="card p-0 overflow-hidden"
      >
        <div className="p-5 border-b border-stone-800/50 bg-stone-900/50 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Buscar socio, razón..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field pl-11"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="input-field"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-stone-800/50">
                <th className="table-header">Socio</th>
                <th className="table-header">Monto</th>
                <th className="table-header">Razón</th>
                <th className="table-header">Fecha</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="table-cell text-stone-500">
                    Cargando...
                  </td>
                </tr>
              )}
              {!isLoading && fines.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell text-stone-500">
                    No se encontraron registros
                  </td>
                </tr>
              )}
              {fines.map((fine, index) => (
                <motion.tr
                  key={fine.id}
                  className="table-row"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-stone-100 font-sans font-medium">{fine.user?.name}</p>
                          <p className="text-stone-600 text-xs font-sans">{fine.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-display text-lg text-stone-100">
                        ${fine.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <p className="text-stone-100 font-sans text-sm">{fine.reason}</p>
                    </td>
                    <td className="table-cell">
                      <p className="text-stone-400 font-sans text-sm">
                        {formatDate(fine.createdAt)}
                      </p>
                    </td>
                    <td className="table-cell">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-sans font-medium',
                        fine.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        fine.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        'bg-stone-800 text-stone-500 border border-stone-700'
                      )}>
                        {fine.status === 'PENDING' ? 'Pendiente' :
                         fine.status === 'PAID' ? 'Pagado' : 'Perdonado'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap items-center gap-3">
                        {fine.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => payMutation.mutate(fine.id)}
                              disabled={payMutation.isPending}
                              className="text-emerald-500 hover:text-emerald-400 font-sans text-sm transition-colors inline-flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Pagado
                            </button>
                            <button
                              onClick={() => waiveMutation.mutate(fine.id)}
                              disabled={waiveMutation.isPending}
                              className="text-stone-400 hover:text-stone-300 font-sans text-sm transition-colors inline-flex items-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" />
                              Perdonar
                            </button>
                          </>
                        )}
                        {!fine.loan && (
                          <span className="text-stone-600 font-sans text-xs">Sin préstamo asociado</span>
                        )}
                        {fine.loan && (
                          <span className="text-stone-600 font-sans text-xs">
                            Préstamo: {fine.loan.copy?.book?.title}
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
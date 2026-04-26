import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  Barcode,
  CalendarClock,
  CheckCircle,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  reservationsApi,
  type Reservation,
  type ReservationStatus,
  type ReservationStatusFilter,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const emptyReservations: Reservation[] = [];

const statusOptions: Array<{ value: ReservationStatusFilter; label: string }> = [
  { value: 'active', label: 'Activas' },
  { value: 'ready', label: 'Listas' },
  { value: 'waiting', label: 'En espera' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'expired', label: 'Vencidas' },
  { value: 'all', label: 'Todas' },
];

const statusLabels: Record<ReservationStatus, string> = {
  WAITING: 'En espera',
  READY: 'Lista',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Vencida',
};

const statusStyles: Record<ReservationStatus, string> = {
  WAITING: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  READY: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  COMPLETED: 'bg-stone-800 text-stone-400 border border-stone-700',
  CANCELLED: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
  EXPIRED: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
};

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

function getHoldLabel(reservation: Reservation) {
  if (reservation.status !== 'READY') {
    return `Posicion ${reservation.position}`;
  }

  const days = differenceInCalendarDays(new Date(reservation.expiresAt), new Date());
  if (days < 0) return 'Retiro vencido';
  if (days === 0) return 'Retira hoy';
  if (days === 1) return 'Retira mañana';
  return `${days} dias de retiro`;
}

export function AdminReservationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedStatus, setSelectedStatus] = useState<ReservationStatusFilter>('active');
  const [pageError, setPageError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', selectedStatus, deferredSearch],
    queryFn: () =>
      reservationsApi.getAll({
        status: selectedStatus,
        q: deferredSearch.trim() || undefined,
        limit: 100,
      }),
  });

  const reservations = (data?.data?.data as Reservation[] | undefined) ?? emptyReservations;

  const summary = useMemo(() => {
    return reservations.reduce(
      (current, reservation) => {
        current[reservation.status] += 1;
        return current;
      },
      {
        WAITING: 0,
        READY: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        EXPIRED: 0,
      } as Record<ReservationStatus, number>
    );
  }, [reservations]);

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) => reservationsApi.cancel(reservationId),
    onMutate: () => setPageError(null),
    onSuccess: invalidateReservations,
    onError: (error) => {
      setPageError(getApiErrorMessage(error, 'No se pudo cancelar la reserva'));
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: (reservationId: string) => reservationsApi.fulfill(reservationId, 14),
    onMutate: () => setPageError(null),
    onSuccess: invalidateReservations,
    onError: (error) => {
      setPageError(getApiErrorMessage(error, 'No se pudo entregar la reserva'));
    },
  });

  function invalidateReservations() {
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
    queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
    queryClient.invalidateQueries({ queryKey: ['loans'] });
    queryClient.invalidateQueries({ queryKey: ['copies'] });
    queryClient.invalidateQueries({ queryKey: ['books'] });
    queryClient.invalidateQueries({ queryKey: ['book'] });
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-8 max-w-xl">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 tracking-tight">
          Gestión de Reservas
        </h1>
        <p className="text-stone-500 font-sans mt-2">
          {data?.data?.meta?.total ?? reservations.length} reservas registradas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-sans text-sm font-medium">Listas</span>
          </div>
          <p className="font-display text-3xl text-stone-100">{summary.READY}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 text-yellow-500 mb-2">
            <CalendarClock className="w-4 h-4" />
            <span className="font-sans text-sm font-medium">En espera</span>
          </div>
          <p className="font-display text-3xl text-stone-100">{summary.WAITING}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 text-stone-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-sans text-sm font-medium">Históricas</span>
          </div>
          <p className="font-display text-3xl text-stone-100">
            {summary.COMPLETED + summary.CANCELLED + summary.EXPIRED}
          </p>
        </div>
      </div>

      {pageError && (
        <div className="mb-5 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-500 text-sm font-sans">
          {pageError}
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
              placeholder="Buscar socio, libro, ISBN o código..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field pl-11"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as ReservationStatusFilter)}
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
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b border-stone-800/50">
                <th className="table-header">Socio</th>
                <th className="table-header">Ejemplar</th>
                <th className="table-header">Sucursal</th>
                <th className="table-header">Cola</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="table-cell text-stone-500">
                    Cargando reservas...
                  </td>
                </tr>
              )}
              {!isLoading && reservations.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell text-stone-500">
                    No se encontraron reservas
                  </td>
                </tr>
              )}
              {reservations.map((reservation, index) => {
                const isActive = reservation.status === 'READY' || reservation.status === 'WAITING';

                return (
                  <motion.tr
                    key={reservation.id}
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
                          <p className="text-stone-100 font-sans font-medium">{reservation.user?.name}</p>
                          <p className="text-stone-600 text-xs font-sans">{reservation.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center">
                          <Barcode className="w-4 h-4 text-stone-500" />
                        </div>
                        <div>
                          <p className="text-stone-100 font-sans font-medium">{reservation.copy.book.title}</p>
                          <p className="text-stone-600 font-mono text-xs">{reservation.copy.barcode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-stone-400">{reservation.copy.branch.name}</td>
                    <td className="table-cell">
                      <p className="text-stone-100 font-sans text-sm">{getHoldLabel(reservation)}</p>
                      <p className="text-stone-600 font-sans text-xs">
                        Vence: {formatDate(reservation.expiresAt)}
                      </p>
                    </td>
                    <td className="table-cell">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-sans font-medium', statusStyles[reservation.status])}>
                        {statusLabels[reservation.status]}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap items-center gap-3">
                        {reservation.status === 'READY' && (
                          <button
                            onClick={() => fulfillMutation.mutate(reservation.id)}
                            disabled={fulfillMutation.isPending}
                            className="text-amber-500 hover:text-amber-400 font-sans text-sm transition-colors inline-flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Entregar
                          </button>
                        )}
                        {isActive && (
                          <button
                            onClick={() => cancelMutation.mutate(reservation.id)}
                            disabled={cancelMutation.isPending}
                            className="text-rose-500 hover:text-rose-400 font-sans text-sm transition-colors inline-flex items-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancelar
                          </button>
                        )}
                        {!isActive && (
                          <span className="text-stone-600 font-sans text-sm">Sin acciones</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

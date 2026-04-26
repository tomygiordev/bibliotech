import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, BookMarked, CalendarClock, CheckCircle, MapPin, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { reservationsApi, type Reservation, type ReservationStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

const emptyReservations: Reservation[] = [];

const statusLabels: Record<ReservationStatus, string> = {
  WAITING: 'En espera',
  READY: 'Lista para retirar',
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

function formatDate(value: string) {
  return format(new Date(value), 'dd MMM yyyy', { locale: es });
}

function getReservationDetail(reservation: Reservation) {
  if (reservation.status === 'READY') {
    const days = differenceInCalendarDays(new Date(reservation.expiresAt), new Date());
    if (days < 0) return 'Retiro vencido';
    if (days === 0) return 'Retirar hoy';
    if (days === 1) return 'Retirar mañana';
    return `${days} dias para retirar`;
  }

  if (reservation.status === 'WAITING') {
    return `Posicion ${reservation.position} en la cola`;
  }

  return `Actualizada el ${formatDate(reservation.createdAt)}`;
}

export function MyReservationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => reservationsApi.getMy({ status: 'active' }),
  });

  const reservations = (data?.data?.data as Reservation[] | undefined) ?? emptyReservations;

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) => reservationsApi.cancel(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book'] });
    },
  });

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-12 max-w-xl">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 mb-3 tracking-tight">
          Mis Reservas
        </h1>
        <p className="text-stone-500 font-sans text-lg">
          Reservas activas y ejemplares listos para retiro
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <motion.div
              key={index}
              className="card animate-pulse"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="h-7 bg-stone-800 rounded w-1/2 mb-4" />
              <div className="h-4 bg-stone-800 rounded w-1/3" />
            </motion.div>
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <div className="card text-center py-20">
          <BookMarked className="w-14 h-14 text-amber-500/20 mx-auto mb-5" />
          <p className="text-stone-500 font-sans text-lg mb-5">
            No tenés reservas activas
          </p>
          <a href="/catalog" className="link font-sans">
            Explorar el catálogo
          </a>
        </div>
      ) : (
        <div className="space-y-5">
          {reservations.map((reservation, index) => (
            <motion.div
              key={reservation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.08,
                duration: 0.4,
                ease: [0.175, 0.885, 0.32, 1.275],
              }}
              className={cn(
                'card transition-all duration-300',
                reservation.status === 'READY' && 'border-amber-500/25 bg-amber-500/5'
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-5">
                <div className="w-20 h-28 bg-stone-800 rounded-xl overflow-hidden flex-shrink-0">
                  {reservation.copy.book.coverUrl ? (
                    <img
                      src={reservation.copy.book.coverUrl}
                      alt={reservation.copy.book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-amber-500/5">
                      <BookMarked className="w-8 h-8 text-amber-500/30" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-display text-2xl text-stone-100 mb-1">
                        {reservation.copy.book.title}
                      </h3>
                      <p className="text-stone-500 font-mono text-xs">{reservation.copy.barcode}</p>
                    </div>
                    <span className={cn('px-3 py-1.5 rounded-full text-xs font-sans font-medium w-fit', statusStyles[reservation.status])}>
                      {statusLabels[reservation.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-5 font-sans text-sm text-stone-500 mb-5">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {reservation.copy.branch.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4" />
                      {getReservationDetail(reservation)}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="font-sans text-sm">
                      {reservation.status === 'READY' ? (
                        <p className="text-amber-500 font-medium flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Disponible hasta {formatDate(reservation.expiresAt)}
                        </p>
                      ) : (
                        <p className="text-stone-500 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Creada el {formatDate(reservation.createdAt)}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => cancelMutation.mutate(reservation.id)}
                      disabled={cancelMutation.isPending}
                      className="btn-ghost text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 text-sm font-sans inline-flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

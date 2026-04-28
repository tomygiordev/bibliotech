import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { booksApi, reservationsApi } from '@/lib/api';
import { ArrowLeft, MapPin, Calendar, User, Star, BookMarked, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reservationSuccess, setReservationSuccess] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => booksApi.getById(id!),
    enabled: !!id,
  });

  const book = data?.data?.data;

  const reserveMutation = useMutation({
    mutationFn: (copyId: string) => reservationsApi.create(copyId),
    onMutate: () => setReservationError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
    },
    onError: () => setReservationError('No se pudo crear la reserva para este ejemplar'),
  });

  const reserveByTitleMutation = useMutation({
    mutationFn: (bookId: string) => reservationsApi.createByTitle(bookId),
    onMutate: () => {
      setReservationError(null);
      setReservationSuccess(null);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['book', id] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      const reservation = data?.data?.data;
      if (reservation?.status === 'READY') {
        setReservationSuccess('¡Reserva lista! Tenés 2 días para retirar el libro.');
      } else {
        setReservationSuccess('¡Reserva creada! Te avisaremos cuando esté lista.');
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message;
      setReservationError(message || 'No se pudo crear la reserva');
    },
  });

  const availableCopies = book?.copies?.filter((c: any) => c.status === 'AVAILABLE') ?? [];

  function canReserve(status: string) {
    return status === 'AVAILABLE';
  }

  function getCopyStatusLabel(status: string) {
    if (status === 'AVAILABLE') return 'Disponible';
    if (status === 'LOANED') return 'Prestado';
    if (status === 'RESERVED') return 'Reservado';
    return status;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-10">
        <div className="card animate-pulse">
          <div className="flex flex-col md:flex-row gap-10">
            <div className="w-full md:w-64 aspect-[3/4] bg-stone-800 rounded-xl" />
            <div className="flex-1 space-y-5">
              <div className="h-10 bg-stone-800 rounded w-3/4" />
              <div className="h-5 bg-stone-800 rounded w-1/2" />
              <div className="h-5 bg-stone-800 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto px-6 py-10">
        <div className="card text-center py-16">
          <p className="text-stone-500 font-sans text-lg">Libro no encontrado</p>
          <Link to="/catalog" className="link mt-4 inline-block font-sans">
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <Link
        to="/catalog"
        className="inline-flex items-center gap-2 text-stone-400 hover:text-amber-500 mb-8 transition-colors font-sans text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
        >
          <div className="card-liquid p-4 sticky top-24">
            <div className="aspect-[3/4] bg-stone-800 rounded-xl overflow-hidden">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-amber-500/5">
                  <span className="text-7xl text-amber-500/30 font-display">
                    {book.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275], delay: 0.1 }}
        >
          <div className="space-y-4">
            <h1 className="font-display text-4xl xl:text-5xl text-stone-100 tracking-tight">
              {book.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6">
              <span className="flex items-center gap-2 text-stone-400 font-sans">
                <User className="w-4 h-4" />
                {book.author?.name}
              </span>
              {book.publishedYear && (
                <span className="flex items-center gap-2 text-stone-400 font-sans">
                  <Calendar className="w-4 h-4" />
                  {book.publishedYear}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="w-5 h-5 text-amber-500/30"
                  fill="currentColor"
                />
              ))}
              <span className="text-stone-500 font-sans text-sm ml-3">
                ({book._count?.reviews ?? 0} reseñas)
              </span>
            </div>

            {reservationSuccess && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-emerald-500 text-sm font-sans">
                <CheckCircle className="w-4 h-4" />
                {reservationSuccess}
              </div>
            )}

            {book.copies?.length > 0 && availableCopies.length > 0 && (
              accessToken ? (
                <button
                  onClick={() => reserveByTitleMutation.mutate(book.id)}
                  disabled={reserveByTitleMutation.isPending}
                  className="btn-primary w-full sm:w-auto py-3 px-6 inline-flex items-center justify-center gap-2"
                >
                  <BookMarked className="w-5 h-5" />
                  {reserveByTitleMutation.isPending ? 'Reservando...' : 'Reservar libro'}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="btn-primary w-full sm:w-auto py-3 px-6 inline-flex items-center justify-center gap-2"
                >
                  <BookMarked className="w-5 h-5" />
                  Reservar libro
                </Link>
              )
            )}
            {book.copies?.length > 0 && availableCopies.length === 0 && (
              <p className="text-stone-500 font-sans text-sm">
                No hay ejemplares disponibles. Podés hacer una reserva y te avisamos cuando se libere uno.
              </p>
            )}
          </div>

          {book.synopsis && (
            <div className="glass-panel p-6">
              <h2 className="text-lg font-display text-amber-500 mb-3">
                Sinopsis
              </h2>
              <p className="text-stone-400 leading-relaxed text-lg">
                {book.synopsis}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4">
              <p className="text-stone-500 font-sans text-xs uppercase tracking-wider mb-1">ISBN</p>
              <p className="text-stone-100 font-mono text-sm">{book.isbn}</p>
            </div>
            <div className="glass-panel p-4">
              <p className="text-stone-500 font-sans text-xs uppercase tracking-wider mb-1">Género</p>
              <p className="text-stone-100 font-sans">{book.genre?.name}</p>
            </div>
            {book.publisher && (
              <div className="glass-panel p-4">
                <p className="text-stone-500 font-sans text-xs uppercase tracking-wider mb-1">Editorial</p>
                <p className="text-stone-100 font-sans">{book.publisher}</p>
              </div>
            )}
            {book.pageCount && (
              <div className="glass-panel p-4">
                <p className="text-stone-500 font-sans text-xs uppercase tracking-wider mb-1">Páginas</p>
                <p className="text-stone-100 font-sans">{book.pageCount}</p>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-display text-stone-100 mb-4">
              Ejemplares
            </h2>
            {reservationError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-500 text-sm font-sans">
                {reservationError}
              </div>
            )}
            {book.copies?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {book.copies.map((copy: any) => (
                  <div
                    key={copy.id}
                    className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="text-stone-100 font-sans">
                          {copy.branch?.name}
                        </span>
                        <p className="text-stone-600 font-mono text-xs">{copy.barcode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-sans font-medium',
                          copy.status === 'AVAILABLE'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : copy.status === 'RESERVED'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        )}
                      >
                        {getCopyStatusLabel(copy.status)}
                      </span>
                      {canReserve(copy.status) && (
                        accessToken ? (
                          <button
                            onClick={() => reserveMutation.mutate(copy.id)}
                            disabled={reserveMutation.isPending}
                            className="btn-secondary text-sm font-sans py-2 px-4 inline-flex items-center gap-2"
                          >
                            <BookMarked className="w-4 h-4" />
                            Reservar
                          </button>
                        ) : (
                          <Link to="/login" className="btn-secondary text-sm font-sans py-2 px-4 inline-flex items-center gap-2">
                            <BookMarked className="w-4 h-4" />
                            Reservar
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 font-sans">
                No hay ejemplares disponibles en este momento
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

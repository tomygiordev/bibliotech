import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finesApi } from '@/lib/api';
import { CreditCard, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

type TabType = 'pending' | 'history';

export function MyPaymentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-fines'],
    queryFn: finesApi.getMy,
  });

  const payMutation = useMutation({
    mutationFn: (fineId: string) => finesApi.pay(fineId),
    onMutate: () => {
      setPayError(null);
      setPaySuccess(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-fines'] });
      setPaySuccess('Pago registrado correctamente');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message;
      setPayError(message || 'No se pudo procesar el pago');
    },
  });

  const fines = data?.data?.data ?? [];
  const pendingFines = fines.filter((f: any) => f.status === 'PENDING');
  const historyFines = fines.filter((f: any) => f.status !== 'PENDING');

  const displayFines = activeTab === 'pending' ? pendingFines : historyFines;

  function getStatusStyle(status: string) {
    if (status === 'PENDING') return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    if (status === 'PAID') return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    if (status === 'WAIVED') return 'bg-stone-800 text-stone-500 border border-stone-700';
    return '';
  }

  function getStatusLabel(status: string) {
    if (status === 'PENDING') return 'Pendiente';
    if (status === 'PAID') return 'Pagado';
    if (status === 'WAIVED') return 'Perdonado';
    return status;
  }

  function getStatusIcon(status: string) {
    if (status === 'PENDING') return <AlertCircle className="w-4 h-4" />;
    if (status === 'PAID') return <CheckCircle className="w-4 h-4" />;
    if (status === 'WAIVED') return <XCircle className="w-4 h-4" />;
    return null;
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-12 max-w-xl">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 mb-3 tracking-tight">
          Mi Cuenta
        </h1>
        <p className="text-stone-500 font-sans text-lg">
          Tus pagos y movimientos en la biblioteca
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('pending')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-sans transition-all',
            activeTab === 'pending'
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
          )}
        >
          Pendientes ({pendingFines.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-sans transition-all',
            activeTab === 'history'
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
          )}
        >
          Historial ({historyFines.length})
        </button>
      </div>

      {payError && (
        <div className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-500 text-sm font-sans">
          {payError}
        </div>
      )}

      {paySuccess && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-emerald-500 text-sm font-sans flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {paySuccess}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <motion.div
              key={i}
              className="card animate-pulse"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="h-20 bg-stone-800 rounded" />
            </motion.div>
          ))}
        </div>
      ) : displayFines.length === 0 ? (
        <div className="card text-center py-16">
          <CreditCard className="w-14 h-14 text-amber-500/20 mx-auto mb-5" />
          <p className="text-stone-500 font-sans text-lg mb-2">
            {activeTab === 'pending' ? 'No tenés pagos pendientes' : 'No hay historial de pagos'}
          </p>
          <p className="text-stone-600 font-sans text-sm">
            {activeTab === 'pending' ? 'Todo en orden, seguí disfrutando de la biblioteca' : 'Los pagos que realices aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayFines.map((fine: any, index: number) => (
            <motion.div
              key={fine.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
              className="card"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    fine.status === 'PENDING' ? 'bg-amber-500/10' : fine.status === 'PAID' ? 'bg-emerald-500/10' : 'bg-stone-800'
                  )}>
                    <span className={cn(
                      fine.status === 'PENDING' ? 'text-amber-500' : fine.status === 'PAID' ? 'text-emerald-500' : 'text-stone-500',
                      'font-display text-xl'
                    )}>
                      ${fine.amount}
                    </span>
                  </div>
                  <div>
                    <p className="text-stone-100 font-sans font-medium">{fine.reason}</p>
                    <p className="text-stone-500 font-sans text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(fine.createdAt), 'PP', { locale: es })}
                    </p>
                    {fine.loan && (
                      <p className="text-stone-600 font-sans text-xs mt-1">
                        Libro: {fine.loan.copy?.book?.title}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn('px-3 py-1.5 rounded-full text-xs font-sans font-medium flex items-center gap-1.5', getStatusStyle(fine.status))}>
                    {getStatusIcon(fine.status)}
                    {getStatusLabel(fine.status)}
                  </span>

                  {fine.status === 'PENDING' && (
                    <button
                      onClick={() => payMutation.mutate(fine.id)}
                      disabled={payMutation.isPending}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      {payMutation.isPending ? 'Procesando...' : 'Marcar como pagado'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
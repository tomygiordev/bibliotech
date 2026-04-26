import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loansApi } from '@/lib/api';
import { BookOpen, Clock, RotateCcw, AlertCircle, CheckCircle, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

export function MyLoansPage() {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-loans', showHistory],
    queryFn: () => loansApi.getMy({ history: showHistory }),
  });

  const renewMutation = useMutation({
    mutationFn: (loanId: string) => loansApi.renew(loanId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-loans'] }),
  });

  const loans = data?.data?.data ?? [];

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    return differenceInDays(due, new Date());
  };

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-12 max-w-xl">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 mb-3 tracking-tight">
          Mis Préstamos
        </h1>
        <p className="text-stone-500 font-sans text-lg mb-5">
          Gestionar tus préstamos activos y vencidos
        </p>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans transition-all',
            showHistory
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
          )}
        >
          <History className="w-4 h-4" />
          {showHistory ? 'Ver activos' : 'Ver historial completo'}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <motion.div 
              key={i} 
              className="card animate-pulse"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex gap-5">
                <div className="w-24 h-32 bg-stone-800 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-7 bg-stone-800 rounded w-1/2" />
                  <div className="h-4 bg-stone-800 rounded w-1/3" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : loans.length === 0 ? (
        <div className="card text-center py-20">
          <BookOpen className="w-14 h-14 text-amber-500/20 mx-auto mb-5" />
          <p className="text-stone-500 font-sans text-lg mb-5">
            No tenés préstamos activos
          </p>
          <a href="/catalog" className="link font-sans">
            Explorar el catálogo
          </a>
        </div>
      ) : (
        <div className="space-y-5">
          {loans.map((loan: any, index: number) => {
            const daysRemaining = getDaysRemaining(loan.dueDate);
            const isOverdue = daysRemaining < 0;
            const canRenew =
              loan.renewalCount < loan.maxRenewals && !isOverdue;

            return (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.08, 
                  duration: 0.4,
                  ease: [0.175, 0.885, 0.32, 1.275]
                }}
                className={cn(
                  'card transition-all duration-300',
                  isOverdue && 'border-rose-500/20 bg-rose-500/5'
                )}
              >
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="w-24 h-32 bg-stone-800 rounded-xl overflow-hidden flex-shrink-0">
                    {loan.copy?.book?.coverUrl ? (
                      <img
                        src={loan.copy.book.coverUrl}
                        alt={loan.copy.book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-amber-500/5">
                        <BookOpen className="w-8 h-8 text-amber-500/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-display text-2xl text-stone-100 mb-1">
                          {loan.copy?.book?.title}
                        </h3>
                        <p className="text-stone-500 font-sans text-sm">
                          {loan.copy?.branch?.name}
                        </p>
                      </div>
                      {isOverdue ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-full text-xs font-sans font-medium border border-rose-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Vencido
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-full text-xs font-sans font-medium border border-amber-500/20">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Activo
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-5 font-sans text-sm text-stone-500 mb-5">
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Préstamo: {format(new Date(loan.loanDate), 'PP', { locale: es })}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Vence: {format(new Date(loan.dueDate), 'PP', { locale: es })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="font-sans text-sm">
                        {isOverdue ? (
                          <p className="text-rose-500 font-medium">
                            {Math.abs(daysRemaining)} días vencido
                          </p>
                        ) : daysRemaining === 0 ? (
                          <p className="text-yellow-500 font-medium">Vence hoy</p>
                        ) : daysRemaining <= 3 ? (
                          <p className="text-yellow-500 font-medium">
                            {daysRemaining} días restantes
                          </p>
                        ) : (
                          <p className="text-stone-500">
                            {daysRemaining} días restantes
                          </p>
                        )}
                        <p className="text-stone-600 text-xs mt-1">
                          Renovaciones: {loan.renewalCount}/{loan.maxRenewals}
                        </p>
                      </div>

                      {canRenew && (
                        <button
                          onClick={() => renewMutation.mutate(loan.id)}
                          disabled={renewMutation.isPending}
                          className="btn-secondary text-sm font-sans flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Renovar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
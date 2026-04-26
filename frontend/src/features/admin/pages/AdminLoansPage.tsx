import { FormEvent, useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  Barcode,
  CheckCircle,
  Clock,
  Plus,
  RotateCcw,
  Search,
  User,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  branchesApi,
  copiesApi,
  loansApi,
  usersApi,
  type Branch,
  type Copy,
  type Loan,
  type LoanPayload,
  type LoanStatusFilter,
  type User as UserRecord,
} from '@/lib/api';
import { cn } from '@/lib/utils';

interface LoanFormState {
  userId: string;
  copyId: string;
  dueDays: string;
}

interface LoanFormModalProps {
  form: LoanFormState;
  members: UserRecord[];
  copies: Copy[];
  selectedCopy: Copy | undefined;
  isPending: boolean;
  error: string | null;
  onChange: (field: keyof LoanFormState, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

type OperationalLoanStatus = Exclude<LoanStatusFilter, 'all'>;

const emptyLoans: Loan[] = [];
const emptyMembers: UserRecord[] = [];
const emptyCopies: Copy[] = [];
const emptyBranches: Branch[] = [];

const emptyLoanForm: LoanFormState = {
  userId: '',
  copyId: '',
  dueDays: '14',
};

const statusOptions: Array<{ value: LoanStatusFilter; label: string }> = [
  { value: 'active', label: 'Activos' },
  { value: 'overdue', label: 'Vencidos' },
  { value: 'returned', label: 'Devueltos' },
  { value: 'all', label: 'Todos' },
];

const statusLabels: Record<OperationalLoanStatus, string> = {
  active: 'Activo',
  overdue: 'Vencido',
  returned: 'Devuelto',
};

const statusStyles: Record<OperationalLoanStatus, string> = {
  active: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  overdue: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
  returned: 'bg-stone-800 text-stone-400 border border-stone-700',
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
  return response?.data?.error?.message ?? fallback;
}

function getLoanStatus(loan: Loan): OperationalLoanStatus {
  if (loan.returnDate) {
    return 'returned';
  }

  return new Date(loan.dueDate) < new Date() ? 'overdue' : 'active';
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return format(new Date(value), 'dd MMM yyyy', { locale: es });
}

function getDueLabel(loan: Loan) {
  if (loan.returnDate) {
    return `Devuelto el ${formatDate(loan.returnDate)}`;
  }

  const days = differenceInCalendarDays(new Date(loan.dueDate), new Date());
  if (days < 0) return `${Math.abs(days)} dias vencido`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `${days} dias restantes`;
}

function LoanFormModal({
  form,
  members,
  copies,
  selectedCopy,
  isPending,
  error,
  onChange,
  onClose,
  onSubmit,
}: LoanFormModalProps) {
  return (
    <div className="fixed inset-0 z-[80] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-auto bg-stone-900 border border-stone-700/50 rounded-xl shadow-elevated"
      >
        <div className="sticky top-0 bg-stone-900/95 backdrop-blur-xl border-b border-stone-800 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-stone-100">Nuevo Préstamo</h2>
            <p className="text-stone-500 font-sans text-sm">Socio, ejemplar y vencimiento</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-500 text-sm font-sans">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="input-label">Socio</label>
              <select
                value={form.userId}
                onChange={(event) => onChange('userId', event.target.value)}
                className="input-field"
                required
              >
                <option value="">Seleccionar socio</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Ejemplar disponible</label>
              <select
                value={form.copyId}
                onChange={(event) => onChange('copyId', event.target.value)}
                className="input-field"
                required
              >
                <option value="">Seleccionar ejemplar</option>
                {copies.map((copy) => (
                  <option key={copy.id} value={copy.id}>
                    {copy.barcode} - {copy.book?.title} ({copy.branch?.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Sucursal</label>
              <input
                value={selectedCopy?.branch?.name ?? ''}
                className="input-field disabled:text-stone-500"
                disabled
                placeholder="Se completa al elegir ejemplar"
              />
            </div>
            <div>
              <label className="input-label">Días de préstamo</label>
              <input
                value={form.dueDays}
                onChange={(event) => onChange('dueDays', event.target.value)}
                className="input-field"
                type="number"
                min={1}
                max={60}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-stone-800 pt-5">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>{isPending ? 'Registrando...' : 'Registrar préstamo'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function AdminLoansPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedStatus, setSelectedStatus] = useState<LoanStatusFilter>('active');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<LoanFormState>(emptyLoanForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const { data: loansData, isLoading } = useQuery({
    queryKey: ['loans', selectedStatus, selectedBranch, deferredSearch],
    queryFn: () =>
      loansApi.getAll({
        status: selectedStatus,
        branchId: selectedBranch || undefined,
        q: deferredSearch.trim() || undefined,
        limit: 100,
      }),
  });

  const { data: membersData } = useQuery({
    queryKey: ['users', 'members'],
    queryFn: () => usersApi.getAll({ role: 'MEMBER', isActive: 'true', limit: 100 }),
  });

  const { data: copiesData } = useQuery({
    queryKey: ['copies', 'available'],
    queryFn: () => copiesApi.getAll({ status: 'AVAILABLE', limit: 100 }),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const loans = (loansData?.data?.data as Loan[] | undefined) ?? emptyLoans;
  const members = (membersData?.data?.data as UserRecord[] | undefined) ?? emptyMembers;
  const availableCopies = (copiesData?.data?.data as Copy[] | undefined) ?? emptyCopies;
  const branches = (branchesData?.data?.data as Branch[] | undefined) ?? emptyBranches;

  const selectedCopy = useMemo(
    () => availableCopies.find((copy) => copy.id === form.copyId),
    [availableCopies, form.copyId]
  );

  const summary = useMemo(() => {
    return loans.reduce(
      (current, loan) => {
        const status = getLoanStatus(loan);
        current[status] += 1;
        return current;
      },
      { active: 0, overdue: 0, returned: 0 } as Record<OperationalLoanStatus, number>
    );
  }, [loans]);

  const createLoanMutation = useMutation({
    mutationFn: (payload: LoanPayload) => loansApi.create(payload),
    onMutate: () => {
      setFormError(null);
      setPageError(null);
    },
    onSuccess: () => {
      invalidateCirculation();
      closeCreateModal();
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error, 'No se pudo registrar el préstamo'));
    },
  });

  const returnLoanMutation = useMutation({
    mutationFn: (loanId: string) => loansApi.return(loanId),
    onMutate: () => setPageError(null),
    onSuccess: invalidateCirculation,
    onError: (error) => {
      setPageError(getApiErrorMessage(error, 'No se pudo registrar la devolución'));
    },
  });

  const renewLoanMutation = useMutation({
    mutationFn: (loanId: string) => loansApi.renew(loanId),
    onMutate: () => setPageError(null),
    onSuccess: invalidateCirculation,
    onError: (error) => {
      setPageError(getApiErrorMessage(error, 'No se pudo renovar el préstamo'));
    },
  });

  function invalidateCirculation() {
    queryClient.invalidateQueries({ queryKey: ['loans'] });
    queryClient.invalidateQueries({ queryKey: ['my-loans'] });
    queryClient.invalidateQueries({ queryKey: ['copies'] });
    queryClient.invalidateQueries({ queryKey: ['books'] });
    queryClient.invalidateQueries({ queryKey: ['branches'] });
  }

  function openCreateModal() {
    setForm(emptyLoanForm);
    setFormError(null);
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    setForm(emptyLoanForm);
    setFormError(null);
    setIsCreateOpen(false);
  }

  function updateForm(field: keyof LoanFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCreateLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!selectedCopy) {
      setFormError('Seleccioná un ejemplar disponible');
      return;
    }

    createLoanMutation.mutate({
      userId: form.userId,
      copyId: form.copyId,
      branchId: selectedCopy.branchId,
      dueDays: Number(form.dueDays) || 14,
    });
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="max-w-xl">
          <h1 className="font-display text-4xl xl:text-5xl text-stone-100 tracking-tight">
            Gestión de Préstamos
          </h1>
          <p className="text-stone-500 font-sans mt-2">
            {loansData?.data?.meta?.total ?? loans.length} movimientos de circulación
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 font-sans">
          <Plus className="w-4 h-4" />
          <span>Nuevo Préstamo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <Clock className="w-4 h-4" />
            <span className="font-sans text-sm font-medium">Activos</span>
          </div>
          <p className="font-display text-3xl text-stone-100">{summary.active}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 text-rose-500 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-sans text-sm font-medium">Vencidos</span>
          </div>
          <p className="font-display text-3xl text-stone-100">{summary.overdue}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 text-stone-400 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-sans text-sm font-medium">Devueltos</span>
          </div>
          <p className="font-display text-3xl text-stone-100">{summary.returned}</p>
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
        <div className="p-5 border-b border-stone-800/50 bg-stone-900/50 grid grid-cols-1 lg:grid-cols-[1fr_220px_220px] gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Buscar socio, email, libro o código..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field pl-11"
            />
          </div>
          <select
            value={selectedBranch}
            onChange={(event) => setSelectedBranch(event.target.value)}
            className="input-field"
          >
            <option value="">Todas las sucursales</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as LoanStatusFilter)}
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
                <th className="table-header">Fechas</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="table-cell text-stone-500">
                    Cargando préstamos...
                  </td>
                </tr>
              )}
              {!isLoading && loans.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell text-stone-500">
                    No se encontraron préstamos
                  </td>
                </tr>
              )}
              {loans.map((loan, index) => {
                const status = getLoanStatus(loan);
                const canRenew = status === 'active' && loan.renewalCount < loan.maxRenewals;
                const canReturn = !loan.returnDate;

                return (
                  <motion.tr
                    key={loan.id}
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
                          <p className="text-stone-100 font-sans font-medium">{loan.user?.name}</p>
                          <p className="text-stone-600 text-xs font-sans">{loan.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center">
                          <Barcode className="w-4 h-4 text-stone-500" />
                        </div>
                        <div>
                          <p className="text-stone-100 font-sans font-medium">{loan.copy?.book?.title}</p>
                          <p className="text-stone-600 font-mono text-xs">
                            {loan.copy?.barcode ?? loan.copy?.book?.isbn}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-stone-400">{loan.branch?.name ?? loan.copy?.branch?.name}</td>
                    <td className="table-cell">
                      <div className="font-sans text-sm">
                        <p className="text-stone-100">Prestado: {formatDate(loan.loanDate)}</p>
                        <p className={cn('text-stone-500', status === 'overdue' && 'text-rose-500')}>
                          Vence: {formatDate(loan.dueDate)}
                        </p>
                        <p className={cn('text-xs mt-1', status === 'overdue' ? 'text-rose-500' : 'text-stone-600')}>
                          {getDueLabel(loan)}
                        </p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-sans font-medium', statusStyles[status])}>
                        {statusLabels[status]}
                      </span>
                      <p className="text-stone-600 text-xs font-sans mt-2">
                        Renovaciones: {loan.renewalCount}/{loan.maxRenewals}
                      </p>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap items-center gap-3">
                        {canRenew && (
                          <button
                            onClick={() => renewLoanMutation.mutate(loan.id)}
                            disabled={renewLoanMutation.isPending}
                            className="text-amber-500 hover:text-amber-400 font-sans text-sm transition-colors inline-flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Renovar
                          </button>
                        )}
                        {canReturn && (
                          <button
                            onClick={() => returnLoanMutation.mutate(loan.id)}
                            disabled={returnLoanMutation.isPending}
                            className="text-stone-300 hover:text-stone-100 font-sans text-sm transition-colors inline-flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Devolver
                          </button>
                        )}
                        {!canRenew && !canReturn && (
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

      {isCreateOpen && (
        <LoanFormModal
          form={form}
          members={members}
          copies={availableCopies}
          selectedCopy={selectedCopy}
          isPending={createLoanMutation.isPending}
          error={formError}
          onChange={updateForm}
          onClose={closeCreateModal}
          onSubmit={handleCreateLoan}
        />
      )}
    </div>
  );
}

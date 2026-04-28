import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  booksApi,
  branchesApi,
  copiesApi,
  type Book,
  type Branch,
  type Copy,
  type CopyPayload,
  type CopyUpdatePayload,
} from '@/lib/api';
import { Barcode, MapPin, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CopyFormState {
  barcode: string;
  bookId: string;
  branchId: string;
  status: Copy['status'];
  condition: Copy['condition'];
  zone: string;
  shelf: string;
  position: string;
}

interface CopyFormModalProps {
  mode: 'create' | 'edit';
  form: CopyFormState;
  books: Book[];
  branches: Branch[];
  isPending: boolean;
  error: string | null;
  onChange: (field: keyof CopyFormState, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const emptyCopies: Copy[] = [];
const emptyBooks: Book[] = [];
const emptyBranches: Branch[] = [];

const statusOptions: Array<{ value: Copy['status']; label: string }> = [
  { value: 'AVAILABLE', label: 'Disponible' },
  { value: 'LOANED', label: 'Prestado' },
  { value: 'RESERVED', label: 'Reservado' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'LOST', label: 'Perdido' },
  { value: 'DAMAGED', label: 'Dañado' },
];

const conditionOptions: Array<{ value: Copy['condition']; label: string }> = [
  { value: 'NEW', label: 'Nuevo' },
  { value: 'GOOD', label: 'Bueno' },
  { value: 'FAIR', label: 'Regular' },
  { value: 'POOR', label: 'Deteriorado' },
];

const statusStyles: Record<Copy['status'], string> = {
  AVAILABLE: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  LOANED: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  RESERVED: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  MAINTENANCE: 'bg-stone-700 text-stone-300 border border-stone-600',
  LOST: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
  DAMAGED: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
};

const statusLabels = Object.fromEntries(
  statusOptions.map((option) => [option.value, option.label])
) as Record<Copy['status'], string>;

const emptyCopyForm: CopyFormState = {
  barcode: '',
  bookId: '',
  branchId: '',
  status: 'AVAILABLE',
  condition: 'GOOD',
  zone: '',
  shelf: '',
  position: '',
};

function toCopyForm(copy: Copy): CopyFormState {
  return {
    barcode: copy.barcode,
    bookId: copy.bookId,
    branchId: copy.branchId,
    status: copy.status,
    condition: copy.condition,
    zone: copy.zone ?? '',
    shelf: copy.shelf ?? '',
    position: copy.position?.toString() ?? '',
  };
}

function toCreatePayload(form: CopyFormState): CopyPayload {
  return {
    barcode: form.barcode.trim(),
    bookId: form.bookId,
    branchId: form.branchId,
    condition: form.condition,
    ...(form.zone.trim() ? { zone: form.zone.trim() } : {}),
    ...(form.shelf.trim() ? { shelf: form.shelf.trim() } : {}),
    ...(form.position ? { position: Number(form.position) } : {}),
  };
}

function toUpdatePayload(form: CopyFormState): CopyUpdatePayload {
  return {
    status: form.status,
    condition: form.condition,
    zone: form.zone.trim() || null,
    shelf: form.shelf.trim() || null,
    position: form.position ? Number(form.position) : null,
  };
}

function CopyFormModal({
  mode,
  form,
  books,
  branches,
  isPending,
  error,
  onChange,
  onClose,
  onSubmit,
}: CopyFormModalProps) {
  return (
    <div className="fixed inset-0 z-[80] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-auto bg-stone-900 border border-stone-700/50 rounded-xl shadow-elevated"
      >
        <div className="sticky top-0 bg-stone-900/95 backdrop-blur-xl border-b border-stone-800 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-stone-100">
              {mode === 'create' ? 'Agregar Ejemplar' : 'Editar Ejemplar'}
            </h2>
            <p className="text-stone-500 font-sans text-sm">
              Inventario físico y ubicación
            </p>
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
              <label className="input-label">Código / Barcode</label>
              <input
                value={form.barcode}
                onChange={(event) => onChange('barcode', event.target.value)}
                className="input-field"
                disabled={mode === 'edit'}
                required
              />
            </div>
            <div>
              <label className="input-label">Estado</label>
              <select
                value={form.status}
                onChange={(event) => onChange('status', event.target.value)}
                className="input-field"
                disabled={mode === 'create'}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Libro</label>
              <select
                value={form.bookId}
                onChange={(event) => onChange('bookId', event.target.value)}
                className="input-field"
                disabled={mode === 'edit'}
                required
              >
                <option value="">Seleccionar libro</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">
                {mode === 'create' ? 'Sucursal' : 'Sucursal / Transferencia'}
              </label>
              <select
                value={form.branchId}
                onChange={(event) => onChange('branchId', event.target.value)}
                className="input-field"
                required
              >
                <option value="">Seleccionar sucursal</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Condición</label>
              <select
                value={form.condition}
                onChange={(event) => onChange('condition', event.target.value)}
                className="input-field"
              >
                {conditionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Zona</label>
              <input
                value={form.zone}
                onChange={(event) => onChange('zone', event.target.value)}
                className="input-field"
                maxLength={10}
              />
            </div>
            <div>
              <label className="input-label">Estante</label>
              <input
                value={form.shelf}
                onChange={(event) => onChange('shelf', event.target.value)}
                className="input-field"
                maxLength={10}
              />
            </div>
            <div>
              <label className="input-label">Posición</label>
              <input
                value={form.position}
                onChange={(event) => onChange('position', event.target.value)}
                className="input-field"
                type="number"
                min={1}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-stone-800 pt-5">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function AdminCopiesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingCopy, setEditingCopy] = useState<Copy | null>(null);
  const [form, setForm] = useState<CopyFormState>(emptyCopyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: copiesData, isLoading } = useQuery({
    queryKey: ['copies', selectedBranch, selectedStatus],
    queryFn: () =>
      copiesApi.getAll({
        branchId: selectedBranch || undefined,
        status: selectedStatus || undefined,
        limit: 100,
      }),
  });

  const { data: booksData } = useQuery({
    queryKey: ['books'],
    queryFn: () => booksApi.search({ limit: 100 }),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const copies = (copiesData?.data?.data as Copy[] | undefined) ?? emptyCopies;
  const books = (booksData?.data?.data as Book[] | undefined) ?? emptyBooks;
  const branches = (branchesData?.data?.data as Branch[] | undefined) ?? emptyBranches;

  const filteredCopies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return copies;
    return copies.filter((copy) =>
      copy.barcode.toLowerCase().includes(normalizedSearch) ||
      copy.book?.title.toLowerCase().includes(normalizedSearch) ||
      copy.book?.isbn.toLowerCase().includes(normalizedSearch)
    );
  }, [copies, search]);

  const createCopyMutation = useMutation({
    mutationFn: (payload: CopyPayload) => copiesApi.create(payload),
    onSuccess: () => {
      invalidateInventory();
      closeModal();
    },
    onError: () => setFormError('No se pudo crear el ejemplar. Revisá que el código no exista.'),
  });

  const updateCopyMutation = useMutation({
    mutationFn: async ({ copy, payload, targetBranchId }: { copy: Copy; payload: CopyUpdatePayload; targetBranchId: string }) => {
      await copiesApi.update(copy.id, payload);
      if (targetBranchId !== copy.branchId) {
        await copiesApi.transfer(copy.id, targetBranchId);
      }
    },
    onSuccess: () => {
      invalidateInventory();
      closeModal();
    },
    onError: () => setFormError('No se pudo actualizar el ejemplar'),
  });

  const isSaving = createCopyMutation.isPending || updateCopyMutation.isPending;

  function invalidateInventory() {
    queryClient.invalidateQueries({ queryKey: ['copies'] });
    queryClient.invalidateQueries({ queryKey: ['books'] });
    queryClient.invalidateQueries({ queryKey: ['branches'] });
  }

  function openCreateModal() {
    setForm(emptyCopyForm);
    setEditingCopy(null);
    setFormError(null);
    setModalMode('create');
  }

  function openEditModal(copy: Copy) {
    setForm(toCopyForm(copy));
    setEditingCopy(copy);
    setFormError(null);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditingCopy(null);
    setForm(emptyCopyForm);
    setFormError(null);
  }

  function updateForm(field: keyof CopyFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (modalMode === 'edit' && editingCopy) {
      updateCopyMutation.mutate({
        copy: editingCopy,
        payload: toUpdatePayload(form),
        targetBranchId: form.branchId,
      });
      return;
    }

    createCopyMutation.mutate(toCreatePayload(form));
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div className="max-w-xl">
          <h1 className="font-display text-4xl xl:text-5xl text-stone-100 tracking-tight">
            Gestión de Ejemplares
          </h1>
          <p className="text-stone-500 font-sans mt-2">
            {copiesData?.data?.meta?.total ?? copies.length} copias físicas en inventario
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 font-sans">
          <Plus className="w-4 h-4" />
          <span>Agregar Ejemplar</span>
        </button>
      </div>

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
              placeholder="Buscar por código, título o ISBN..."
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
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="input-field"
          >
            <option value="">Todos los estados</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-800/50">
              <th className="table-header">Ejemplar</th>
              <th className="table-header">Libro</th>
              <th className="table-header">Sucursal</th>
              <th className="table-header">Estado</th>
              <th className="table-header">Ubicación</th>
              <th className="table-header">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="table-cell text-stone-500">
                  Cargando ejemplares...
                </td>
              </tr>
            )}
            {!isLoading && filteredCopies.length === 0 && (
              <tr>
                <td colSpan={6} className="table-cell text-stone-500">
                  No se encontraron ejemplares
                </td>
              </tr>
            )}
            {filteredCopies.map((copy, index) => (
              <motion.tr
                key={copy.id}
                className="table-row"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Barcode className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-mono text-sm text-stone-100">{copy.barcode}</p>
                      <p className="text-stone-600 text-xs font-sans">
                        {conditionOptions.find((option) => option.value === copy.condition)?.label}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <p className="text-stone-100 font-sans font-medium">{copy.book?.title}</p>
                  <p className="text-stone-600 font-mono text-xs">{copy.book?.isbn}</p>
                </td>
                <td className="table-cell text-stone-400">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-stone-600" />
                    {copy.branch?.name}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-sans font-medium', statusStyles[copy.status])}>
                    {statusLabels[copy.status] ?? copy.status}
                  </span>
                </td>
                <td className="table-cell text-stone-400">
                  {copy.zone || copy.shelf || copy.position
                    ? [copy.zone, copy.shelf, copy.position].filter(Boolean).join(' / ')
                    : 'Sin ubicación'}
                </td>
                <td className="table-cell">
                  <button
                    onClick={() => openEditModal(copy)}
                    className="text-amber-500 hover:text-amber-400 font-sans text-sm transition-colors"
                  >
                    Editar
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {modalMode && (
        <CopyFormModal
          mode={modalMode}
          form={form}
          books={books}
          branches={branches}
          isPending={isSaving}
          error={formError}
          onChange={updateForm}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

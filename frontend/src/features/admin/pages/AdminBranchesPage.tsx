import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { branchesApi, type Branch, type BranchPayload } from '@/lib/api';
import { Plus, MapPin, Clock, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface BranchFormState {
  name: string;
  address: string;
  phone: string;
  open: string;
  close: string;
}

interface BranchFormModalProps {
  mode: 'create' | 'edit';
  form: BranchFormState;
  isPending: boolean;
  error: string | null;
  onChange: (field: keyof BranchFormState, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const emptyBranchForm: BranchFormState = {
  name: '',
  address: '',
  phone: '',
  open: '08:00',
  close: '20:00',
};

function parseSchedule(schedule: string): Pick<BranchFormState, 'open' | 'close'> {
  try {
    const parsed = JSON.parse(schedule) as { open?: string; close?: string };
    return {
      open: parsed.open ?? '08:00',
      close: parsed.close ?? '20:00',
    };
  } catch {
    return { open: '08:00', close: '20:00' };
  }
}

function toBranchForm(branch: Branch): BranchFormState {
  const schedule = parseSchedule(branch.schedule);
  return {
    name: branch.name,
    address: branch.address,
    phone: branch.phone ?? '',
    open: schedule.open,
    close: schedule.close,
  };
}

function toBranchPayload(form: BranchFormState): BranchPayload {
  return {
    name: form.name.trim(),
    address: form.address.trim(),
    ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
    schedule: JSON.stringify({
      open: form.open || '08:00',
      close: form.close || '20:00',
    }),
  };
}

function BranchFormModal({
  mode,
  form,
  isPending,
  error,
  onChange,
  onClose,
  onSubmit,
}: BranchFormModalProps) {
  return (
    <div className="fixed inset-0 z-[80] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-2xl bg-stone-900 border border-stone-700/50 rounded-xl shadow-elevated"
      >
        <div className="border-b border-stone-800 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-stone-100">
              {mode === 'create' ? 'Agregar Sucursal' : 'Editar Sucursal'}
            </h2>
            <p className="text-stone-500 font-sans text-sm">
              Ubicación e inventario
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
              <label className="input-label">Nombre</label>
              <input
                value={form.name}
                onChange={(event) => onChange('name', event.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="input-label">Teléfono</label>
              <input
                value={form.phone}
                onChange={(event) => onChange('phone', event.target.value)}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="input-label">Dirección</label>
              <input
                value={form.address}
                onChange={(event) => onChange('address', event.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="input-label">Apertura</label>
              <input
                value={form.open}
                onChange={(event) => onChange('open', event.target.value)}
                className="input-field"
                type="time"
                required
              />
            </div>
            <div>
              <label className="input-label">Cierre</label>
              <input
                value={form.close}
                onChange={(event) => onChange('close', event.target.value)}
                className="input-field"
                type="time"
                required
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

export function AdminBranchesPage() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchFormState>(emptyBranchForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const branches = data?.data?.data ?? [];

  const createBranchMutation = useMutation({
    mutationFn: (payload: BranchPayload) => branchesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      closeModal();
    },
    onError: () => setFormError('No se pudo crear la sucursal'),
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BranchPayload }) => branchesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      closeModal();
    },
    onError: () => setFormError('No se pudo actualizar la sucursal'),
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: string) => branchesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
    onError: () => setFormError('No se pudo desactivar la sucursal'),
  });

  const isSaving = createBranchMutation.isPending || updateBranchMutation.isPending;

  function openCreateModal() {
    setForm(emptyBranchForm);
    setEditingBranch(null);
    setFormError(null);
    setModalMode('create');
  }

  function openEditModal(branch: Branch) {
    setForm(toBranchForm(branch));
    setEditingBranch(branch);
    setFormError(null);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditingBranch(null);
    setForm(emptyBranchForm);
    setFormError(null);
  }

  function updateForm(field: keyof BranchFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const payload = toBranchPayload(form);

    if (modalMode === 'edit' && editingBranch) {
      updateBranchMutation.mutate({ id: editingBranch.id, payload });
      return;
    }

    createBranchMutation.mutate(payload);
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div className="max-w-xl">
          <h1 className="font-display text-4xl xl:text-5xl text-stone-100 tracking-tight">
            Gestión de Sucursales
          </h1>
          <p className="text-stone-500 font-sans mt-2">
            {branches.length} sucursales activas
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 font-sans">
          <Plus className="w-4 h-4" />
          <span>Agregar Sucursal</span>
        </button>
      </div>

      {formError && !modalMode && (
        <div className="mb-5 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-500 text-sm font-sans">
          {formError}
        </div>
      )}

      {isLoading ? (
        <div className="card text-stone-500 font-sans">Cargando sucursales...</div>
      ) : branches.length === 0 ? (
        <div className="card text-stone-500 font-sans">No hay sucursales activas</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {branches.map((branch: Branch, index: number) => {
            const schedule = parseSchedule(branch.schedule);
            return (
              <motion.div
                key={branch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.08,
                  duration: 0.4,
                  ease: [0.175, 0.885, 0.32, 1.275],
                }}
                className="card group hover:border-amber-500/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg text-stone-100">{branch.name}</h3>
                      <p className="text-stone-500 font-sans text-sm">{branch.phone || 'Sin teléfono'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal(branch)}
                    className="text-stone-500 hover:text-amber-500 font-sans text-sm transition-colors"
                  >
                    Editar
                  </button>
                </div>

                <div className="space-y-3 font-sans text-sm">
                  <p className="text-stone-400 flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-stone-600 flex-shrink-0" />
                    {branch.address}
                  </p>
                  <p className="text-stone-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {schedule.open} - {schedule.close}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-stone-800/50">
                    <span className="text-stone-500">
                      {branch._count?.loans || 0} préstamos
                    </span>
                    <span className="text-stone-500">
                      {branch._count?.copies || 0} ejemplares
                    </span>
                  </div>
                  <button
                    onClick={() => deleteBranchMutation.mutate(branch.id)}
                    disabled={deleteBranchMutation.isPending}
                    className="text-rose-500 hover:text-rose-400 font-sans text-sm transition-colors disabled:opacity-50"
                  >
                    Desactivar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {modalMode && (
        <BranchFormModal
          mode={modalMode}
          form={form}
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

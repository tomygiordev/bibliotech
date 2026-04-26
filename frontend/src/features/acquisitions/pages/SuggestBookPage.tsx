import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Send, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { acquisitionsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export function SuggestBookPage() {
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    publishedYear: '',
    reason: '',
  });

  const { data } = useQuery({
    queryKey: ['my-suggestions'],
    queryFn: acquisitionsApi.getMySuggestions,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => acquisitionsApi.createSuggestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-suggestions'] });
      setSubmitted(true);
      setForm({ title: '', author: '', isbn: '', publisher: '', publishedYear: '', reason: '' });
    },
  });

  const suggestions = data?.data?.data ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      publishedYear: form.publishedYear ? Number(form.publishedYear) : undefined,
    });
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-2xl">
      <div className="mb-10">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 mb-3 tracking-tight">
          Sugerir un libro
        </h1>
        <p className="text-stone-500 font-sans text-lg">
          No encontrás lo que buscás? Recomendanos libros para agregar a la colección
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 mb-8"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-stone-500 text-sm font-sans">Título del libro *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field w-full mt-1"
              placeholder="Ej: Cien años de soledad"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-stone-500 text-sm font-sans">Autor</label>
              <input
                type="text"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                className="input-field w-full mt-1"
                placeholder="Gabriel García Márquez"
              />
            </div>
            <div>
              <label className="text-stone-500 text-sm font-sans">ISBN</label>
              <input
                type="text"
                value={form.isbn}
                onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                className="input-field w-full mt-1"
                placeholder="978-3-16-150400-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-stone-500 text-sm font-sans">Editorial</label>
              <input
                type="text"
                value={form.publisher}
                onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                className="input-field w-full mt-1"
                placeholder="Editorial Sudamericana"
              />
            </div>
            <div>
              <label className="text-stone-500 text-sm font-sans">Año de publicación</label>
              <input
                type="number"
                value={form.publishedYear}
                onChange={(e) => setForm({ ...form, publishedYear: e.target.value })}
                className="input-field w-full mt-1"
                placeholder="1967"
              />
            </div>
          </div>

          <div>
            <label className="text-stone-500 text-sm font-sans">Por qué te interesa este libro?</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="input-field w-full mt-1"
              rows={3}
              placeholder="Me interesa porque..."
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || !form.title}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              'Enviando...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar sugerencia
              </>
            )}
          </button>
        </form>

        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-emerald-500 text-sm font-sans flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Sugerencia enviada. Te avisaremos cuando sea procesada.
          </motion.div>
        )}
      </motion.div>

      {suggestions.length > 0 && (
        <div>
          <h2 className="font-display text-2xl text-stone-100 mb-4">Mis sugerencias</h2>
          <div className="space-y-3">
            {suggestions.map((s: any) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-stone-100 font-sans font-medium">{s.title}</p>
                      <p className="text-stone-500 text-sm">{s.author || 'Autor no especificado'}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-sans',
                    s.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' :
                    s.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                    s.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500' :
                    'bg-blue-500/10 text-blue-500'
                  )}>
                    {s.status === 'PENDING' ? 'En revisión' :
                     s.status === 'APPROVED' ? 'Aprobada' :
                     s.status === 'REJECTED' ? 'Rechazada' : 'Ordenada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
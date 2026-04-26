import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { booksApi, type Book, type BookPayload } from '@/lib/api';
import { BookOpen, Plus, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface BookOption {
  id: string;
  name: string;
}

interface BookFormState {
  isbn: string;
  title: string;
  synopsis: string;
  coverUrl: string;
  publishedYear: string;
  publisher: string;
  language: string;
  pageCount: string;
  authorId: string;
  genreId: string;
}

interface BookFormModalProps {
  mode: 'create' | 'edit';
  form: BookFormState;
  authors: BookOption[];
  genres: BookOption[];
  isPending: boolean;
  error: string | null;
  onChange: (field: keyof BookFormState, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const emptyBookForm: BookFormState = {
  isbn: '',
  title: '',
  synopsis: '',
  coverUrl: '',
  publishedYear: '',
  publisher: '',
  language: 'es',
  pageCount: '',
  authorId: '',
  genreId: '',
};

const emptyBooks: Book[] = [];

function toBookForm(book: Book): BookFormState {
  return {
    isbn: book.isbn,
    title: book.title,
    synopsis: book.synopsis ?? '',
    coverUrl: book.coverUrl ?? '',
    publishedYear: book.publishedYear?.toString() ?? '',
    publisher: book.publisher ?? '',
    language: 'es',
    pageCount: '',
    authorId: book.author?.id ?? '',
    genreId: book.genre?.id ?? '',
  };
}

function toBookPayload(form: BookFormState): BookPayload {
  return {
    isbn: form.isbn.trim(),
    title: form.title.trim(),
    ...(form.synopsis.trim() ? { synopsis: form.synopsis.trim() } : {}),
    ...(form.coverUrl.trim() ? { coverUrl: form.coverUrl.trim() } : {}),
    ...(form.publishedYear ? { publishedYear: Number(form.publishedYear) } : {}),
    ...(form.publisher.trim() ? { publisher: form.publisher.trim() } : {}),
    language: form.language.trim() || 'es',
    ...(form.pageCount ? { pageCount: Number(form.pageCount) } : {}),
    authorId: form.authorId,
    genreId: form.genreId,
  };
}

function BookFormModal({
  mode,
  form,
  authors,
  genres,
  isPending,
  error,
  onChange,
  onClose,
  onSubmit,
}: BookFormModalProps) {
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
              {mode === 'create' ? 'Agregar Libro' : 'Editar Libro'}
            </h2>
            <p className="text-stone-500 font-sans text-sm">
              Catálogo bibliográfico
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
              <label className="input-label">Título</label>
              <input
                value={form.title}
                onChange={(event) => onChange('title', event.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="input-label">ISBN</label>
              <input
                value={form.isbn}
                onChange={(event) => onChange('isbn', event.target.value)}
                className="input-field"
                required
                minLength={10}
                maxLength={17}
              />
            </div>
            <div>
              <label className="input-label">Autor</label>
              <select
                value={form.authorId}
                onChange={(event) => onChange('authorId', event.target.value)}
                className="input-field"
                required
              >
                <option value="">Seleccionar autor</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Género</label>
              <select
                value={form.genreId}
                onChange={(event) => onChange('genreId', event.target.value)}
                className="input-field"
                required
              >
                <option value="">Seleccionar género</option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Editorial</label>
              <input
                value={form.publisher}
                onChange={(event) => onChange('publisher', event.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Portada URL</label>
              <input
                value={form.coverUrl}
                onChange={(event) => onChange('coverUrl', event.target.value)}
                className="input-field"
                type="url"
              />
            </div>
            <div>
              <label className="input-label">Año</label>
              <input
                value={form.publishedYear}
                onChange={(event) => onChange('publishedYear', event.target.value)}
                className="input-field"
                type="number"
                min={1000}
                max={2100}
              />
            </div>
            <div>
              <label className="input-label">Páginas</label>
              <input
                value={form.pageCount}
                onChange={(event) => onChange('pageCount', event.target.value)}
                className="input-field"
                type="number"
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Sinopsis</label>
            <textarea
              value={form.synopsis}
              onChange={(event) => onChange('synopsis', event.target.value)}
              className="input-field min-h-32 resize-y"
              maxLength={5000}
            />
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

export function AdminBooksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form, setForm] = useState<BookFormState>(emptyBookForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: () => booksApi.search({ limit: 100 }),
  });

  const { data: optionsData } = useQuery({
    queryKey: ['book-options'],
    queryFn: booksApi.getOptions,
  });

  const books = data?.data?.data ?? emptyBooks;
  const authors = optionsData?.data?.data?.authors ?? [];
  const genres = optionsData?.data?.data?.genres ?? [];

  const filteredBooks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return books;
    return books.filter((book: Book) =>
      book.title.toLowerCase().includes(normalizedSearch) ||
      book.author?.name.toLowerCase().includes(normalizedSearch)
    );
  }, [books, search]);

  const createBookMutation = useMutation({
    mutationFn: (payload: BookPayload) => booksApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      closeModal();
    },
    onError: () => setFormError('No se pudo crear el libro'),
  });

  const updateBookMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BookPayload }) => booksApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      closeModal();
    },
    onError: () => setFormError('No se pudo actualizar el libro'),
  });

  const deleteBookMutation = useMutation({
    mutationFn: (id: string) => booksApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
    onError: () => setFormError('No se pudo eliminar el libro. Revisá si tiene ejemplares asociados.'),
  });

  const isSaving = createBookMutation.isPending || updateBookMutation.isPending;

  function openCreateModal() {
    setForm(emptyBookForm);
    setEditingBook(null);
    setFormError(null);
    setModalMode('create');
  }

  function openEditModal(book: Book) {
    setForm(toBookForm(book));
    setEditingBook(book);
    setFormError(null);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditingBook(null);
    setForm(emptyBookForm);
    setFormError(null);
  }

  function updateForm(field: keyof BookFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const payload = toBookPayload(form);

    if (modalMode === 'edit' && editingBook) {
      updateBookMutation.mutate({ id: editingBook.id, payload });
      return;
    }

    createBookMutation.mutate(payload);
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div className="max-w-xl">
          <h1 className="font-display text-4xl xl:text-5xl text-stone-100 tracking-tight">
            Gestión de Libros
          </h1>
          <p className="text-stone-500 font-sans mt-2">
            {books.length} libros en el sistema
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 font-sans">
          <Plus className="w-4 h-4" />
          <span>Agregar Libro</span>
        </button>
      </div>

      {formError && !modalMode && (
        <div className="mb-5 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-500 text-sm font-sans">
          {formError}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="card p-0 overflow-hidden"
      >
        <div className="p-5 border-b border-stone-800/50 bg-stone-900/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Buscar por título o autor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field pl-11"
            />
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-800/50">
              <th className="table-header">Título</th>
              <th className="table-header">Autor</th>
              <th className="table-header">Género</th>
              <th className="table-header">Ejemplares</th>
              <th className="table-header">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="table-cell text-stone-500">
                  Cargando libros...
                </td>
              </tr>
            )}
            {!isLoading && filteredBooks.length === 0 && (
              <tr>
                <td colSpan={5} className="table-cell text-stone-500">
                  No se encontraron libros
                </td>
              </tr>
            )}
            {filteredBooks.map((book: Book, index: number) => (
              <motion.tr
                key={book.id}
                className="table-row"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <td className="table-cell">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-stone-800 rounded-lg flex items-center justify-center border border-stone-700 overflow-hidden">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-stone-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-stone-100 font-sans font-medium">{book.title}</p>
                      <p className="text-stone-600 font-mono text-xs">{book.isbn}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell text-stone-400">{book.author?.name}</td>
                <td className="table-cell">
                  <span className="badge-amber">{book.genre?.name}</span>
                </td>
                <td className="table-cell text-stone-400">{book.copies?.length || 0}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => openEditModal(book)}
                      className="text-amber-500 hover:text-amber-400 font-sans text-sm transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteBookMutation.mutate(book.id)}
                      disabled={deleteBookMutation.isPending}
                      className="text-rose-500 hover:text-rose-400 font-sans text-sm transition-colors disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {modalMode && (
        <BookFormModal
          mode={modalMode}
          form={form}
          authors={authors}
          genres={genres}
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

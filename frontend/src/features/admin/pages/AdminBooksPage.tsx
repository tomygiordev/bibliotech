import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { booksApi } from '@/lib/api';
import { BookOpen, Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export function AdminBooksPage() {
  const [search, setSearch] = useState('');
  const { data } = useQuery({
    queryKey: ['books'],
    queryFn: () => booksApi.search({ limit: 100 }),
  });

  const books = data?.data?.data ?? [];
  const filteredBooks = search 
    ? books.filter((b: any) => 
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author?.name.toLowerCase().includes(search.toLowerCase())
      )
    : books;

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
        <button className="btn-primary flex items-center gap-2 font-sans">
          <Plus className="w-4 h-4" />
          <span>Agregar Libro</span>
        </button>
      </div>

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
              onChange={(e) => setSearch(e.target.value)}
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
            {filteredBooks.map((book: any, index: number) => (
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
                  <span className="badge-amber">
                    {book.genre?.name}
                  </span>
                </td>
                <td className="table-cell text-stone-400">{book.copies?.length || 0}</td>
                <td className="table-cell">
                  <button className="text-amber-500 hover:text-amber-400 font-sans text-sm transition-colors">
                    Editar
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { booksApi } from '@/lib/api';
import { Search, Filter, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function CatalogPage() {
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showAvailable, setShowAvailable] = useState(false);

  const { data: booksData, isLoading } = useQuery({
    queryKey: ['books', search, selectedGenre, showAvailable],
    queryFn: () =>
      booksApi.search({
        q: search || undefined,
        genre: selectedGenre || undefined,
        available: showAvailable ? 'true' : undefined,
      }),
  });

  const books = booksData?.data?.data ?? [];
  const meta = booksData?.data?.meta;
  const facets = booksData?.data?.facets;

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-12 max-w-xl">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 mb-3 tracking-tight">
          Catálogo
        </h1>
        <p className="text-stone-500 font-sans text-lg">
          Explorá nuestra colección de títulos disponibles
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-72 flex-shrink-0">
          <div className="sticky top-24 space-y-4">
            <div className="glass-panel p-6">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-amber-500" />
                <h3 className="font-display text-lg text-stone-100">Filtros</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="input-label mb-3">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input
                      type="text"
                      placeholder="Título, autor..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input-field pl-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={showAvailable}
                      onChange={(e) => setShowAvailable(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-700 bg-stone-900 accent-amber-500"
                    />
                    <span className="text-stone-400 group-hover:text-stone-100 transition-colors font-sans text-sm">Solo disponibles</span>
                  </label>
                </div>

                {facets?.genres?.length > 0 && (
                  <div>
                    <label className="input-label mb-3">Géneros</label>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedGenre(null)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-sm font-sans transition-all duration-200',
                          !selectedGenre
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'text-stone-400 hover:text-stone-100 hover:bg-white/5'
                        )}
                      >
                        Todos
                      </button>
                      {facets.genres.map((genre: any) => (
                        <button
                          key={genre.id}
                          onClick={() => setSelectedGenre(genre.id)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg text-sm font-sans transition-all duration-200 flex justify-between',
                            selectedGenre === genre.id
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'text-stone-400 hover:text-stone-100 hover:bg-white/5'
                          )}
                        >
                          <span>{genre.name}</span>
                          <span className="text-stone-600">{genre.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <motion.div 
                  key={i} 
                  className="card animate-pulse"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="aspect-[3/4] bg-stone-800 rounded-xl mb-5" />
                  <div className="h-7 bg-stone-800 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-stone-800 rounded w-1/2" />
                </motion.div>
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="card text-center py-20">
              <p className="text-stone-500 font-sans text-lg">No se encontraron libros</p>
            </div>
          ) : (
            <>
              <p className="text-stone-500 font-sans mb-6">
                {meta?.total ?? 0} libros encontrados
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {books.map((book: any, index: number) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: index * 0.05, 
                      duration: 0.4,
                      ease: [0.175, 0.885, 0.32, 1.275]
                    }}
                  >
                    <Link
                      to={`/catalog/${book.id}`}
                      className="card group block hover:border-amber-500/30 transition-all duration-300"
                    >
                      <div className="aspect-[3/4] bg-stone-800 rounded-xl mb-5 overflow-hidden">
                        {book.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-amber-500/5">
                            <span className="text-5xl text-amber-500/30 font-display">
                              {book.title.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-display text-xl text-stone-100 group-hover:text-amber-500 transition-colors mb-2 line-clamp-2">
                        {book.title}
                      </h3>
                      <p className="text-stone-500 font-sans text-sm mb-4">
                        {book.author?.name}
                      </p>
                      <div className="flex items-center gap-4 font-sans text-sm text-stone-500">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {book.copies?.length ?? 0} ejemplares
                        </span>
                        {book.genre && (
                          <span className="badge-amber">
                            {book.genre.name}
                          </span>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
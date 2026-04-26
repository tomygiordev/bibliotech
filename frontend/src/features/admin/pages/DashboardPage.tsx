import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { booksApi, branchesApi } from '@/lib/api';
import { BookOpen, Users, BookMarked, TrendingUp, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export function DashboardPage() {
  const { data: booksData } = useQuery({
    queryKey: ['books'],
    queryFn: () => booksApi.search({ limit: 100 }),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const books = booksData?.data?.data ?? [];
  const branches = branchesData?.data?.data ?? [];

  const totalBooks = books.length;
  const totalCopies = books.reduce((acc: number, b: any) => acc + (b.copies?.length || 0), 0);
  const availableCopies = books.reduce(
    (acc: number, b: any) => acc + (b.copies?.filter((c: any) => c.status === 'AVAILABLE').length || 0),
    0
  );
  const totalBranches = branches.length;

  const stats = [
    { label: 'Total Libros', value: totalBooks, icon: BookOpen, color: 'text-amber-500', wide: true },
    { label: 'Ejemplares', value: totalCopies, icon: BookMarked, color: 'text-stone-400', wide: false },
    { label: 'Disponibles', value: availableCopies, icon: TrendingUp, color: 'text-amber-500', wide: false },
    { label: 'Sucursales', value: totalBranches, icon: Users, color: 'text-rose-500', wide: true },
  ];

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-10 max-w-xl">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 mb-3 tracking-tight">
          Panel de Administración
        </h1>
        <p className="text-stone-500 font-sans">
          Vista general de tu biblioteca
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {stats.map(({ label, value, icon: Icon, color, wide }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: index * 0.08, 
              duration: 0.4,
              ease: [0.175, 0.885, 0.32, 1.275]
            }}
            className={wide ? 'md:col-span-2' : ''}
          >
            <div className="stat-card group h-full">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-4xl xl:text-5xl font-display text-stone-100 mb-1`}>{value}</p>
                  <p className="text-stone-500 font-sans text-sm">{label}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ease: [0.175, 0.885, 0.32, 1.275] }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl text-stone-100">Libros Recientes</h2>
            <Link to="/admin/books" className="text-amber-500 hover:text-amber-400 font-sans text-sm transition-colors">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {books.slice(0, 5).map((book: any) => (
              <Link
                key={book.id}
                to={`/catalog/${book.id}`}
                className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl hover:bg-stone-800 transition-colors border border-transparent hover:border-stone-700/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-stone-100 font-sans font-medium">{book.title}</p>
                    <p className="text-stone-500 font-sans text-sm">{book.author?.name}</p>
                  </div>
                </div>
                <span className="text-stone-600 font-sans text-sm">{book.copies?.length || 0} ej.</span>
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl text-stone-100">Sucursales</h2>
            <Link to="/admin/branches" className="text-amber-500 hover:text-amber-400 font-sans text-sm transition-colors">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {branches.map((branch: any) => (
              <div
                key={branch.id}
                className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-stone-100 font-sans font-medium">{branch.name}</p>
                    <p className="text-stone-600 font-sans text-xs">{branch.address}</p>
                  </div>
                </div>
                <span className="text-stone-600 font-sans text-sm">{branch._count?.copies || 0} ej.</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
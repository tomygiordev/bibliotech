import { useQuery } from '@tanstack/react-query';
import { branchesApi } from '@/lib/api';
import { Plus, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export function AdminBranchesPage() {
  const { data } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const branches = data?.data?.data ?? [];

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
        <button className="btn-primary flex items-center gap-2 font-sans">
          <Plus className="w-4 h-4" />
          <span>Agregar Sucursal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {branches.map((branch: any, index: number) => (
          <motion.div
            key={branch.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: index * 0.08, 
              duration: 0.4,
              ease: [0.175, 0.885, 0.32, 1.275]
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
                  <p className="text-stone-500 font-sans text-sm">{branch.phone}</p>
                </div>
              </div>
              <button className="text-stone-500 hover:text-amber-500 font-sans text-sm transition-colors">
                Editar
              </button>
            </div>

            <div className="space-y-3 font-sans text-sm">
              <p className="text-stone-400 flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-stone-600 flex-shrink-0" />
                {branch.address}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-stone-800/50">
                <span className="text-stone-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {branch._count?.loans || 0} préstamos
                </span>
                <span className="text-stone-500">
                  {branch._count?.copies || 0} ejemplares
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ReportType = 'popularity' | 'morosity' | 'movement';
type ExportFormat = 'csv' | 'pdf';

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('popularity');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');

  const reports = [
    {
      id: 'popularity',
      title: 'Popularidad',
      description: 'Top 20 libros más prestados',
      icon: BarChart3,
      wide: true,
    },
    {
      id: 'morosity',
      title: 'Morosidad',
      description: 'Préstamos vencidos',
      icon: BarChart3,
      wide: false,
    },
    {
      id: 'movement',
      title: 'Movimiento',
      description: 'Actividad por día',
      icon: BarChart3,
      wide: false,
    },
  ];

  const handleExport = () => {
    alert(`Exportando reporte ${selectedReport} en formato ${exportFormat.toUpperCase()}`);
  };

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-10 max-w-xl">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 mb-3 tracking-tight">
          Reportes
        </h1>
        <p className="text-stone-500 font-sans">
          Estadísticas y análisis de tu biblioteca
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
          className="card"
        >
          <h2 className="font-display text-xl text-stone-100 mb-6">Seleccionar Reporte</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {reports.map(({ id, title, description, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSelectedReport(id as ReportType)}
                className={cn(
                  'p-5 rounded-xl border text-left transition-all duration-300',
                  selectedReport === id
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-stone-800 hover:border-stone-700'
                )}
              >
                <Icon className={cn(
                  'w-6 h-6 mb-3 transition-colors',
                  selectedReport === id ? 'text-amber-500' : 'text-stone-500'
                )} />
                <p className={cn(
                  'font-sans font-medium mb-1 transition-colors',
                  selectedReport === id ? 'text-stone-100' : 'text-stone-400'
                )}>
                  {title}
                </p>
                <p className="text-stone-600 font-sans text-sm">{description}</p>
              </button>
            ))}
          </div>

          <div className="border-t border-stone-800/50 pt-8">
            <h3 className="font-sans font-medium text-stone-400 mb-5">Vista Previa</h3>
            <div className="bg-stone-900/50 rounded-xl p-8 min-h-[300px] flex items-center justify-center border border-stone-800/50">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedReport}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  <BarChart3 className="w-12 h-12 text-amber-500/30 mx-auto mb-4" />
                  <p className="text-stone-500 font-sans">
                    {selectedReport === 'popularity' && 'Cargando datos de popularidad...'}
                    {selectedReport === 'morosity' && 'Cargando datos de morosidad...'}
                    {selectedReport === 'movement' && 'Cargando datos de movimiento...'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
          className="card h-fit"
        >
          <h2 className="font-display text-xl text-stone-100 mb-6">Exportar</h2>

          <div className="space-y-5">
            <div>
              <label className="input-label mb-3">Formato</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExportFormat('csv')}
                  className={cn(
                    'p-4 rounded-xl border flex items-center justify-center gap-2 font-sans text-sm transition-all duration-200',
                    exportFormat === 'csv'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-stone-800 text-stone-400 hover:border-stone-700'
                  )}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={cn(
                    'p-4 rounded-xl border flex items-center justify-center gap-2 font-sans text-sm transition-all duration-200',
                    exportFormat === 'pdf'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-stone-800 text-stone-400 hover:border-stone-700'
                  )}
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>

            <button onClick={handleExport} className="btn-primary w-full flex items-center justify-center gap-2 font-sans">
              <Download className="w-4 h-4" />
              <span>Descargar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
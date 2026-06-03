
import React from 'react';
import { ChartBarIcon } from './components/icons/ChartBarIcon';

export function ReportsPage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="bg-brand-900/50 p-12 rounded-2xl border border-brand-800 shadow-xl max-w-2xl">
            <div className="w-20 h-20 bg-brand-800 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-400">
                <ChartBarIcon className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-200 to-brand-400 mb-4">
                Reportes Históricos
            </h2>
            <p className="text-brand-300 text-lg mb-8">
                Esta página está en construcción. Próximamente podrás visualizar gráficos detallados, 
                comparativas mensuales y exportar reportes ejecutivos de todos tus hoteles.
            </p>
            <button className="px-6 py-2 bg-brand-700 text-white rounded-lg opacity-50 cursor-not-allowed">
                Próximamente
            </button>
        </div>
    </div>
  );
}

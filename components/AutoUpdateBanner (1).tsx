import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

interface AutoUpdateBannerProps {
  status: 'none' | 'available' | 'downloading' | 'downloaded';
  percent?: number;
  onRestart: () => void;
  onClose: () => void;
}

export const AutoUpdateBanner: React.FC<AutoUpdateBannerProps> = ({ status, percent, onRestart, onClose }) => {
  if (status === 'none') return null;

  return (
    <div className="bg-brand-600 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between animate-fade-in shadow-xl border-b border-brand-500 z-50">
      <div className="flex items-center gap-3 mb-2 md:mb-0">
        <div className="bg-white/20 p-2 rounded-full animate-pulse shrink-0">
            <SparklesIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold">
            {status === 'available' && "¡Nueva actualización detectada!"}
            {status === 'downloading' && "Descargando actualización..."}
            {status === 'downloaded' && "¡Actualización lista para instalar!"}
          </p>
          {status === 'downloading' && (
            <div className="w-48 h-2 bg-white/20 rounded-full mt-1 overflow-hidden">
                <div 
                    className="h-full bg-white transition-all duration-300" 
                    style={{ width: `${percent || 0}%` }}
                />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {status === 'available' && (
            <span className="text-xs text-brand-100">La descarga comenzará automáticamente...</span>
        )}
        
        {status === 'downloaded' && (
          <button 
            onClick={onRestart}
            className="bg-white text-brand-700 px-4 py-1.5 rounded-lg text-xs font-black hover:bg-brand-50 transition-all shadow-md uppercase tracking-wider scale-110"
          >
            Reiniciar y Actualizar Ahora
          </button>
        )}

        <button 
          onClick={onClose}
          className="p-1 text-white/60 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

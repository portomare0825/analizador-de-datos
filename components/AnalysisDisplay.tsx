import React, { useState } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { SimpleMarkdown } from './SimpleMarkdown';

interface AnalysisDisplayProps {
  analysis: string;
  onReset: () => void;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis, onReset }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis)
      .then(() => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000); // Revert after 2 seconds
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className="animate-fade-in space-y-6 mt-8">
      <div className="relative">
        <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Resultados del Análisis</h2>
            <p className="text-brand-300 mt-1">Información descubierta por Gemini en los datos filtrados.</p>
        </div>
         <button
            onClick={handleCopy}
            className="absolute top-0 right-0 flex items-center gap-2 px-3 py-1.5 bg-brand-700 text-brand-200 text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-opacity-50"
            title="Copiar análisis al portapapeles"
        >
            <ClipboardIcon className="w-4 h-4" />
            <span>{copyStatus === 'idle' ? 'Copiar' : '¡Copiado!'}</span>
        </button>
      </div>
      <div className="bg-brand-900/70 p-4 sm:p-6 rounded-lg border border-brand-700 max-h-[50vh] overflow-y-auto">
        <SimpleMarkdown text={analysis} />
      </div>
      <div className="text-center">
        <button
          onClick={onReset}
          className="px-6 py-2 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-opacity-50"
        >
          Volver a Analizar
        </button>
      </div>
    </div>
  );
};
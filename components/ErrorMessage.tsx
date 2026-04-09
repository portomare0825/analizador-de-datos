import React from 'react';

interface ErrorMessageProps {
  message: string;
  onReset: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onReset }) => {
  return (
    <div className="animate-fade-in text-center p-6 bg-red-900/30 border border-red-500 rounded-lg space-y-4 mt-6">
      <h3 className="text-xl font-bold text-red-400">Ocurrió un Error</h3>
      <p className="text-red-300">{message}</p>
      <button
        onClick={onReset}
        className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-300"
      >
        Intentar de Nuevo
      </button>
    </div>
  );
};

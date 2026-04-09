
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SnackbarProps {
  message: string;
  type: 'success' | 'error';
  isOpen: boolean;
  onClose: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ message, type, isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-6 z-[100000] flex justify-center pointer-events-none">
        <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border backdrop-blur-md pointer-events-auto transition-all duration-300 transform translate-y-0 ${
          type === 'success' 
            ? 'bg-green-900/95 text-green-100 border-green-700' 
            : 'bg-red-900/95 text-red-100 border-red-700'
        }`}>
            <div className={`p-1 rounded-full ${type === 'success' ? 'bg-green-800 text-green-400' : 'bg-red-800 text-red-400'}`}>
                {type === 'success' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                )}
            </div>
          <span className="font-semibold text-sm">{message}</span>
        </div>
    </div>,
    document.body
  );
};


import React, { useRef, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  requiredPrefix?: string; // Prefijo opcional, por defecto 'reservations'
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, requiredPrefix = 'reservations' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const lowerName = file.name.toLowerCase();
    const prefixLower = requiredPrefix.toLowerCase();
    
    const isXlsx = lowerName.endsWith('.xlsx');
    const isXls = lowerName.endsWith('.xls');
    const isCsv = lowerName.endsWith('.csv');

    if (!isXlsx && !isXls && !isCsv) {
        setErrorMessage('El archivo debe tener extensión .xlsx, .xls o .csv');
        return false;
    }

    // Validación dinámica basada en el prop
    if (requiredPrefix && !lowerName.startsWith(prefixLower)) {
        setErrorMessage(`El nombre del archivo debe comenzar con "${requiredPrefix}" (ej: ${requiredPrefix}_data.xlsx)`);
        return false;
    }
    
    setErrorMessage(null);
    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      if (validateFile(file)) {
        setFileName(file.name);
        onFileSelect(file);
      } else {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFileName(null);
      }
    } else {
      setFileName(null);
      setErrorMessage(null);
    }
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      if (validateFile(file)) {
        setFileName(file.name);
        onFileSelect(file);
      } else {
        setFileName(null);
      }
    } else {
      setFileName(null);
      setErrorMessage(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleUploadClick();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in">
        <div 
            onClick={handleUploadClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            className={`w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-300 ${isDragging ? 'border-brand-400 bg-brand-900/20' : 'border-brand-700 hover:border-brand-400 hover:bg-brand-800/50'} focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-opacity-50`}
        >
            <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".xlsx, .xls, .csv"
            />
            <div className="flex flex-col items-center text-brand-300">
                <UploadIcon className="w-12 h-12 mb-4" />
                <p className="font-semibold text-lg text-brand-100">
                    {fileName ? 'Archivo Seleccionado:' : 'Arrastra y suelta tu archivo aquí'}
                </p>
                {fileName ? (
                    <p className="text-brand-400 mt-1">{fileName}</p>
                ) : (
                    <p>o <span className="text-brand-400 font-semibold">haz clic para buscar</span></p>
                )}
                 <p className="text-xs mt-2 text-brand-400">
                    Se requieren archivos "{requiredPrefix}..." (.xlsx, .xls, .csv).
                 </p>
                 {errorMessage && (
                    <p className="text-red-400 text-sm mt-2 font-bold bg-red-900/20 px-3 py-1 rounded animate-fade-in">
                        Error: {errorMessage}
                    </p>
                 )}
            </div>
        </div>
    </div>
  );
};

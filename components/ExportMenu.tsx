import React, { useState, useRef, useEffect } from 'react';
import { DownloadIcon } from './icons/DownloadIcon';
import type { DataRow } from '../types';

interface ExportMenuProps {
    data: DataRow[];
    visibleColumns: string[];
    fileName: string | null;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ data, visibleColumns, fileName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const getCleanFileName = (ext: string) => {
        const base = fileName ? fileName.replace(/\.[^/.]+$/, "") : "datos_exportados";
        const date = new Date().toISOString().split('T')[0];
        return `${base}_filtrado_${date}.${ext}`;
    };

    const handleExportExcel = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
            console.error("XLSX library not found");
            return;
        }

        const exportData = data.map(row => {
            const newRow: Record<string, any> = {};
            visibleColumns.forEach(col => {
                let val = row[col];
                if (val instanceof Date) {
                    newRow[col] = val.toLocaleDateString();
                } else {
                    newRow[col] = val !== undefined && val !== null ? String(val) : "";
                }
            });
            return newRow;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos Filtrados");
        XLSX.writeFile(wb, getCleanFileName("xlsx"));
        setIsOpen(false);
    };

    const handleExportPDF = () => {
        const jspdf = (window as any).jspdf;
        if (!jspdf) {
            console.error("jsPDF library not found");
            return;
        }
        
        const { jsPDF } = jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

        const bodyData = data.map(row => {
            return visibleColumns.map(col => {
                let val = row[col];
                if (val instanceof Date) {
                    return val.toLocaleDateString();
                }
                return val !== undefined && val !== null ? String(val) : "";
            });
        });

        doc.text("Reporte de Datos Filtrados - LD Hoteles", 14, 15);
        doc.setFontSize(10);
        doc.text(`Archivo: ${fileName || 'Desconocido'} | Fecha: ${new Date().toLocaleDateString()}`, 14, 22);

        if ((doc as any).autoTable) {
            (doc as any).autoTable({
                head: [visibleColumns],
                body: bodyData,
                startY: 26,
                styles: { fontSize: 7, cellPadding: 1 },
                headStyles: { fillColor: [6, 96, 87], textColor: 255 }, // brand-900 (#066057)
                alternateRowStyles: { fillColor: [201, 209, 165] }, // brand-100 (#C9D1A5)
                theme: 'grid'
            });
            doc.save(getCleanFileName("pdf"));
        } else {
            console.error("AutoTable plugin not found on jsPDF instance");
        }

        setIsOpen(false);
    };

    return (
        <div className="relative inline-block text-left" ref={wrapperRef}>
            <div>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex items-center justify-center rounded-md border border-brand-700 shadow-sm px-4 py-2 bg-brand-700 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-900 focus:ring-brand-500 transition-colors"
                    id="export-menu"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                >
                    <DownloadIcon className="mr-2 h-5 w-5" />
                    Exportar
                </button>
            </div>

            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-brand-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10 animate-fade-in"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="export-menu"
                >
                    <div className="py-1" role="none">
                        <button
                            onClick={handleExportExcel}
                            className="w-full text-left px-4 py-2 text-sm text-brand-100 hover:bg-brand-700 hover:text-white transition-colors flex items-center"
                            role="menuitem"
                        >
                            Descargar Excel (.xlsx)
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="w-full text-left px-4 py-2 text-sm text-brand-100 hover:bg-brand-700 hover:text-white transition-colors flex items-center"
                            role="menuitem"
                        >
                            Descargar PDF (.pdf)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
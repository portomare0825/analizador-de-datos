
import React from 'react';
import type { SourceSummary, Filters } from '../types';
import { PrinterIcon } from './icons/PrinterIcon';

interface SourceSummaryDisplayProps {
  data: SourceSummary[];
  onSourceSelect: (source: string) => void;
  selectedSource: string;
  onClearSourceFilter: () => void;
  filters: Filters;
}

export const SourceSummaryDisplay: React.FC<SourceSummaryDisplayProps> = ({ data, onSourceSelect, selectedSource, onClearSourceFilter, filters }) => {
  if (!data || data.length === 0) {
    return null; // Don't render anything if there's no data
  }

  const totals = data.reduce(
    (acc, item) => {
      acc.totalRooms += item.totalRooms;
      acc.totalAdults += item.totalAdults;
      acc.totalChildren += item.totalChildren;
      return acc;
    },
    { totalRooms: 0, totalAdults: 0, totalChildren: 0 }
  );

  const handlePrint = () => {
    const jspdf = (window as any).jspdf;
    if (!jspdf) {
        console.error("jsPDF library not found");
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    // Título
    doc.setFontSize(18);
    doc.setTextColor(6, 96, 87); // brand-900
    doc.text("Resumen por Fuente - LD Hoteles", 14, 15);

    // Subtítulo con Fechas
    doc.setFontSize(10);
    doc.setTextColor(100);

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    let dateText = "Rango de Fechas: Todo el periodo";
    
    if (filters.arrivalDateStart || filters.arrivalDateEnd) {
        const start = formatDate(filters.arrivalDateStart) || 'Inicio';
        const end = formatDate(filters.arrivalDateEnd) || 'Fin';
        dateText = `Filtro de Llegada: ${start} al ${end}`;
    } else if (filters.departureDateStart || filters.departureDateEnd) {
        const start = formatDate(filters.departureDateStart) || 'Inicio';
        const end = formatDate(filters.departureDateEnd) || 'Fin';
        dateText = `Filtro de Salida: ${start} al ${end}`;
    }

    doc.text(dateText, 14, 22);
    doc.text(`Fecha de reporte: ${new Date().toLocaleDateString()}`, 14, 27);

    // Preparar datos para la tabla
    const tableBody = data.map(item => [
        item.source, 
        item.totalRooms.toString(), 
        item.totalAdults.toString(), 
        item.totalChildren.toString()
    ]);

    // Agregar fila de totales
    tableBody.push([
        'TOTAL', 
        totals.totalRooms.toString(), 
        totals.totalAdults.toString(), 
        totals.totalChildren.toString()
    ]);

    if ((doc as any).autoTable) {
        (doc as any).autoTable({
            head: [['Fuente', 'Habitaciones', 'Adultos', 'Niños']],
            body: tableBody,
            startY: 32,
            theme: 'grid',
            headStyles: { fillColor: [6, 96, 87], textColor: 255 }, // brand-900
            alternateRowStyles: { fillColor: [245, 249, 248] }, // brand-50
            footStyles: { fillColor: [225, 129, 76], textColor: 255, fontStyle: 'bold' }, // brand-500 like
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' }
            },
            didParseCell: (data: any) => {
                // Estilar la fila de totales si autoTable no usa tfoot automáticamente desde el array
                if (data.section === 'body' && data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [220, 220, 220];
                }
            }
        });
        doc.save("resumen_fuentes.pdf");
    } else {
        console.error("AutoTable plugin not found");
    }
  };

  return (
    <div className="my-6 animate-fade-in">
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">Resumen por Fuente</h3>
                <button
                    onClick={handlePrint}
                    className="text-brand-400 hover:text-white hover:bg-brand-700 p-1.5 rounded-md transition-all"
                    title="Imprimir Resumen (PDF)"
                >
                    <PrinterIcon className="w-5 h-5" />
                </button>
            </div>
            
            {selectedSource && (
                <button
                    onClick={onClearSourceFilter}
                    className="text-xs text-brand-400 hover:text-white hover:bg-brand-600/50 px-2 py-1 rounded-md transition-colors"
                    title="Limpiar filtro de fuente"
                >
                    Limpiar Filtro
                </button>
            )}
        </div>
        <div className="bg-brand-800/50 p-4 rounded-lg border border-brand-700 max-h-60 overflow-y-auto">
            <table className="w-full text-sm text-left text-brand-200">
                <thead className="text-xs text-brand-300 uppercase sticky top-0 bg-brand-800/80 backdrop-blur-sm">
                    <tr>
                        <th scope="col" className="px-4 py-2">Fuente</th>
                        <th scope="col" className="px-4 py-2 text-right">Habitaciones</th>
                        <th scope="col" className="px-4 py-2 text-right">Adultos</th>
                        <th scope="col" className="px-4 py-2 text-right">Niños</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-700">
                    {data.map((item) => (
                        <tr 
                          key={item.source} 
                          className={`hover:bg-brand-700/50 cursor-pointer transition-colors ${item.source === selectedSource ? 'bg-brand-600/40' : ''}`}
                          onClick={() => onSourceSelect(item.source)}
                        >
                            <td className="px-4 py-2 font-medium text-white whitespace-nowrap">{item.source}</td>
                            <td className="px-4 py-2 text-right">{item.totalRooms}</td>
                            <td className="px-4 py-2 text-right">{item.totalAdults}</td>
                            <td className="px-4 py-2 text-right">{item.totalChildren}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-brand-600 font-bold text-white bg-brand-800/80">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right">{totals.totalRooms}</td>
                    <td className="px-4 py-2 text-right">{totals.totalAdults}</td>
                    <td className="px-4 py-2 text-right">{totals.totalChildren}</td>
                  </tr>
                </tfoot>
            </table>
        </div>
    </div>
  );
};

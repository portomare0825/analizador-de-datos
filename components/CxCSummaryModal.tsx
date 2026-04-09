
import React, { useMemo } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDecimalUS, parseCurrency } from './DataTable';
import { DocumentTextIcon } from './icons/DocumentTextIcon';


interface CxCSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
}

interface SourceSummary {
    source: string;
    total: number;
}

function buildSummaryByType(data: any[], tipo: 'cxc' | 'intercambio'): SourceSummary[] {
    const summary: Record<string, number> = {};
    data.forEach(row => {
        const rowType = String(row['Tipo'] || row['tipo'] || '').toLowerCase().trim();
        if (rowType !== tipo) return;
        const source = row['Fuente'] || 'Desconocido';
        const amount = parseCurrency(row['Monto CxC'] || 0);
        summary[source] = (summary[source] || 0) + amount;
    });
    return Object.entries(summary)
        .map(([source, total]) => ({ source, total }))
        .sort((a, b) => b.total - a.total);
}

// Sub-table component
const SummaryTable: React.FC<{ items: SourceSummary[]; emptyLabel: string }> = ({ items, emptyLabel }) => {
    const total = items.reduce((acc, i) => acc + i.total, 0);
    return (
        <div className="rounded-xl border border-brand-800 overflow-hidden shadow-inner bg-brand-950/20">
            <table className="w-full text-sm text-left">
                <thead className="bg-brand-800 text-brand-300 uppercase text-[10px] tracking-widest">
                    <tr>
                        <th className="px-5 py-4">Fuente / Empresa</th>
                        <th className="px-5 py-4 text-right">Balance Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-800">
                    {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-brand-700/30 transition-colors text-brand-100 group">
                            <td className="px-5 py-3.5 font-medium group-hover:text-white">{item.source}</td>
                            <td className="px-5 py-3.5 text-right font-mono text-brand-400 group-hover:text-brand-300">
                                $ {formatDecimalUS(item.total)}
                            </td>
                        </tr>
                    ))}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={2} className="px-5 py-8 text-center text-brand-500 italic">
                                {emptyLabel}
                            </td>
                        </tr>
                    )}
                </tbody>
                {items.length > 0 && (
                    <tfoot className="bg-brand-800/80 text-white font-bold border-t-2 border-brand-700">
                        <tr>
                            <td className="px-5 py-4 text-brand-300">SUBTOTAL</td>
                            <td className="px-5 py-4 text-right text-lg tracking-tight">
                                $ {formatDecimalUS(total)}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
};

const formatDateDetailed = (dateVal: any) => {
    if (dateVal === null || dateVal === undefined) return 'N/A';

    // Safely convert to string for trimming and common checks
    const str = String(dateVal).trim();
    if (!str || str === 'N/A' || str === 'Invalid Date') return 'N/A';

    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return str; // Return string as-is if not parsable

    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const d = String(date.getDate()).padStart(2, '0');
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
};

const CxCSummaryModal: React.FC<CxCSummaryModalProps> = ({ isOpen, onClose, data }) => {
    const cxcSummary = useMemo(() => buildSummaryByType(data, 'cxc'), [data]);
    const intercambioSummary = useMemo(() => buildSummaryByType(data, 'intercambio'), [data]);

    const totalCxC = useMemo(() => cxcSummary.reduce((acc, i) => acc + i.total, 0), [cxcSummary]);
    const totalIntercambio = useMemo(() => intercambioSummary.reduce((acc, i) => acc + i.total, 0), [intercambioSummary]);
    const totalGeneral = totalCxC + totalIntercambio;

    const detailedDataBySource = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        data.forEach(row => {
            const source = row['Fuente'] || row['fuente'] || 'Desconocido';
            if (!grouped[source]) grouped[source] = [];
            grouped[source].push(row);
        });
        return Object.fromEntries(
            Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
        );
    }, [data]);

    const handleDownloadPDF = async () => {
        try {
            const doc = new jsPDF();
            let y = 22;

            // -- Título principal --
            doc.setFontSize(18);
            doc.setTextColor(15, 118, 110);
            doc.text('Resumen de CxC e Intercambio', 14, y);
            y += 10;

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Fecha de generación: ${new Date().toLocaleString('es-VE')}`, 14, y);
            y += 8;

            // -- Sección CxC --
            doc.setFontSize(13);
            doc.setTextColor(15, 118, 110);
            doc.text('Cuentas por Cobrar (CxC)', 14, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Fuente', 'Monto Total (USD)']],
                body: cxcSummary.length > 0
                    ? cxcSummary.map(item => [item.source, `$ ${formatDecimalUS(item.total)}`])
                    : [['Sin registros', '']],
                foot: cxcSummary.length > 0 ? [['SUBTOTAL CxC', `$ ${formatDecimalUS(totalCxC)}`]] : undefined,
                theme: 'grid',
                headStyles: { fillColor: [15, 118, 110], halign: 'center' },
                footStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            });

            y = (doc as any).lastAutoTable.finalY + 12;

            // -- Sección Intercambio --
            doc.setFontSize(13);
            doc.setTextColor(120, 60, 200);
            doc.text('Intercambio', 14, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Fuente', 'Monto Total (USD)']],
                body: intercambioSummary.length > 0
                    ? intercambioSummary.map(item => [item.source, `$ ${formatDecimalUS(item.total)}`])
                    : [['Sin registros', '']],
                foot: intercambioSummary.length > 0 ? [['SUBTOTAL Intercambio', `$ ${formatDecimalUS(totalIntercambio)}`]] : undefined,
                theme: 'grid',
                headStyles: { fillColor: [120, 60, 200], halign: 'center' },
                footStyles: { fillColor: [120, 60, 200], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            });

            y = (doc as any).lastAutoTable.finalY + 12;

            // -- Total General --
            autoTable(doc, {
                startY: y,
                body: [['TOTAL GENERAL', `$ ${formatDecimalUS(totalGeneral)}`]],
                theme: 'grid',
                bodyStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right' } },
            });

            // --- DETALLE POR FUENTE (Nuevas Hojas) ---
            if (data.length > 0) {
                doc.addPage();
                y = 20;
                doc.setFontSize(16);
                doc.setTextColor(30, 41, 59);
                doc.text('Desglose Detallado por Fuente', 14, y);
                y += 10;

                Object.entries(detailedDataBySource).forEach(([source, rows]) => {
                    // Si queda poco espacio para el título y la tabla, nueva página
                    if (y > 230) {
                        doc.addPage();
                        y = 20;
                    }

                    doc.setFontSize(12);
                    doc.setTextColor(15, 118, 110);
                    doc.text(`Fuente: ${source}`, 14, y);
                    y += 5;

                    autoTable(doc, {
                        startY: y,
                        head: [['F. Llegada', 'F. Salida', 'Reserva', 'Huésped', 'Descripción', 'Tipo', 'Monto (USD)']],
                        body: (rows as any[]).map(r => [
                            formatDateDetailed(r['Fecha de llegada'] || r['fecha_in'] || ''),
                            formatDateDetailed(r['Salida'] || r['fecha_out'] || ''),
                            String(r['Numero de la reserva'] || r['reserva_id'] || 'N/A'),
                            String(r['Huesped'] || r['huesped'] || r['Nombre'] || 'N/A'),
                            r['descripcion'] || 'Sin descripción',
                            String(r['Tipo'] || '').toUpperCase(),
                            `$ ${formatDecimalUS(parseCurrency(r['monto_cxc'] || r['monto'] || 0))}`
                        ]),
                        theme: 'striped',
                        headStyles: { fillColor: [51, 65, 85], halign: 'center', fontSize: 7 },
                        bodyStyles: { fontSize: 7 },
                        columnStyles: { 
                            4: { cellWidth: 35 }, // Reducir un poco la descripción
                            6: { halign: 'right' } 
                        },
                        margin: { left: 5, right: 5 },
                        styles: { cellPadding: 2, overflow: 'linebreak' },
                    });

                    y = (doc as any).lastAutoTable.finalY + 15;
                });
            }

            doc.save(`Reporte_CxC_Detallado_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('[CxCSummaryModal] Error generando PDF:', err);
            alert('Error al generar el PDF detallado. Revisa la consola.');
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-brand-900 border border-brand-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-brand-800 flex items-center justify-between bg-brand-800/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-800 rounded-xl text-brand-400 border border-brand-700">
                            <DocumentTextIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-tight">Resumen por Fuentes</h2>
                            <p className="text-xs text-brand-400">Separado por tipo: CxC e Intercambio</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-brand-700 rounded-full transition-all text-brand-400 hover:text-white active:scale-90"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-brand-700 scrollbar-track-transparent">
                    {/* CxC Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="inline-block w-3 h-3 rounded-full bg-brand-500"></span>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-brand-300">Cuentas por Cobrar (CxC)</h3>
                        </div>
                        <SummaryTable items={cxcSummary} emptyLabel="No hay registros de CxC." />
                    </div>

                    {/* Intercambio Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="inline-block w-3 h-3 rounded-full bg-purple-500"></span>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400">Intercambio</h3>
                        </div>
                        <SummaryTable items={intercambioSummary} emptyLabel="No hay registros de Intercambio." />
                    </div>

                    {/* Grand Total */}
                    {(cxcSummary.length > 0 || intercambioSummary.length > 0) && (
                        <div className="rounded-xl bg-brand-800/60 border border-brand-700 flex justify-between items-center px-6 py-4">
                            <span className="font-bold text-brand-200 text-sm uppercase tracking-widest">Total General</span>
                            <span className="font-mono font-bold text-white text-xl">$ {formatDecimalUS(totalGeneral)}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-brand-800 flex justify-end gap-3 bg-brand-950/40">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={cxcSummary.length === 0 && intercambioSummary.length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/40 disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                        </svg>
                        Exportar PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-brand-800 hover:bg-brand-700 text-white font-bold rounded-xl transition-all border border-brand-700 active:scale-95"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CxCSummaryModal;

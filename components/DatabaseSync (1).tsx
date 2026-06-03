

import React, { useState } from 'react';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { CloseIcon } from './icons/CloseIcon';
import { sendDataToSupabase, checkAndEmptyTable } from '../services/supabaseService';
import type { DataRow } from '../types';

interface DatabaseSyncProps {
    data: DataRow[];
    visibleColumns: string[];
    hotelType?: string | null;
    tableName?: string;
    conflictKey?: string;
    columnMapping?: Record<string, string> | null;
    replaceExisting?: boolean;
    onSuccess?: () => void; // Callback para limpiar estado padre
}

// Función auxiliar para normalizar claves
const normalizeKey = (key: string): string => {
    if (/^[a-z0-9_]+$/.test(key)) return key;
    return key
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s_]/g, '')
        .trim()
        .replace(/\s+/g, '_');
};

export const DatabaseSync: React.FC<DatabaseSyncProps> = ({
    data,
    visibleColumns,
    hotelType,
    columnMapping,
    tableName: tableNameOverride,
    conflictKey: conflictKeyOverride,
    replaceExisting = false,
    onSuccess
}) => {
    // ... state ...
    const [isOpen, setIsOpen] = useState(false);
    // ... constants (removidos url y apiKey por seguridad y uso de cliente centralizado) ...

    // ... derived state ...
    const targetTable = tableNameOverride || (hotelType === 'Palm' ? 'reservaspalm' : 'reservas');
    const targetConflictKey = conflictKeyOverride || 'numero_de_la_reserva';

    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [resultSummary, setResultSummary] = useState<{ success: number; inserted: number; updated: number; errors: number; lastError?: string; lastErrorCode?: string } | null>(null);

    const handleOpen = () => setIsOpen(true);

    const handleClose = () => {
        if (status === 'sending' && progress.current < progress.total) return;

        // Si fue exitoso, notificamos al padre para que limpie
        const wasSuccess = status === 'success';

        setIsOpen(false);
        setStatus('idle');
        setResultSummary(null);
        setProgress({ current: 0, total: 0 });

        if (wasSuccess && onSuccess) {
            onSuccess();
        }
    };

    const handleSync = async () => {
        // ... (existing logic unchanged) ...
        if (data.length === 0) {
            alert("No hay datos para enviar.");
            return;
        }

        if (!targetTable.trim()) {
            alert("Error de configuración interna. Faltan credenciales.");
            return;
        }

        setStatus('sending');
        setProgress({ current: 0, total: data.length });

        // Helper para obtener el nombre de la columna en DB a partir del nombre en App
        const getDbKey = (appKey: string): string | null => {
            if (columnMapping && columnMapping[appKey]) {
                return columnMapping[appKey];
            }
            const normalized = normalizeKey(appKey);
            if (normalized === 'estado_1' || normalized === 'estado_de_la_habitacion') return null;

            if (appKey === 'Estado de la Reserva') return 'estado_de_la_reserva';
            if (normalized === 'estado') return 'estado_de_la_reserva';
            if (normalized === 'estadodelareserva') return 'estado_de_la_reserva';

            return normalized;
        };

        const columnsToSyncInfo = visibleColumns
            .map(col => ({ appKey: col, dbKey: getDbKey(col) }))
            .filter((item): item is { appKey: string, dbKey: string } => item.dbKey !== null);

        const mappedData = data.map(row => {
            const newRow: DataRow = {};
            columnsToSyncInfo.forEach(({ appKey, dbKey }) => {
                newRow[dbKey] = row[appKey];
            });
            return newRow;
        });

        try {
            if (replaceExisting) {
                const emptyResult = await checkAndEmptyTable(targetTable, targetConflictKey || 'id');
                if (!emptyResult.success) {
                    throw new Error(emptyResult.message || "Error desconocido al limpiar la tabla.");
                }
            }

            const result = await sendDataToSupabase(
                targetTable,
                mappedData,
                columnsToSyncInfo.map(c => c.dbKey),
                (current, total) => setProgress({ current, total }),
                targetConflictKey
            );
            setResultSummary(result);
            setStatus('success');
        } catch (error) {
            console.error(error);
            setStatus('error');
            setResultSummary({
                success: 0,
                inserted: 0,
                updated: 0,
                errors: mappedData.length,
                lastError: error instanceof Error ? error.message : "Error crítico en el proceso."
            });
        }
    };

    const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="inline-flex items-center justify-center rounded-md border border-brand-700 shadow-sm px-4 py-2 bg-brand-800 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-900 focus:ring-brand-500 transition-colors"
            >
                <DatabaseIcon className="mr-2 h-5 w-5" />
                {replaceExisting ? 'Reemplazar BD' : 'Integrar a BD'}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-4 p-4 bg-brand-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-brand-900 border border-brand-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto">

                        <div className="flex justify-between items-center p-4 border-b border-brand-800 bg-brand-900/80">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <DatabaseIcon className={`w-5 h-5 ${replaceExisting ? 'text-red-400' : 'text-green-400'}`} />
                                {replaceExisting ? 'Reemplazo Total de Datos' : 'Integrar Datos a la Base'}
                            </h3>
                            <button onClick={handleClose} className="text-brand-400 hover:text-white transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {status === 'idle' && (
                                <div className="space-y-6">
                                    <div className="text-center space-y-2">
                                        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-brand-800 mb-4 ${replaceExisting ? 'text-red-500' : 'text-brand-400'}`}>
                                            <DatabaseIcon className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-xl font-medium text-white">Confirma la operación</h4>
                                        <p className="text-brand-300">
                                            Se van a procesar <strong className="text-white text-lg">{data.length}</strong> registros hacia la tabla <strong className="text-brand-400">{targetTable}</strong>.
                                        </p>

                                        {replaceExisting ? (
                                            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-xs text-red-200/90 text-left mt-4 shadow-lg shadow-red-900/10">
                                                <p className="font-bold text-red-400 text-sm mb-2 flex items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                                    </svg>
                                                    ADVERTENCIA: REEMPLAZO TOTAL
                                                </p>
                                                <p className="leading-relaxed">
                                                    Se <b>BORRARÁ TODO</b> el contenido actual de <b>{targetTable}</b> y se sustituirá por los datos de este archivo.
                                                    <br />
                                                    ¡Esta acción no se puede deshacer!
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-xs text-blue-200/90 text-left mt-2">
                                                <p className="font-semibold mb-1 text-blue-400">ℹ️ Modo Integración:</p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    <li>Los nuevos registros se <b>agregarán</b> al final de la tabla.</li>
                                                    <li>Si ya existen registros, <b>NO se borrarán</b> ni modificarán.</li>
                                                    <li>Se permite tener múltiples registros con el mismo número de reserva (cargos múltiples).</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 flex gap-3">
                                        <button
                                            onClick={handleClose}
                                            className="flex-1 py-3 px-4 bg-brand-800 hover:bg-brand-700 text-brand-200 font-semibold rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSync}
                                            className={`flex-1 py-3 px-4 font-bold rounded-lg transition-all shadow-lg transform hover:-translate-y-0.5
                                                ${replaceExisting
                                                    ? 'bg-red-700 hover:bg-red-600 text-white'
                                                    : 'bg-blue-700 hover:bg-blue-600 text-white'
                                                }
                                            `}
                                        >
                                            {replaceExisting ? 'Sí, Reemplazar' : 'Sí, Integrar Datos'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {status === 'sending' && (
                                <div className="text-center py-8 space-y-4">
                                    <div className="relative w-full h-4 bg-brand-800 rounded-full overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300 ease-out"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-brand-200 font-medium animate-pulse">
                                        {replaceExisting && percentage === 0 ? 'Limpiando base de datos...' : `Procesando ${progress.current} de ${progress.total} filas...`}
                                    </p>
                                </div>
                            )}

                            {(status === 'success' || status === 'error') && resultSummary && (
                                <div className="text-center py-4 space-y-4">
                                    {resultSummary.errors === 0 ? (
                                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-900/50 text-green-400 mb-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-900/50 text-yellow-400 mb-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                            </svg>
                                        </div>
                                    )}

                                    <h4 className="text-xl font-bold text-white">
                                        {status === 'success' ? (resultSummary.errors === 0 ? '¡Integración Exitosa!' : 'Integración Completada con Alertas') : 'Error en la Operación'}
                                    </h4>

                                    {/* NUEVO: Desglose detallado */}
                                    <div className="grid grid-cols-3 gap-2 bg-brand-800 rounded-lg p-4">
                                        <div className="text-center border-r border-brand-700">
                                            <p className="text-brand-400 uppercase text-[10px] font-bold">Agregados</p>
                                            <p className="text-2xl text-green-400 font-bold">{resultSummary.inserted}</p>
                                        </div>
                                        <div className="text-center border-r border-brand-700">
                                            <p className="text-brand-400 uppercase text-[10px] font-bold">Modificados</p>
                                            <p className="text-2xl text-blue-400 font-bold">{resultSummary.updated}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-brand-400 uppercase text-[10px] font-bold">Fallidos</p>
                                            <p className={`text-2xl font-bold ${resultSummary.errors > 0 ? 'text-yellow-400' : 'text-brand-200'}`}>
                                                {resultSummary.errors}
                                            </p>
                                        </div>
                                    </div>

                                    {resultSummary.lastError && (
                                        <div className="text-xs text-brand-300 mt-2 px-2 text-left bg-brand-950/30 p-3 rounded border border-brand-800">
                                            <p className="mb-2 font-semibold text-red-400">Detalle del error:</p>
                                            <p className="text-red-300 font-mono break-all">
                                                {resultSummary.lastError}
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleClose}
                                        className="w-full mt-4 py-2 px-4 bg-brand-700 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors"
                                    >
                                        {status === 'success' ? 'Finalizar y Limpiar' : 'Cerrar Ventana'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

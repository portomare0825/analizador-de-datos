
import React, { useState, useEffect, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataTable } from './components/DataTable';
import { Spinner } from './components/Spinner';
import { ErrorMessage } from './components/ErrorMessage';
import { BanknotesIcon } from './components/icons/BanknotesIcon';
import { SearchIcon } from './components/icons/SearchIcon';
import { CloseIcon } from './components/icons/CloseIcon';
import { BuildingOfficeIcon } from './components/icons/BuildingOfficeIcon';
import { CalendarIcon } from './components/icons/CalendarIcon';
import { parseFileToJSON } from './utils/fileParser';
import { DatabaseSync } from './components/DatabaseSync';
import { fetchDataFromSupabase, deleteTransaction, deleteTransactionsByRange, type FetchFilters } from './services/supabaseService';
import { useHotel } from './contexts/HotelContext';
import type { DataRow } from './types';

// Mapeo de campos del Excel (Posibles Headers) -> Campos de Supabase (transacciones)
const TRANSACTION_COLUMNS_CONFIG = [
    { dbKey: 'fecha_hora', keywords: ['fecha hora', 'timestamp', 'fecha de transaccion', 'date time', 'fecha'] }, // 'fecha' genérico suele ser esta
    { dbKey: 'fecha_servicio', keywords: ['fecha servicio', 'fecha del servicio', 'service date', 'fecha serv', 'f. servicio'] },
    { dbKey: 'num_reserva', keywords: ['reserva', 'booking', 'referencia', 'folio', 'numero reserva'] },
    { dbKey: 'habitacion', keywords: ['habitacion', 'room', 'hab', 'unit'] },
    { dbKey: 'nombre', keywords: ['nombre', 'cliente', 'huesped', 'guest name'] },
    { dbKey: 'apellido', keywords: ['apellido', 'last name'] },
    { dbKey: 'descripcion', keywords: ['descripcion', 'descripción', 'detalle', 'concepto', 'description', 'trx desc', 'desc'] },
    { dbKey: 'cantidad', keywords: ['cantidad', 'monto', 'importe', 'valor', 'amount'] },
    { dbKey: 'debito', keywords: ['debito', 'débito', 'cargo', 'debe', 'debit'] },
    { dbKey: 'credito', keywords: ['credito', 'crédito', 'abono', 'haber', 'credit'] },
    { dbKey: 'usuario', keywords: ['usuario', 'cajero', 'user', 'cashier'] },
    { dbKey: 'codigo', keywords: ['codigo', 'code', 'trx code'] },
    { dbKey: 'codigo_transaccion', keywords: ['codigo transaccion', 'transaction code'] },
    { dbKey: 'check_in', keywords: ['check in', 'llegada', 'in date'] },
    { dbKey: 'check_out', keywords: ['check out', 'salida', 'out date'] },
    { dbKey: 'estado', keywords: ['estado', 'status'] },
    { dbKey: 'nota', keywords: ['nota', 'observacion', 'remark'] },
];

export function TransactionsPage() {
    // Usar contexto compartido para sincronizar con TaxAuditPage
    const { hotel, setHotel } = useHotel();
    const TABLE_NAME = `transacciones_${hotel}`;

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [data, setData] = useState<DataRow[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [dbMapping, setDbMapping] = useState<Record<string, string>>({});
    const [isDbSource, setIsDbSource] = useState(false);
    const [reservationSearch, setReservationSearch] = useState('');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

    // Estado para el modal de confirmación de borrado
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'single' | 'date'; row?: DataRow | null; dateRange?: { start: string, end: string } | null }>({
        isOpen: false,
        type: 'single',
        row: null,
        dateRange: null
    });

    // Credenciales centralizadas en supabaseClient

    // Cargar datos de la base de datos al montar el componente (y cuando cambien los filtros)
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Resetear estado al cambiar de tabla o filtros para feedback visual
                setStatus('loading');

                // Construir filtros de Supabase para búsqueda en el servidor
                const supabaseFilters: FetchFilters = {};
                
                if (dateRange.start) {
                    supabaseFilters.gte = supabaseFilters.gte || {};
                    // Usar la fecha pura (YYYY-MM-DD) para columnas tipo DATE
                    supabaseFilters.gte['fecha_servicio'] = dateRange.start;
                }
                if (dateRange.end) {
                    supabaseFilters.lte = supabaseFilters.lte || {};
                    // Usar la fecha pura (YYYY-MM-DD) para columnas tipo DATE
                    supabaseFilters.lte['fecha_servicio'] = dateRange.end;
                }
                if (reservationSearch) {
                    supabaseFilters.ilike = supabaseFilters.ilike || {};
                    supabaseFilters.ilike['num_reserva'] = reservationSearch;
                }

                const dbData = await fetchDataFromSupabase(TABLE_NAME, 20000, supabaseFilters);
                setIsDbSource(true);
                if (dbData && dbData.length > 0) {
                    setData(dbData);
                    // Usamos las llaves del primer objeto como headers
                    setHeaders(Object.keys(dbData[0]));
                    setFileName(`Datos actuales (${hotel === 'plus' ? 'Plus' : 'Palm'})`);
                    setStatus('success');
                } else {
                    setData([]);
                    // Si no hay datos en la DB para este hotel/filtro, nos quedamos en 'success' 
                    // para que el usuario pueda seguir usando los filtros y vea que hay 0 resultados.
                    // Usamos headers por defecto para que la tabla se vea consistente.
                    setHeaders(['ID', 'USUARIO', 'FECHA_HORA', 'FECHA_SERVICIO', 'HABITACION', 'NOMBRE', 'APELLIDO', 'NUM_RESERVA', 'CODIGO', 'CODIGO_TRANSACCION', 'CANTIDAD', 'DEBITO', 'CREDITO']);
                    setFileName(`Sin datos en ${hotel === 'plus' ? 'Plus' : 'Palm'}`);
                    setStatus('success');
                }
            } catch (e: any) {
                console.error("Error cargando datos en TransactionsPage:", e);
                setStatus('error');
                const errMsg = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
                setError(`Error al cargar datos en [${TABLE_NAME}]: ${errMsg}`);
            }
        };
        loadInitialData();
    }, [TABLE_NAME, hotel, dateRange.start, dateRange.end, reservationSearch]);

    // --- Helpers para limpieza de datos ---
    const cleanValue = (val: any, dbKey: string): any => {
        const isDate = ['fecha_servicio', 'check_in', 'check_out'].includes(dbKey);
        const isTimestamp = ['fecha_hora', 'created_at'].includes(dbKey);
        const isNumeric = ['cantidad', 'debito', 'credito'].includes(dbKey);

        if (val === undefined || val === null || val === '') return null;

        // 1. Limpieza Numérica
        if (isNumeric) {
            if (typeof val === 'number') return val;
            let str = String(val).trim();

            // Eliminar símbolos de moneda comunes
            // FIX: Usamos un regex específico para no borrar puntos decimales accidentalmente
            str = str.replace(/[Bs\.$€£¥]/g, (match) => match === '.' ? '.' : '').trim();

            // Heurística para formato europeo (1.234,56) vs US (1,234.56)
            const lastDot = str.lastIndexOf('.');
            const lastComma = str.lastIndexOf(',');

            // Eliminar todo lo que no sea número, punto, coma o signo negativo
            let cleanStr = str.replace(/[^0-9.,-]/g, '');

            // Si la última coma está después del último punto, asumimos formato europeo (coma decimal)
            // Ejemplo: 1.000,50 -> lastComma > lastDot. 
            if (lastComma > lastDot && lastComma > -1) {
                cleanStr = cleanStr.replace(/\./g, '').replace(/,/g, '.');
            } else {
                // Formato US o sin separadores miles: 1,000.50 -> Eliminar comas
                cleanStr = cleanStr.replace(/,/g, '');
            }

            const parsed = parseFloat(cleanStr);
            return isNaN(parsed) ? null : parsed;
        }

        // 2. Limpieza de Fechas
        if (isDate || isTimestamp) {
            // CASO ESPECIAL: Para columnas tipo DATE (fecha_servicio, check_in, check_out) 
            // que vienen de Supabase como string 'YYYY-MM-DD', las devolvemos tal cual
            // para evitar que el constructor Date() las desplace por zona horaria.
            if (isDate && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
                return val.trim();
            }

            let date: Date | null = null;

            if (val instanceof Date) {
                date = new Date(val);
            } else if (typeof val === 'number') {
                // Serial de Excel (días desde 1900)
                const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                date = new Date(excelEpoch.getTime() + val * 86400000);
            } else if (typeof val === 'string') {
                const trimmed = val.trim();

                // Regex potente para DD/MM/YYYY HH:MM:SS (Formato Texto Excel común en LATAM/EU)
                const latamRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?(?:\s*(AM|PM|am|pm))?$/;
                const match = trimmed.match(latamRegex);

                if (match) {
                    const day = parseInt(match[1], 10);
                    const month = parseInt(match[2], 10) - 1;
                    const year = parseInt(match[3], 10);

                    let hour = match[4] ? parseInt(match[4], 10) : 0;
                    const min = match[5] ? parseInt(match[5], 10) : 0;
                    const sec = match[6] ? parseInt(match[6], 10) : 0;
                    const ampm = match[7];

                    if (ampm) {
                        const isPM = ampm.toUpperCase() === 'PM';
                        const isAM = ampm.toUpperCase() === 'AM';
                        if (isPM && hour < 12) hour += 12;
                        if (isAM && hour === 12) hour = 0;
                    }

                    const d = new Date(year, month, day, hour, min, sec);
                    if (!isNaN(d.getTime())) date = d;

                } else {
                    // Fallback: constructor nativo para timestamps ISO con hora
                    const d = new Date(trimmed);
                    if (!isNaN(d.getTime())) date = d;
                }
            }

            if (date && !isNaN(date.getTime())) {
                if (isDate) {
                    date.setHours(0, 0, 0, 0);
                }
                return date;
            }
            return null;
        }

        // Texto normal
        return val;
    };

    const handleFileSelect = async (file: File) => {
        // Validación de nombre de archivo requerida por usuario
        // Debe comenzar con "transacciones" (case insensitive)
        if (!file.name.toLowerCase().startsWith('transacciones')) {
            setError('Error: El archivo debe tener un nombre que comience con "transacciones" (ej: transacciones_noviembre.xlsx)');
            setStatus('error');
            return;
        }

        setStatus('loading');
        setFileName(file.name);
        setError(null);
        setIsDbSource(false); // Es una carga de archivo nueva
        setReservationSearch('');
        setDateRange({ start: '', end: '' });

        try {
            const { data: rawData, headers: rawHeaders } = await parseFileToJSON(file);

            if (!rawData || rawData.length === 0) {
                throw new Error("El archivo parece estar vacío.");
            }

            // 1. Generar mapeo automático (Header del Excel -> Columna DB)
            const newMapping: Record<string, string> = {};

            TRANSACTION_COLUMNS_CONFIG.forEach(config => {
                const dbKey = config.dbKey;
                let foundHeader: string | null = null;

                // A. Buscar coincidencia exacta (case insensitive)
                foundHeader = rawHeaders.find(h => h.toLowerCase().trim() === dbKey.toLowerCase());

                // B. Si no, buscar por keywords
                if (!foundHeader) {
                    for (const keyword of config.keywords) {
                        const match = rawHeaders.find(h => h.toLowerCase().includes(keyword));
                        if (match) {
                            foundHeader = match;
                            break;
                        }
                    }
                }

                if (foundHeader) {
                    newMapping[foundHeader] = dbKey;
                }
            });

            // 2. Limpiar datos usando el mapeo detectado
            const cleanedData = rawData.map(row => {
                const newRow: DataRow = { ...row };

                Object.entries(newMapping).forEach(([excelHeader, dbKey]) => {
                    newRow[excelHeader] = cleanValue(row[excelHeader], dbKey);
                });

                return newRow;
            });

            setDbMapping(newMapping);
            setData(cleanedData);
            setHeaders(rawHeaders);
            setStatus('success');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido al procesar el archivo.';
            setError(msg);
            setStatus('error');
        }
    };

    const handleReset = () => {
        setStatus('idle');
        setData([]);
        setHeaders([]);
        setFileName(null);
        setError(null);
        setDbMapping({});
        setIsDbSource(false);
        setReservationSearch('');
        setDateRange({ start: '', end: '' });
    };

    // Función para manejar el borrado de una fila (Abre Modal)
    const handleDeleteRow = (row: DataRow) => {
        setDeleteModal({ isOpen: true, type: 'single', row });
    };

    // Función para manejar el borrado de filtrados por fecha
    const handleDeleteFiltered = () => {
        if (!dateRange.start || !dateRange.end) {
            alert('Por favor, selecciona un rango de fechas válido para eliminar.');
            return;
        }
        setDeleteModal({ isOpen: true, type: 'date', dateRange: { ...dateRange } });
    };

    // Función que EJECUTA el borrado confirmado
    const confirmDeleteRow = async () => {
        if (deleteModal.type === 'single') {
            const row = deleteModal.row;
            if (!row) return;

            if (isDbSource && row.id) {
                // Borrado de base de datos
                const success = await deleteTransaction(row.id as number, TABLE_NAME);
                if (success) {
                    // Actualizar estado local eliminando el item
                    setData(prev => prev.filter(item => item.id !== row.id));
                    setDeleteModal({ isOpen: false, type: 'single', row: null });
                } else {
                    alert('Error al eliminar el registro de la base de datos.');
                }
            } else {
                // Borrado local (preview de archivo)
                if (row.id) {
                    setData(prev => prev.filter(item => item.id !== row.id));
                } else {
                    setData(prev => prev.filter(item => item !== row));
                }
                setDeleteModal({ isOpen: false, type: 'single', row: null });
            }
        } else if (deleteModal.type === 'date') {
            const range = deleteModal.dateRange;
            if (!range || !range.start || !range.end) return;

            // Borrado masivo por rango de fechas
            if (isDbSource) {
                // ESTRATEGIA: Usar los datos REALES filtrados para determinar el rango a borrar.
                // Esto corrige el desfase de zona horaria: si el usuario ve "31/12" pero la BD tiene "01/01",
                // leeremos "01/01" de la fila y borraremos "01/01".

                if (filteredData.length === 0) {
                    alert("No hay datos visibles para eliminar.");
                    setDeleteModal({ isOpen: false, type: 'single', row: null, dateRange: null });
                    return;
                }

                // 1. Detectar la columna correcta
                const sampleRow = filteredData[0];
                let targetColumn = 'fecha_servicio';
                if (sampleRow['fecha_servicio']) targetColumn = 'fecha_servicio';
                else if (sampleRow['fecha_hora']) targetColumn = 'fecha_hora';
                else if (sampleRow['fecha']) targetColumn = 'fecha';
                else if (sampleRow['created_at']) targetColumn = 'created_at';

                // 2. Extraer las fechas reales de los datos (Min y Max)
                const dates = filteredData
                    .map(r => r[targetColumn])
                    .filter(d => d) // Quitar nulos
                    .map(d => typeof d === 'string' ? d.substring(0, 10) : new Date(d).toISOString().split('T')[0])
                    .sort();

                if (dates.length === 0) {
                    alert("No se encontraron fechas válidas en los registros seleccionados.");
                    return;
                }

                const realStart = dates[0];
                const realEnd = dates[dates.length - 1];

                const inputStart = deleteModal.dateRange?.start || '?';
                const inputEnd = deleteModal.dateRange?.end || '?';

                console.log(`[UI Delete] Data-Driven Range. Input: ${inputStart}-${inputEnd}. effectiveDB: ${realStart}-${realEnd}. Column: ${targetColumn}`);

                setStatus('loading');
                // Usamos realStart y realEnd para asegurar que coincida con lo que la BD tiene
                const success = await deleteTransactionsByRange(realStart, realEnd, targetColumn, TABLE_NAME);
                if (success) {
                    // Recargar datos para asegurar consistencia
                    const newData = await fetchDataFromSupabase(TABLE_NAME);
                    setData(newData);
                    setDeleteModal({ isOpen: false, type: 'single', row: null, dateRange: null });
                    setStatus('success');
                } else {
                    setStatus('success'); // Restaurar UI
                    alert('Error al eliminar los registros por rango de fecha.');
                }
            } else {
                // Borrado local en preview
                const targetKey = Object.keys(dbMapping).find(k => dbMapping[k] === 'fecha_servicio') || 'fecha_servicio';

                setData(prev => prev.filter(row => {
                    const val = row[targetKey];
                    if (!val) return true; // keep empty dates

                    let dateObj: Date | null = null;
                    if (val instanceof Date) {
                        dateObj = val;
                    } else if (typeof val === 'string' || typeof val === 'number') {
                        const d = new Date(val);
                        if (!isNaN(d.getTime())) dateObj = d;
                    }

                    if (dateObj) {
                        const rowDateStr = dateObj.toLocaleDateString('en-CA');
                        // Mantenemos si NO está en el rango
                        return rowDateStr < range.start || rowDateStr > range.end;
                    }
                    return true;
                }));
                setDeleteModal({ isOpen: false, type: 'single', row: null, dateRange: null });
            }
        }
    };

    // Filtrado de datos consolidado (Reserva + Fecha Servicio)
    const filteredData = useMemo(() => {
        let result = data;

        // 1. Filtrado por número de reserva (suffix matching)
        if (reservationSearch) {
            const searchStr = reservationSearch.trim().toLowerCase();
            let targetKey = 'num_reserva'; // Default DB Key
            if (!isDbSource) {
                targetKey = Object.keys(dbMapping).find(key => dbMapping[key] === 'num_reserva') || '';
            }

            if (targetKey) {
                result = result.filter(row => {
                    const val = String(row[targetKey] || '').trim().toLowerCase();
                    return val.endsWith(searchStr);
                });
            }
        }

        // 2. Filtrado por fecha de servicio (RANGO)
        if (dateRange.start || dateRange.end) {
            let dateKey = 'fecha_servicio'; // Default DB Key
            if (!isDbSource) {
                // En preview, buscamos qué columna del Excel se mapeó a fecha_servicio
                dateKey = Object.keys(dbMapping).find(key => dbMapping[key] === 'fecha_servicio') || '';
            }

            if (dateKey) {
                result = result.filter(row => {
                const val = row[dateKey];
                if (!val) return false;

                if (val) {
                    let rowDateStr = '';
                    
                    if (val instanceof Date) {
                        rowDateStr = val.toLocaleDateString('en-CA');
                    } else if (typeof val === 'string') {
                        // Si es string "YYYY-MM-DD...", extraemos solo la parte de la fecha
                        // Esto evita que 'new Date()' lo mueva de día por la zona horaria
                        rowDateStr = val.split('T')[0].split(' ')[0];
                    } else if (typeof val === 'number') {
                        // Excel serial
                        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                        const d = new Date(excelEpoch.getTime() + val * 86400000);
                        rowDateStr = d.toLocaleDateString('en-CA');
                    }

                    if (rowDateStr) {
                        // Lógica de rango inclusivo (comparación de strings YYYY-MM-DD)
                        if (dateRange.start && rowDateStr < dateRange.start) return false;
                        if (dateRange.end && rowDateStr > dateRange.end) return false;
                        return true;
                    }
                }
                return false;
                });
            }
        }

        return result;
    }, [data, reservationSearch, dateRange, isDbSource, dbMapping]);

    // Las columnas que tienen un mapeo válido
    const mappedColumns = Object.keys(dbMapping);

    return (
        <div className="w-full flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans h-full">
            <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">

                {/* Header */}
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-brand-800 rounded-lg">
                                    <BanknotesIcon className="w-8 h-8 text-brand-400" />
                                </div>
                                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                                    Carga de Transacciones
                                </h1>
                            </div>
                            <p className="text-brand-300 text-lg">
                                Sube tus archivos de transacciones para sincronizarlos con la base de datos central.
                            </p>
                        </div>

                        {/* Selector de Hotel */}
                        <div className="inline-flex bg-brand-900 border border-brand-700 p-1 rounded-xl shadow-inner">
                            <button
                                onClick={() => setHotel('plus')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${hotel === 'plus' ? 'bg-brand-700 text-white shadow-md' : 'text-brand-300 hover:text-white'}`}
                            >
                                <BuildingOfficeIcon className="w-4 h-4" />
                                Plus
                            </button>
                            <button
                                onClick={() => setHotel('palm')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${hotel === 'palm' ? 'bg-brand-700 text-white shadow-md' : 'text-brand-300 hover:text-white'}`}
                            >
                                <BuildingOfficeIcon className="w-4 h-4" />
                                Palm
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 bg-brand-900/50 backdrop-blur-sm border border-brand-800 rounded-2xl shadow-2xl p-6 sm:p-8 transition-all duration-300 flex flex-col">

                    {status === 'idle' && (
                        <div className="flex-1 flex flex-col justify-center">
                            <FileUpload
                                onFileSelect={handleFileSelect}
                                requiredPrefix=""
                            />
                            <div className="mt-8 p-4 bg-brand-800/30 rounded-lg border border-brand-700 text-sm text-brand-300 max-w-2xl mx-auto">
                                <p className="font-semibold text-brand-200 mb-2">Columnas esperadas (automático):</p>
                                <p>Fecha Hora, Fecha Servicio, Reserva, Habitación, Nombre, Descripción, Cantidad/Monto, Débito, Crédito.</p>
                                <p className="mt-2 text-xs italic text-brand-400">El sistema detectará formatos de texto (ej: "27/10/2023 10:00 am") y monedas automáticamente.</p>
                            </div>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="flex-1 flex flex-col justify-center">
                            <Spinner />
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex-1 flex flex-col justify-center">
                            <ErrorMessage message={error || 'Error inesperado'} onReset={handleReset} />
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col gap-6 animate-fade-in h-full">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-brand-800 pb-4">
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-white">{fileName}</h2>
                                    <p className="text-sm text-brand-400">{filteredData.length} registros mostrados {reservationSearch && `(de ${data.length} totales)`}</p>

                                    {!isDbSource && (
                                        <div className="flex gap-2 mt-1">
                                            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${mappedColumns.length > 0 ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                                                {mappedColumns.length} columnas identificadas
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Barra de Filtro y Acciones */}
                                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                    {/* Input de Búsqueda */}
                                    <div className="relative w-full sm:w-64">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <SearchIcon className="h-4 w-4 text-brand-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-9 pr-8 py-2 bg-brand-800 border border-brand-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder-brand-500 text-sm"
                                            placeholder="Filtrar reserva (fin con...)"
                                            value={reservationSearch}
                                            onChange={(e) => setReservationSearch(e.target.value)}
                                        />
                                        {reservationSearch && (
                                            <button
                                                onClick={() => setReservationSearch('')}
                                                className="absolute inset-y-0 right-0 pr-2 flex items-center text-brand-400 hover:text-white"
                                                title="Limpiar búsqueda"
                                            >
                                                <CloseIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Filtro de Rango de Fechas */}
                                    <div className="flex items-center gap-2 bg-brand-800 border border-brand-700 rounded-lg p-1">
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-32 pl-2 pr-1 py-1 bg-transparent text-white focus:outline-none text-xs sm:text-sm [color-scheme:dark]"
                                                value={dateRange.start}
                                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                title="Fecha Desde"
                                                placeholder="Desde"
                                            />
                                        </div>
                                        <span className="text-brand-500 text-xs">a</span>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-32 pl-2 pr-1 py-1 bg-transparent text-white focus:outline-none text-xs sm:text-sm [color-scheme:dark]"
                                                value={dateRange.end}
                                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                title="Fecha Hasta"
                                                placeholder="Hasta"
                                            />
                                        </div>
                                        {(dateRange.start || dateRange.end) && (
                                            <button
                                                onClick={() => setDateRange({ start: '', end: '' })}
                                                className="p-1 px-2 text-brand-400 hover:text-white hover:bg-brand-700/50 rounded"
                                                title="Limpiar fechas"
                                            >
                                                <CloseIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Botón Eliminar Filtrados */}
                                    {dateRange.start && dateRange.end && filteredData.length > 0 && (
                                        <button
                                            onClick={handleDeleteFiltered}
                                            className="px-4 py-2 bg-red-900/40 border border-red-700/50 text-red-200 hover:bg-red-900/60 hover:text-white rounded-lg flex items-center gap-2 transition-all text-sm font-medium whitespace-nowrap"
                                            title={`Eliminar ${filteredData.length} registros del rango seleccionado`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                            Eliminar Filtrados
                                        </button>
                                    )}

                                    <div className="flex gap-3">
                                        {/* Solo mostramos la sincronización si NO estamos viendo datos de la BD y hay columnas mapeadas */}
                                        {!isDbSource && (
                                            <DatabaseSync
                                                data={data} // Sincronizamos data completa, no la filtrada
                                                visibleColumns={mappedColumns}
                                                tableName={TABLE_NAME}
                                                conflictKey="id"
                                                columnMapping={dbMapping}
                                                replaceExisting={false}
                                            />
                                        )}
                                        <button
                                            onClick={handleReset}
                                            className="px-4 py-2 bg-brand-700 text-white font-semibold rounded-lg hover:bg-brand-600 transition-colors duration-300 text-sm whitespace-nowrap"
                                        >
                                            {isDbSource ? 'Cargar Nuevos Datos' : 'Subir Otro'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {!isDbSource && mappedColumns.length === 0 && (
                                <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded-lg text-yellow-200 text-sm mb-4">
                                    Advertencia: No se pudieron identificar columnas automáticamente. Verifica que los nombres en la primera fila del Excel coincidan con los esperados (ej: "Fecha", "Reserva", "Monto").
                                </div>
                            )}

                            <div className="flex-1 overflow-hidden min-h-[400px] bg-brand-900/50 rounded-xl border border-brand-800">
                                <DataTable
                                    headers={headers}
                                    data={filteredData}
                                    onDeleteRow={handleDeleteRow}
                                />
                            </div>
                        </div>
                    )}

                </main>
            </div>


            {/* Modal de Confirmación de Borrado */}
            {
                deleteModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-brand-900 border border-brand-700 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="h-12 w-12 rounded-full bg-red-900/30 flex items-center justify-center text-red-500 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </div>

                                <h3 className="text-xl font-bold text-white">¿Estás seguro?</h3>
                                <p className="text-brand-300">
                                    {deleteModal.type === 'single'
                                        ? (isDbSource
                                            ? "Esta acción eliminará el registro permanentemente de la base de datos. No se puede deshacer."
                                            : "Esta acción quitará el registro de la vista actual (no afecta tu archivo Excel original).")
                                        : (isDbSource
                                            ? `ADVERTENCIA: Se eliminarán TODOS los registros entre ${deleteModal.dateRange?.start} y ${deleteModal.dateRange?.end} de la base de datos. Esta acción es IRREVERSIBLE.`
                                            : `Se eliminarán los registros entre ${deleteModal.dateRange?.start} y ${deleteModal.dateRange?.end} de esta vista previa.`)
                                    }
                                </p>

                                <div className="grid grid-cols-2 gap-3 w-full pt-2">
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: false, type: 'single', row: null, dateRange: null })}
                                        className="py-2.5 px-4 bg-brand-800 hover:bg-brand-700 text-brand-200 font-semibold rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmDeleteRow}
                                        className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg transition-colors"
                                    >
                                        Sí, Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

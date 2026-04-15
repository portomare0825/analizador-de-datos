
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ClipboardDocumentCheckIcon } from './components/icons/ClipboardDocumentCheckIcon';
import { DataTable } from './components/DataTable';
import { fetchDataFromSupabase, getExchangeRate, saveExchangeRate, deleteInvoice, updateInvoice, saveInvoice, fetchSourcesByReservationNumbers, fetchTotalsByReservationNumbers, fetchAllUniqueSources, batchUpdateInvoices, fetchCxCRecords, updateCxCSource, syncCxCGuestNames } from './services/supabaseService';
import { CloseIcon } from './components/icons/CloseIcon';
import { BuildingOfficeIcon } from './components/icons/BuildingOfficeIcon';
import { SearchIcon } from './components/icons/SearchIcon';
import { ChevronDownIcon } from './components/icons/ChevronDownIcon';
import type { DataRow } from './types';
import { DateRangePicker } from './components/DateRangePicker';
import { CalendarIcon } from './components/icons/CalendarIcon';
import { DocumentPlusIcon } from './components/icons/DocumentPlusIcon';
import { ChartBarIcon } from './components/icons/ChartBarIcon';
import { useHotel } from './contexts/HotelContext';
import CxCSummaryModal from './components/CxCSummaryModal';

// Configuración de Supabase centralizada en supabaseClient.ts

// Identificadores de Hotel (deben coincidir con HotelContext)
const HOTEL_PLUS = 'plus';
const HOTEL_PALM = 'palm';

// Vistas Filtradas (Pendientes de Tasa - sin facturas)
const VIEW_PLUS_PENDING = 'reservas_sin_nota_plus';
const VIEW_PALM_PENDING = 'reservas_sin_nota_palm';

// Vistas Verificadas (Tasa Verificada - con notas)
const VIEW_PLUS_VERIFIED = 'reservas_filtradas_plus';
const VIEW_PALM_VERIFIED = 'reservas_filtradas_palm';

// Tabla de Facturas
const TABLE_INVOICES = 'factura';

// Configuración de columnas para mostrar en la tabla
const DESIRED_COLUMNS_CONFIG = [
    // --- Columnas de Reservas (Pestañas 1 y 2) ---
    { key: 'Nombre', keywords: ['nombre', 'cliente', 'huesped', 'guest'] },
    // CORRECCIÓN: Eliminado 'id' para evitar mapear el PK de la fila. Priorizamos 'num_reserva'.
    { key: 'Numero de la reserva', keywords: ['num_reserva', 'numero de reserva', 'reserva', 'booking'] },
    { key: 'Total Hab.', keywords: ['total hab', 'rate', 'monto habitacion'] },
    { key: 'Numero de habitacion', keywords: ['habitacion', 'room'] },
    { key: 'Fecha de llegada', keywords: ['fecha', 'llegada', 'arrival', 'check in', 'checkin'] }, // Priorizamos 'fecha' para columnas genéricas de fecha en vistas de reservas
    { key: 'Salida', keywords: ['salida', 'departure', 'check out', 'checkout'] },
    { key: 'Total General', keywords: ['total general', 'total', 'amount'] },
    { key: 'Fuente', keywords: ['fuente', 'source'] },

    // --- Columnas de Facturas (Pestaña 3 - Específicas solicitadas) ---
    { key: 'Registro Reserva', keywords: ['registro_reserva'] },
    { key: 'Factura', keywords: ['factura'] },
    { key: 'Fecha Factura', keywords: ['fecha_fac', 'fecha'] }, // Prioritized 'fecha_fac'
    { key: 'Monto Divisa', keywords: ['montodv'] },
    { key: 'Monto Bs', keywords: ['montobs'] },
    { key: 'Hotel', keywords: ['hotel'] },
    { key: 'Tipo', keywords: ['tipo'] }, // Nueva columna para CxC/Intercambio
    { key: 'Monto CxC', keywords: ['monto_cxc'] } // Monto de CxC
];

type Tab = 'rate-input' | 'conversion-preview' | 'invoiced-history' | 'cxc-exchange';

interface SourceDropdownProps {
    options: string[];
    selected: string;
    onChange: (val: string) => void;
}

const SourceDropdown: React.FC<SourceDropdownProps> = ({ options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full sm:w-64" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-10 px-3 bg-brand-800 border border-brand-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 flex items-center justify-between transition-colors hover:bg-brand-800/80"
            >
                <span className="truncate">
                    {selected ? `Fuente: ${selected}` : 'Fuente: Todas'}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-brand-400 ml-2 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-brand-800 border border-brand-600 rounded-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-80">
                    <div className="p-2 border-b border-brand-700 bg-brand-800 sticky top-0">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Buscar..."
                            className="w-full bg-brand-900 border border-brand-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand-400 placeholder-brand-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-brand-600 scrollbar-track-brand-900">
                        <div
                            className={`px-4 py-2 text-sm cursor-pointer transition-colors ${selected === '' ? 'bg-brand-600/50 text-white font-medium' : 'text-brand-200 hover:bg-brand-700'}`}
                            onClick={() => {
                                onChange('');
                                setIsOpen(false);
                            }}
                        >
                            Todas las fuentes
                        </div>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <div
                                    key={option}
                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${selected === option ? 'bg-brand-600/50 text-white font-medium' : 'text-brand-200 hover:bg-brand-700'}`}
                                    onClick={() => {
                                        onChange(option);
                                        setIsOpen(false);
                                    }}
                                >
                                    {option}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-brand-500 italic text-center">
                                No hay resultados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface HotelDropdownProps {
    selected: string;
    onChange: (val: string) => void;
}

const HotelDropdown: React.FC<HotelDropdownProps> = ({ selected, onChange }) => {
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
    }, []);

    return (
        <div className="relative w-full sm:w-40" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-9 px-3 bg-brand-800 border border-brand-700 text-white text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 flex items-center justify-between transition-colors hover:bg-brand-800/80"
            >
                <span className="truncate">
                    {selected ? `Hotel: ${selected}` : 'Hotel: Todos'}
                </span>
                <ChevronDownIcon className="w-3.5 h-3.5 text-brand-400 ml-2 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-brand-800 border border-brand-600 rounded-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col">
                    <div className="py-1">
                        <div
                            className={`px-4 py-2 text-xs cursor-pointer transition-colors ${selected === '' ? 'bg-brand-600/50 text-white font-medium' : 'text-brand-200 hover:bg-brand-700'}`}
                            onClick={() => { onChange(''); setIsOpen(false); }}
                        >
                            Todos
                        </div>
                        <div
                            className={`px-4 py-2 text-xs cursor-pointer transition-colors ${selected === 'Plus' ? 'bg-brand-600/50 text-white font-medium' : 'text-brand-200 hover:bg-brand-700'}`}
                            onClick={() => { onChange('Plus'); setIsOpen(false); }}
                        >
                            Plus
                        </div>
                        <div
                            className={`px-4 py-2 text-xs cursor-pointer transition-colors ${selected === 'Palm' ? 'bg-brand-600/50 text-white font-medium' : 'text-brand-200 hover:bg-brand-700'}`}
                            onClick={() => { onChange('Palm'); setIsOpen(false); }}
                        >
                            Palm
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export function TaxAuditPage() {
    const [activeTab, setActiveTab] = useState<Tab>('rate-input');
    const [exchangeRate, setExchangeRate] = useState<string>('');
    const [euroRate, setEuroRate] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSavingRate, setIsSavingRate] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isCxCSummaryOpen, setIsCxCSummaryOpen] = useState(false);

    // Usar contexto compartido para hotel selection
    const { hotel, setHotel } = useHotel();
    const activeTable = hotel === 'palm' ? HOTEL_PALM : HOTEL_PLUS;

    // Estados de datos
    const [data, setData] = useState<DataRow[]>([]);
    const [globalSources, setGlobalSources] = useState<string[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalPendingUSD, setTotalPendingUSD] = useState(0);
    const [isRepairing, setIsRepairing] = useState(false);
    const [repairProgress, setRepairProgress] = useState({ current: 0, total: 0 });

    // Filtros
    const [reservationSearch, setReservationSearch] = useState('');
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [recordSearch, setRecordSearch] = useState('');
    const [selectedSource, setSelectedSource] = useState('');
    const [selectedHotelFilter, setSelectedHotelFilter] = useState('');

    // Filtros de Fecha (Salida para reservas, Fecha Factura para facturas)
    const [departureDateStart, setDepartureDateStart] = useState('');
    const [departureDateEnd, setDepartureDateEnd] = useState('');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [pickerTopOffset, setPickerTopOffset] = useState(0);
    const datePickerButtonRef = useRef<HTMLButtonElement>(null);

    const todayDate = new Date();
    const todayFormatted = todayDate.toLocaleDateString('es-VE'); // Visual
    const todayISO = todayDate.toISOString().split('T')[0]; // YYYY-MM-DD for DB

    // Definición explícita de columnas para Facturación Cerrada
    const invoiceHeaders = ['Registro Reserva', 'Factura', 'Fecha Factura', 'Monto Divisa', 'Monto Bs', 'Fuente'];

    // --- Helpers de Procesamiento de Datos ---
    const normalizeKey = (key: string) => key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s_]/g, '').trim().replace(/\s+/g, '_');

    const parseDate = (dateInput: any): Date | null => {
        if (!dateInput) return null;

        if (dateInput instanceof Date) {
            if (isNaN(dateInput.getTime())) return null;
            dateInput.setHours(0, 0, 0, 0);
            return dateInput;
        }

        if (typeof dateInput === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const jsDate = new Date(excelEpoch.getTime() + dateInput * 86400000);
            if (isNaN(jsDate.getTime())) return null;
            jsDate.setHours(0, 0, 0, 0);
            return jsDate;
        }

        if (typeof dateInput === 'string') {
            let date: Date | null = null;
            // ISO string often used by Supabase: 2023-05-25T00:00:00
            if (dateInput.includes('T')) {
                date = new Date(dateInput);
            } else {
                let parts = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (parts) {
                    date = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
                } else {
                    parts = dateInput.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
                    if (parts) {
                        date = new Date(parseInt(parts[3], 10), parseInt(parts[2], 10) - 1, parseInt(parts[1], 10));
                    } else {
                        const tempDate = new Date(dateInput);
                        if (!isNaN(tempDate.getTime())) {
                            date = tempDate;
                        }
                    }
                }
            }

            if (date && !isNaN(date.getTime())) {
                date.setHours(0, 0, 0, 0);
                return date;
            }
        }

        return null;
    };

    const parseCurrency = (val: any): number => {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;

        let str = String(val).trim();

        const lastDot = str.lastIndexOf('.');
        const lastComma = str.lastIndexOf(',');

        let cleanStr = str.replace(/[^0-9.,-]/g, '');

        if (lastComma > lastDot && lastComma > -1) {
            cleanStr = cleanStr.replace(/\./g, '').replace(/,/g, '.');
        } else {
            cleanStr = cleanStr.replace(/,/g, '');
        }

        return parseFloat(cleanStr) || 0;
    };

    // Re-defined using useCallback to prevent issues with dependencies and re-renders.
    // CRITICAL: Now accepts currentTab as argument to ensure it uses the correct context during tab switches.
    const processData = useCallback((dbData: DataRow[], currentTab: string) => {
        // --- FILTRADO INICIAL: Cancelados y No Show ---
        // Filtramos directamente sobre los datos crudos antes de mapear columnas si es posible
        // Buscamos claves comunes de estado en el objeto
        const nonCancelledData = dbData.filter(row => {
            const statusKeys = ['estado', 'estatus', 'status', 'estado_de_la_reserva', 'estado_1'];
            const isCancelled = statusKeys.some(k => {
                const val = String(row[k] || '').toLowerCase();
                return val.includes('cancelado') || val.includes('cancelada') || val.includes('cancelled') || val.includes('no show') || val.includes('noshow');
            });
            return !isCancelled;
        });

        // Mapeo dinámico basado en los keys reales que vienen de la BD
        const dbKeyToAppKeyMap: Record<string, string> = {};
        const dbKeys = nonCancelledData.length > 0 ? Object.keys(nonCancelledData[0]) : [];

        DESIRED_COLUMNS_CONFIG.forEach(config => {
            // Lógica de exclusión por pestaña para evitar conflictos de nombres genéricos (ej: 'fecha')
            // Usa currentTab en lugar de activeTab para evitar closures obsoletos
            const isInvoiceTab = currentTab === 'invoiced-history';
            const isInvoiceColumn = ['Fecha Factura', 'Factura', 'Registro Reserva', 'Monto Divisa', 'Monto Bs'].includes(config.key);

            // Si estamos en facturas, ignoramos columnas exclusivas de reservas (excepto las compartidas si las hubiera, aqui evitamos conflicto con 'fecha')
            if (isInvoiceTab && !isInvoiceColumn && config.key !== 'Hotel' && config.key !== 'Fuente') {
                return;
            }

            // Si estamos en reservas, ignoramos columnas exclusivas de facturas (especialmente Fecha Factura que roba el key 'fecha')
            if (!isInvoiceTab && isInvoiceColumn) {
                return;
            }

            const normalizedConfigKey = normalizeKey(config.key);
            let match: string | undefined;

            // 1. Intento exacto normalizado
            if (dbKeys.includes(normalizedConfigKey)) {
                match = normalizedConfigKey;
            } else {
                // 2. Búsqueda por keywords en los keys de la BD
                for (const k of dbKeys) {
                    const normalizedDbKey = normalizeKey(k);
                    // Check exact match first
                    if (normalizedDbKey === normalizeKey(config.keywords[0])) {
                        match = k;
                        break;
                    }
                    // Then includes
                    if (config.keywords.some(kw => normalizedDbKey.includes(kw.toLowerCase()))) {
                        match = k;
                        break;
                    }
                }
            }

            if (match) {
                dbKeyToAppKeyMap[match] = config.key;
            }
        });

        const processed = nonCancelledData.map(row => {
            const newRow: DataRow = {};
            let rowTotal = 0;

            Object.keys(row).forEach(dbKey => {
                const appKey = dbKeyToAppKeyMap[dbKey] || dbKey; // Usar el nombre mapeado o el original
                let val = row[dbKey];

                // Detección de columnas de Fecha
                const isDateCol = appKey.toLowerCase().includes('fecha') ||
                    appKey.toLowerCase().includes('llegada') ||
                    appKey.toLowerCase().includes('salida');

                if (isDateCol) {
                    const parsed = parseDate(val);
                    if (parsed) val = parsed;
                }

                // Detección de columnas Numéricas para limpieza
                const isNumericCol = ['Total Hab.', 'Total General', 'Monto Pagado', 'Monto Divisa', 'Monto Bs', 'Monto CxC'].includes(appKey);
                if (isNumericCol) {
                    const parsedNum = parseCurrency(val);
                    val = parsedNum; // Guardamos como número limpio

                    if (appKey === 'Total General' || appKey === 'Monto Divisa') {
                        rowTotal = parsedNum;
                    }
                }

                newRow[appKey] = val;
            });

            return { row: newRow, total: rowTotal };
        });

        // --- FILTRADO DE ÚNICOS (Específico para Tasa Verificada Y Pendientes de Tasa) ---
        // IMPORTANTE: Aseguramos que tanto 'conversion-preview' como 'rate-input' filtren por reserva única.
        let filteredProcessed = processed;
        // Uses passed currentTab to guarantee correctness
        if (currentTab === 'conversion-preview' || currentTab === 'rate-input') {
            const seen = new Set();
            filteredProcessed = processed.filter(item => {
                // Intento principal: Clave conocida
                let resNum = item.row['Numero de la reserva'];

                // Fallback 1: Buscar por clave original si el mapeo falló
                if (!resNum) resNum = item.row['num_reserva'];
                if (!resNum) resNum = item.row['reserva'];

                // Fallback 2: Búsqueda flexible en las keys del objeto (paranoia mode)
                if (!resNum) {
                    const fallbackKey = Object.keys(item.row).find(k =>
                        (k.toLowerCase().includes('reserva') || k.toLowerCase().includes('booking'))
                        && item.row[k]
                    );
                    if (fallbackKey) resNum = item.row[fallbackKey];
                }

                if (!resNum) return true; // Si no hay ID, mostramos la fila por seguridad

                const key = String(resNum).trim();

                // Ignorar claves vacías para evitar colapso de filas sin ID
                if (key === '') return true;

                if (seen.has(key)) {
                    return false; // Es duplicado
                }
                seen.add(key);
                return true;
            });
        }

        const finalData = filteredProcessed.map(p => p.row);
        const totalUSD = filteredProcessed.reduce((acc, curr) => acc + curr.total, 0);

        // Calcular headers visibles basados en lo que encontramos
        const allFoundHeaders = Object.keys(finalData[0] || {});
        const visibleHeaders = DESIRED_COLUMNS_CONFIG
            .map(c => c.key)
            .filter(k => allFoundHeaders.includes(k));

        // Si no encontramos ninguna columna configurada, mostramos todas (fallback)
        const headersToShow = visibleHeaders.length > 0 ? visibleHeaders : allFoundHeaders;

        return { data: finalData, headers: headersToShow, totalUSD };
    }, []);

    // Modified loadData to support silent reload (keepData = true)
    const loadData = useCallback(async (keepData = false) => {
        setLoading(true);
        setError(null);

        // Solo limpiamos los datos si NO estamos en modo de recarga (ej. cambio de pestaña)
        if (!keepData) {
            setData([]);
        }

        let targetTable = activeTable;

        try {
            // Determinar la tabla origen basada en la pestaña activa y la selección de hotel
            // Si estamos en Facturación Cerrada, vamos directo a la tabla de facturas
            if (activeTab === 'invoiced-history') {
                targetTable = TABLE_INVOICES;
            } else {
                // Lógica para Palm
                if (activeTable === HOTEL_PALM) {
                    if (activeTab === 'rate-input') {
                        targetTable = VIEW_PALM_PENDING;
                    } else if (activeTab === 'conversion-preview') {
                        targetTable = VIEW_PALM_VERIFIED;
                    }
                }

                // Lógica para Plus
                if (activeTable === HOTEL_PLUS) {
                    if (activeTab === 'rate-input') {
                        targetTable = VIEW_PLUS_PENDING;
                    } else if (activeTab === 'conversion-preview') {
                        targetTable = VIEW_PLUS_VERIFIED;
                    }
                }
            }

            let result: any[];
            if (activeTab === 'cxc-exchange') {
                result = await fetchCxCRecords();
            } else {
                result = await fetchDataFromSupabase(targetTable);
            }
            if (activeTab === 'invoiced-history') {
                console.log("DEBUG: Raw invoice data from Supabase:", result.slice(0, 3));
            }
            // IMPORTANTE: Pasamos activeTab explícitamente para asegurar que processData use el valor correcto de la iteración actual
            const { data, headers, totalUSD } = processData(result, activeTab);
            if (activeTab === 'invoiced-history') {
                console.log("DEBUG: Processed invoice data:", data.slice(0, 3));
            }
            setData(data);
            setHeaders(headers);
            setTotalPendingUSD(totalUSD);
        } catch (err: any) {
            console.error("Error cargando datos:", err);
            const errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            setError(`Error al cargar datos en [${targetTable}]: ${errorMessage}`);
            // Solo limpiamos si hubo error
            if (!keepData) setData([]);
        } finally {
            setLoading(false);
        }
    }, [activeTable, activeTab, processData]);

    useEffect(() => {
        loadData();
        const fetchInitialData = async () => {
            const [rate, sources] = await Promise.all([
                getExchangeRate(todayISO),
                fetchAllUniqueSources()
            ]);
            if (rate) {
                setExchangeRate(rate.usd?.toString() || '');
                setEuroRate(rate.eur?.toString() || '');
            }
            if (sources) {
                setGlobalSources(sources);
            }
        };
        fetchInitialData();
    }, [loadData, todayISO]);

    // Enriquecimiento dinámico de fuentes para facturas (Optimizado por Lote)
    useEffect(() => {
        if (activeTab === 'invoiced-history' && data.length > 0 && !loading) {
            const enrichData = async () => {
                // Identificar facturas que necesitan fuente o monto
                const invoicesToEnrichSource = data.filter(inv => !inv['Fuente'] || String(inv['Fuente']).trim() === '');
                const invoicesToEnrichMonto = data.filter(inv => !inv['Monto Bs'] || parseFloat(String(inv['Monto Bs'])) === 0);

                if (invoicesToEnrichSource.length === 0 && invoicesToEnrichMonto.length === 0) return;

                const resNumbers = Array.from(new Set([
                    ...invoicesToEnrichSource.map(inv => String(inv['Registro Reserva'] || '').trim()),
                    ...invoicesToEnrichMonto.map(inv => String(inv['Registro Reserva'] || '').trim())
                ].filter(Boolean))) as string[];

                if (resNumbers.length === 0) return;

                try {
                    // Ejecutar ambas consultas en paralelo para eficiencia
                    const [sourceMapping, totalsMapping] = await Promise.all([
                        invoicesToEnrichSource.length > 0 ? fetchSourcesByReservationNumbers(resNumbers) : Promise.resolve({} as Record<string, string>),
                        invoicesToEnrichMonto.length > 0 ? fetchTotalsByReservationNumbers(resNumbers) : Promise.resolve({} as Record<string, number>)
                    ]);

                    if (Object.keys(sourceMapping).length > 0 || Object.keys(totalsMapping).length > 0) {
                        const newData = data.map(inv => {
                            const resNum = String(inv['Registro Reserva'] || '').trim();
                            let updated = { ...inv };
                            let hasUpdates = false;

                            if ((!inv['Fuente'] || String(inv['Fuente']).trim() === '') && sourceMapping[resNum]) {
                                updated['Fuente'] = sourceMapping[resNum];
                                hasUpdates = true;
                            }

                            if ((!inv['Monto Bs'] || parseFloat(String(inv['Monto Bs'])) === 0) && totalsMapping[resNum]) {
                                updated['Monto Bs'] = totalsMapping[resNum];
                                hasUpdates = true;
                            }

                            return hasUpdates ? updated : inv;
                        });

                        // Solo actualizamos si realmente hay cambios visibles
                        const hasChanges = newData.some((inv, idx) =>
                            inv['Fuente'] !== data[idx]['Fuente'] ||
                            inv['Monto Bs'] !== data[idx]['Monto Bs']
                        );

                        if (hasChanges) {
                            setData(newData);
                        }
                    }
                } catch (err) {
                    console.error("Error en enriquecimiento de datos de facturas:", err);
                }
            };

            enrichData();
        }
    }, [activeTab, data, loading]);

    // Limpiar filtros al cambiar de pestaña o DE TABLA (Plus/Palm)
    useEffect(() => {
        setReservationSearch('');
        setInvoiceSearch('');
        setRecordSearch('');
        setSelectedSource('');
        setSelectedHotelFilter('');
        setDepartureDateStart('');
        setDepartureDateEnd('');
    }, [activeTab, activeTable]);

    const handleSaveRate = async () => {
        if (!exchangeRate || isNaN(parseFloat(exchangeRate))) return;

        setIsSavingRate(true);
        const eurValue = euroRate && !isNaN(parseFloat(euroRate)) ? parseFloat(euroRate) : undefined;
        const success = await saveExchangeRate(todayISO, parseFloat(exchangeRate), eurValue);

        setIsSavingRate(false);
        if (success) {
            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                setIsModalOpen(false);
            }, 1000);
        } else {
            alert("Error al guardar la tasa. Verifica tu conexión.");
        }
    };

    const handleRepairInvoices = async () => {
        if (!data.length || isRepairing) return;

        const confirmMsg = "¿Deseas iniciar la reparación masiva? Este proceso guardará permanentemente la Fuente y el Monto Bs en los 14,000+ registros históricos para que los filtros funcionen instantáneamente.";
        if (!window.confirm(confirmMsg)) return;

        setIsRepairing(true);
        setRepairProgress({ current: 0, total: data.length });

        try {
            const invoicesToRepair = data.filter(inv =>
                (!inv['Fuente'] || String(inv['Fuente']).trim() === '') ||
                (!inv['Monto Bs'] || parseFloat(String(inv['Monto Bs'])) === 0)
            );

            if (invoicesToRepair.length === 0) {
                alert("No se encontraron registros que necesiten reparación.");
                setIsRepairing(false);
                return;
            }

            setRepairProgress({ current: 0, total: invoicesToRepair.length });
            const CHUNK_SIZE = 100;
            let repaired = 0;

            for (let i = 0; i < invoicesToRepair.length; i += CHUNK_SIZE) {
                const chunk = invoicesToRepair.slice(i, i + CHUNK_SIZE);
                const resNumbers = chunk.map(inv => String(inv['Registro Reserva'] || '').trim()).filter(Boolean);

                if (resNumbers.length === 0) continue;

                // 1. Obtener datos de fuentes y montos de las tablas originales
                const [sourceMapping, totalsMapping] = await Promise.all([
                    fetchSourcesByReservationNumbers(resNumbers),
                    fetchTotalsByReservationNumbers(resNumbers)
                ]);

                // 2. Preparar objetos de actualización para Supabase
                const updates = chunk.map(inv => {
                    const resNum = String(inv['Registro Reserva'] || '').trim();
                    const up: { id: string, fuente?: string, montobs?: number } = { id: String(inv['id']) };
                    let hasNewData = false;

                    if ((!inv['Fuente'] || String(inv['Fuente']).trim() === '') && sourceMapping[resNum]) {
                        up.fuente = sourceMapping[resNum];
                        hasNewData = true;
                    }

                    if ((!inv['Monto Bs'] || parseFloat(String(inv['Monto Bs'])) === 0) && totalsMapping[resNum]) {
                        up.montobs = totalsMapping[resNum];
                        hasNewData = true;
                    }

                    return hasNewData ? up : null;
                }).filter(Boolean) as { id: string, fuente?: string, montobs?: number }[];

                // 3. Persistir en la base de datos
                if (updates.length > 0) {
                    const success = await batchUpdateInvoices(updates);
                    if (!success) {
                        console.error("Fallo al actualizar lote en Supabase");
                    }
                }

                repaired += chunk.length;
                setRepairProgress(prev => ({ ...prev, current: repaired }));
            }

            alert(`Reparación completada. Se analizaron ${invoicesToRepair.length} registros.`);
            loadData(true); // Recargar datos para ver los cambios persistidos
        } catch (err) {
            console.error("Error durate la reparación masiva:", err);
            alert("Ocurrió un error crítico durante la reparación.");
        } finally {
            setIsRepairing(false);
        }
    };

    // --- Lógica de Filtrado ---
    const sources = useMemo(() => {
        // Combinamos las fuentes de los datos actuales con las fuentes globales
        const currentDataSources = data.map(row => String(row['Fuente'] || '')).filter(Boolean);
        const unique = new Set([...currentDataSources, ...globalSources]);
        return Array.from(unique).sort();
    }, [data, globalSources]);

    const filteredData = useMemo(() => {
        return data.filter(item => {
            let matchesRes = true;
            let matchesSource = true;
            let matchesDate = true;

            // 1. Filtro de Búsqueda de Texto
            if (activeTab === 'invoiced-history') {
                // Lógica dividida para facturas y registros
                if (invoiceSearch) {
                    const searchStr = invoiceSearch.trim().toLowerCase();
                    const factura = String(item['Factura'] || '').toLowerCase();
                    if (!factura.includes(searchStr)) matchesRes = false;
                }
                if (matchesRes && recordSearch) {
                    const searchStr = recordSearch.trim().toLowerCase();
                    const registro = String(item['Registro Reserva'] || '').toLowerCase();
                    if (!registro.includes(searchStr)) matchesRes = false;
                }
                // Filtro Hotel
                if (matchesRes && selectedHotelFilter) {
                    const rowHotel = String(item['Hotel'] || '').toLowerCase();
                    if (!rowHotel.includes(selectedHotelFilter.toLowerCase())) matchesRes = false;
                }
            } else {
                // Lógica original para otras pestañas
                if (reservationSearch) {
                    const searchStr = reservationSearch.trim().toLowerCase();
                    // Buscar por Reserva
                    const resNum = String(item['Numero de la reserva'] || '').trim().toLowerCase();
                    matchesRes = resNum.includes(searchStr);
                }
            }

            // 2. Filtro de Fuente
            if (selectedSource) {
                matchesSource = String(item['Fuente'] || '') === selectedSource;
            }

            // 3. Filtro de Fechas
            if (departureDateStart || departureDateEnd) {
                // Determinar campo de fecha según la pestaña
                const dateField = activeTab === 'invoiced-history' ? 'Fecha Factura' : 'Salida';
                const rowDate = parseDate(item[dateField]);

                if (!rowDate) {
                    matchesDate = false;
                } else {
                    const start = parseDate(departureDateStart);
                    const end = parseDate(departureDateEnd);
                    const rowTime = rowDate.getTime();

                    if (start && rowTime < start.getTime()) matchesDate = false;
                    if (end && rowTime > end.getTime()) matchesDate = false;
                }
            }

            return matchesRes && matchesSource && matchesDate;
        });
    }, [data, reservationSearch, invoiceSearch, recordSearch, selectedSource, selectedHotelFilter, departureDateStart, departureDateEnd, activeTab]);

    // --- Invoice Action Handlers ---
    const handleDeleteInvoice = (row: DataRow) => {
        setDeleteInvoiceModal({ isOpen: true, row });
    };

    const confirmDeleteInvoice = async () => {
        const row = deleteInvoiceModal.row;
        if (!row || !row.id) return;

        setLoading(true);
        const success = await deleteInvoice(Number(row.id));
        setLoading(false);

        if (success) {
            setDeleteInvoiceModal({ isOpen: false, row: null });
            loadData(true);
        } else {
            alert("Error al eliminar la factura.");
        }
    };

    const handleEditInvoice = (row: DataRow) => {
        // This reuses the Invoice Modal but we need to populate it and switch mode
        // For now, I'll use a direct prompt for simplicity or implement full modal reuse logic. 
        // Given existing code, reuse sounds best but might require refactoring DataTable's modal control.
        // Actually, let's keep it defined here for now.
        // Since the modal is inside DataTable, it's tricky to control from here without lifting state.
        // DataTable has its own 'isInvoiceModalOpen'.
        // Let's implement a 'simple' edit via prompt or a custom modal here in the Page.
        // Wait, the page has its own 'isModalOpen' but that is for Exchange Rate.

        // Let's use prompts for quick edits on critical fields for now as per "simple" request logic unless user wants full UI.
        // The user asked for "iconos... con su logica".

        // Better approach: Lift InvoiceModal state to Page? No, it's deeply integrated in DataTable.
        // Let's just create a small editing state here for the specific fields.
        setEditingInvoiceId(Number(row.id));
        setEditInvoiceNumber(String(row['Factura'] || ''));
        setEditInvoiceDate(row['Fecha Factura'] ? (row['Fecha Factura'] as unknown as string) : ''); // Type cast hack if needed or format
        setIsEditInvoiceModalOpen(true);
    };

    // State for Edit Invoice Modal
    const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);
    const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
    const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
    const [editInvoiceDate, setEditInvoiceDate] = useState('');

    // State for Edit CxC Source Modal
    const [isEditCxCSourceOpen, setIsEditCxCSourceOpen] = useState(false);
    const [editingCxCId, setEditingCxCId] = useState<string | null>(null);
    const [editCxCSource, setEditCxCSource] = useState('');
    const [isSavingCxCSource, setIsSavingCxCSource] = useState(false);

    const handleEditCxCSource = (row: DataRow) => {
        const rawId = row.id || row.ID;

        if (!rawId) {
            alert(`Error: ID no encontrado en la fila.`);
            return;
        }

        setEditingCxCId(String(rawId));
        setEditCxCSource(String(row['Fuente'] || row['fuente'] || ''));
        setIsEditCxCSourceOpen(true);
    };

    const saveCxCSourceEdit = async () => {
        if (!editingCxCId || !editCxCSource.trim()) {
            alert("No se puede guardar: Datos incompletos o ID inválido.");
            return;
        }
        setIsSavingCxCSource(true);
        try {
            console.log("DEBUG: Calling updateCxCSource...");
            const success = await updateCxCSource(editingCxCId, editCxCSource.trim());
            console.log("DEBUG: updateCxCSource result:", success);
            setIsSavingCxCSource(false);
            if (success) {
                setIsEditCxCSourceOpen(false);
                loadData(true);
            } else {
                alert('Error al actualizar la fuente. Intenta de nuevo.');
            }
        } catch (error) {
            console.error("DEBUG: Error in saveCxCSourceEdit:", error);
            setIsSavingCxCSource(false);
            alert('Error inesperado al guardar.');
        }
    };

    // State for Delete Invoice Confirmation Modal
    const [deleteInvoiceModal, setDeleteInvoiceModal] = useState<{ isOpen: boolean; row: DataRow | null }>({
        isOpen: false,
        row: null
    });


    const saveEditedInvoice = async () => {
        if (!editingInvoiceId) return;

        setLoading(true);
        const success = await updateInvoice(editingInvoiceId, {
            factura: editInvoiceNumber,
            fecha_fac: editInvoiceDate
        });
        setLoading(false);

        if (success) {
            setIsEditInvoiceModalOpen(false);
            loadData(true);
        } else {
            alert("Error al actualizar la factura.");
        }
    };

    // --- Date Picker Handlers ---
    const handleApplyDateRange = (start: string, end: string) => {
        setDepartureDateStart(start);
        setDepartureDateEnd(end);
        setIsDatePickerOpen(false);
    };

    const handleClearDateRange = () => {
        setDepartureDateStart('');
        setDepartureDateEnd('');
        setIsDatePickerOpen(false);
    };

    const getButtonText = () => {
        const label = activeTab === 'invoiced-history' ? 'Fecha: ' : 'Salida: ';
        if (!departureDateStart && !departureDateEnd) return `${label}Todas`;

        const formatDate = (d: string) => {
            const parts = d.split('-');
            return `${parts[2]}/${parts[1]}`;
        };
        if (departureDateStart && !departureDateEnd) return `${label}${formatDate(departureDateStart)}`;
        if (!departureDateStart && departureDateEnd) return `${label}Hasta ${formatDate(departureDateEnd)}`;
        if (departureDateStart === departureDateEnd) return `${label}${formatDate(departureDateStart)}`;
        return `${label}${formatDate(departureDateStart)} - ${formatDate(departureDateEnd)}`;
    };

    // Helper para determinar el nombre del hotel para guardar en la BD
    const getHotelSourceString = () => {
        if (activeTable === HOTEL_PALM) return "Palm D";
        return "Plus D";
    };

    const tabs = [
        {
            id: 'rate-input',
            label: 'Pendientes de Tasa',
            description: 'Reservas por procesar.'
        },
        {
            id: 'conversion-preview',
            label: 'Tasa Verificada',
            description: 'Listas para facturar.'
        },
        {
            id: 'invoiced-history',
            label: 'Facturación Cerrada',
            description: 'Histórico procesado.'
        },
        {
            id: 'cxc-exchange',
            label: 'CxC e Intercambio',
            description: 'Cuentas por cobrar.'
        },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'rate-input':
                return (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-brand-900/30 p-4 rounded-xl border border-brand-800/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-800 p-2 rounded-lg">
                                    <span className="text-2xl font-bold text-white">{filteredData.length}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-brand-300 text-sm font-medium uppercase">Reservas Pendientes</span>
                                    <span className="text-brand-500 text-xs">Esperando definición de tasa</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center lg:justify-end w-full lg:w-auto">
                                <div className="relative w-full sm:w-48">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <SearchIcon className="h-4 w-4 text-brand-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-8 h-10 bg-brand-800 border border-brand-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm placeholder-brand-500"
                                        placeholder="...123"
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

                                <SourceDropdown
                                    options={sources}
                                    selected={selectedSource}
                                    onChange={setSelectedSource}
                                />

                                <button
                                    ref={datePickerButtonRef}
                                    onClick={() => {
                                        if (datePickerButtonRef.current) {
                                            const rect = datePickerButtonRef.current.getBoundingClientRect();
                                            setPickerTopOffset(rect.bottom + 8);
                                        }
                                        setIsDatePickerOpen(true);
                                    }}
                                    className="h-10 px-3 bg-brand-800 border border-brand-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 flex items-center justify-between transition-colors hover:bg-brand-800/80 w-full sm:w-auto min-w-[140px]"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <CalendarIcon className="w-4 h-4 text-brand-400 flex-shrink-0" />
                                        <span className="truncate">{getButtonText()}</span>
                                    </div>
                                    <ChevronDownIcon className="w-4 h-4 text-brand-400 ml-2 flex-shrink-0" />
                                </button>

                                {exchangeRate && (
                                    <div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-800 rounded-lg animate-fade-in h-10 whitespace-nowrap">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-green-400 font-mono font-bold">Bs. {exchangeRate}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-brand-900/50 rounded-xl border border-brand-800 overflow-hidden min-h-[400px] relative">
                            {loading && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-brand-900/80 backdrop-blur-sm animate-fade-in">
                                    <div className="flex items-center gap-3 text-brand-400 animate-pulse">
                                        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Actualizando datos...</span>
                                    </div>
                                </div>
                            )}

                            {error ? (
                                <div className="flex items-center justify-center h-64 text-red-400">
                                    {error}
                                </div>
                            ) : (
                                // Render table if we are not loading OR if we have data to show (keeping it mounted)
                                (!loading || data.length > 0) && (
                                    <DataTable
                                        headers={headers}
                                        data={filteredData}
                                        hideNotes={true} // Ocultar Historial de Notas en Pendientes
                                        onDataChange={() => loadData(true)} // Recargar datos al guardar (silent mode)
                                        hotelSource={getHotelSourceString()} // Pasar el nombre del hotel para guardar
                                    />
                                )
                            )}
                        </div>
                    </div>
                );
            case 'conversion-preview':
                return (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-brand-900/30 p-4 rounded-xl border border-brand-800/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-800 p-2 rounded-lg">
                                    <span className="text-2xl font-bold text-white">{filteredData.length}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-brand-300 text-sm font-medium uppercase">Reservas Verificadas</span>
                                    <span className="text-brand-500 text-xs">Listas para facturar</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center lg:justify-end w-full lg:w-auto">
                                <div className="relative w-full sm:w-48">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <SearchIcon className="h-4 w-4 text-brand-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-8 h-10 bg-brand-800 border border-brand-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm placeholder-brand-500"
                                        placeholder="...123"
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

                                <SourceDropdown
                                    options={sources}
                                    selected={selectedSource}
                                    onChange={setSelectedSource}
                                />

                                <button
                                    ref={datePickerButtonRef}
                                    onClick={() => {
                                        if (datePickerButtonRef.current) {
                                            const rect = datePickerButtonRef.current.getBoundingClientRect();
                                            setPickerTopOffset(rect.bottom + 8);
                                        }
                                        setIsDatePickerOpen(true);
                                    }}
                                    className="h-10 px-3 bg-brand-800 border border-brand-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 flex items-center justify-between transition-colors hover:bg-brand-800/80 w-full sm:w-auto min-w-[140px]"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <CalendarIcon className="w-4 h-4 text-brand-400 flex-shrink-0" />
                                        <span className="truncate">{getButtonText()}</span>
                                    </div>
                                    <ChevronDownIcon className="w-4 h-4 text-brand-400 ml-2 flex-shrink-0" />
                                </button>

                                {exchangeRate && (
                                    <div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-800 rounded-lg animate-fade-in h-10 whitespace-nowrap">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-green-400 font-mono font-bold">Bs. {exchangeRate}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-brand-900/50 rounded-xl border border-brand-800 overflow-hidden min-h-[400px] relative">
                            {loading && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-brand-900/80 backdrop-blur-sm animate-fade-in">
                                    <div className="flex items-center gap-3 text-brand-400 animate-pulse">
                                        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Actualizando datos...</span>
                                    </div>
                                </div>
                            )}
                            {error ? (
                                <div className="flex items-center justify-center h-64 text-red-400">
                                    {error}
                                </div>
                            ) : (
                                (!loading || data.length > 0) && (
                                    <DataTable
                                        headers={headers}
                                        data={filteredData}
                                        hideTransactions={true} // Ocultar Transacciones en Verificadas
                                        useAccountNotes={true} // Habilitar modo notas de cuenta (notas_de_cuentas)
                                        onDataChange={() => loadData(true)} // Recargar datos al guardar (silent mode)
                                        hotelSource={getHotelSourceString()} // Pasar el nombre del hotel para guardar
                                    />
                                )
                            )}
                        </div>
                    </div>
                );
            case 'invoiced-history':
                return (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-brand-900/30 p-4 rounded-xl border border-brand-800/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-800 p-2 rounded-lg">
                                    <span className="text-2xl font-bold text-white">{filteredData.length}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-brand-300 text-sm font-medium uppercase">Facturación Cerrada</span>
                                    <span className="text-brand-500 text-xs">Histórico de facturas</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-center lg:justify-end w-full lg:w-auto">
                                <HotelDropdown selected={selectedHotelFilter} onChange={setSelectedHotelFilter} />

                                {/* Input Factura */}
                                <div className="relative w-full sm:w-40">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <SearchIcon className="h-4 w-4 text-brand-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-8 h-9 bg-brand-800 border border-brand-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs placeholder-brand-500"
                                        placeholder="Factura..."
                                        value={invoiceSearch}
                                        onChange={(e) => setInvoiceSearch(e.target.value)}
                                    />
                                    {invoiceSearch && (
                                        <button
                                            onClick={() => setInvoiceSearch('')}
                                            className="absolute inset-y-0 right-0 pr-2 flex items-center text-brand-400 hover:text-white"
                                            title="Limpiar búsqueda"
                                        >
                                            <CloseIcon className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>

                                <SourceDropdown
                                    options={sources}
                                    selected={selectedSource}
                                    onChange={setSelectedSource}
                                />

                                {/* Input Registro Reserva */}
                                <div className="relative w-full sm:w-40">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <SearchIcon className="h-4 w-4 text-brand-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-8 h-9 bg-brand-800 border border-brand-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs placeholder-brand-500"
                                        placeholder="Registro..."
                                        value={recordSearch}
                                        onChange={(e) => setRecordSearch(e.target.value)}
                                    />
                                    {recordSearch && (
                                        <button
                                            onClick={() => setRecordSearch('')}
                                            className="absolute inset-y-0 right-0 pr-2 flex items-center text-brand-400 hover:text-white"
                                            title="Limpiar búsqueda"
                                        >
                                            <CloseIcon className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>

                                <button
                                    ref={datePickerButtonRef}
                                    onClick={() => {
                                        if (datePickerButtonRef.current) {
                                            const rect = datePickerButtonRef.current.getBoundingClientRect();
                                            setPickerTopOffset(rect.bottom + 8);
                                        }
                                        setIsDatePickerOpen(true);
                                    }}
                                    className="h-9 px-3 bg-brand-800 border border-brand-700 text-white text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 flex items-center justify-between transition-colors hover:bg-brand-800/80 w-full sm:w-auto min-w-[120px]"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <CalendarIcon className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                                        <span className="truncate">{getButtonText()}</span>
                                    </div>
                                    <ChevronDownIcon className="w-3.5 h-3.5 text-brand-400 ml-2 flex-shrink-0" />
                                </button>

                                {/* Botón de Reparación Masiva */}
                                <button
                                    onClick={handleRepairInvoices}
                                    disabled={isRepairing || data.length === 0}
                                    className={`h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2 
                                        ${isRepairing
                                            ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                                            : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'}
                                    `}
                                    title="Reparar fuentes y montos en la base de datos"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    {isRepairing ? 'Reparando...' : 'Reparar Datos'}
                                </button>
                            </div>
                        </div>

                        {/* Barra de Progreso de Reparación */}
                        {isRepairing && (
                            <div className="bg-brand-900/50 border border-amber-900/30 p-3 rounded-lg animate-fade-in shadow-xl">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-amber-400 text-xs font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                        Reparando base de datos histórica...
                                    </span>
                                    <span className="text-amber-500 text-xs font-mono">
                                        {repairProgress.current} / {repairProgress.total} ({Math.round((repairProgress.current / (repairProgress.total || 1)) * 100)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-brand-800 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="bg-amber-500 h-full transition-all duration-300 ease-out"
                                        style={{ width: `${(repairProgress.current / (repairProgress.total || 1)) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-brand-400 text-[10px] mt-1.5 italic">
                                    Por favor no cierres la pestaña hasta que el proceso termine. Esto poblará las columnas Fuente y Monto Bs permanentemente.
                                </p>
                            </div>
                        )}

                        <div className="bg-brand-900/50 rounded-xl border border-brand-800 overflow-hidden min-h-[400px] relative">
                            {loading && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-brand-900/80 backdrop-blur-sm animate-fade-in">
                                    <div className="flex items-center gap-3 text-brand-400 animate-pulse">
                                        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Actualizando datos...</span>
                                    </div>
                                </div>
                            )}

                            {error ? (
                                <div className="flex items-center justify-center h-64 text-red-400">
                                    {error}
                                </div>
                            ) : (
                                (!loading || data.length > 0) && (
                                    <DataTable
                                        headers={invoiceHeaders}
                                        data={filteredData}
                                        hideNotes={false}
                                        useAccountNotes={true} // Habilitar notas de cuenta para esta pestaña
                                        hideTransactions={true}
                                        onEditRow={handleEditInvoice}
                                        onDeleteRow={handleDeleteInvoice}
                                    />
                                )
                            )}
                        </div>
                    </div>
                );
            case 'cxc-exchange':
                return (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-brand-900/30 p-4 rounded-xl border border-brand-800/50">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-800 p-2 rounded-lg">
                                    <span className="text-2xl font-bold text-white">{filteredData.length}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-brand-300 text-sm font-medium uppercase">CxC e Intercambio</span>
                                    <span className="text-brand-500 text-xs">Registros de traspasos</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center lg:justify-end w-full lg:w-auto">
                                <div className="relative w-full sm:w-48">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <SearchIcon className="h-4 w-4 text-brand-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-8 h-10 bg-brand-800 border border-brand-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm placeholder-brand-500"
                                        placeholder="Reserva..."
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

                                <SourceDropdown
                                    options={sources}
                                    selected={selectedSource}
                                    onChange={setSelectedSource}
                                />

                                <button
                                    onClick={() => setIsCxCSummaryOpen(true)}
                                    className="flex items-center gap-2 px-4 h-10 bg-brand-700 hover:bg-brand-600 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-brand-950/20 active:scale-95 whitespace-nowrap border border-brand-600"
                                >
                                    <ChartBarIcon className="w-4 h-4" />
                                    Resumen de Fuentes
                                </button>


                            </div>
                        </div>

                        <div className="bg-brand-900/50 rounded-xl border border-brand-800 overflow-hidden min-h-[400px] relative">
                            {loading && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-brand-900/80 backdrop-blur-sm animate-fade-in">
                                    <div className="flex items-center gap-3 text-brand-400 animate-pulse">
                                        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Actualizando datos...</span>
                                    </div>
                                </div>
                            )}

                            {error ? (
                                <div className="flex items-center justify-center h-64 text-red-400">
                                    {error}
                                </div>
                            ) : (
                                (!loading || data.length > 0) && (
                                    <DataTable
                                        headers={headers}
                                        data={filteredData}
                                        hotelSource={hotel}
                                        hideNotes={true}
                                        hideTransactions={false} // Permitir ver transacciones desde el modal
                                        onDataChange={() => loadData(true)}
                                        onEditRow={handleEditCxCSource}
                                    />
                                )
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8 font-sans h-full flex flex-col relative">
            <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-brand-800 rounded-lg">
                                <ClipboardDocumentCheckIcon className="w-6 h-6 text-brand-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-white">
                                Auditoría de Tasas
                            </h1>
                        </div>
                        <p className="text-brand-300 ml-1 max-w-2xl">
                            Gestión de conversión cambiaria y facturación fiscal.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Selector de Tabla (Solo visible si NO estamos en Facturación Cerrada) */}
                        {activeTab !== 'invoiced-history' && (
                            <div className="inline-flex bg-brand-900 border border-brand-700 p-1 rounded-xl shadow-inner animate-fade-in">
                                <button
                                    onClick={() => setHotel('plus')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${activeTable === HOTEL_PLUS ? 'bg-brand-700 text-white shadow-md' : 'text-brand-300 hover:text-white'}`}
                                >
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    Plus
                                </button>
                                <button
                                    onClick={() => setHotel('palm')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${activeTable === HOTEL_PALM ? 'bg-brand-700 text-white shadow-md' : 'text-brand-300 hover:text-white'}`}
                                >
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    Palm
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setIsModalOpen(true)}
                            title="Configurar Tasa Cambiaria"
                            className="p-3 bg-brand-700 hover:bg-brand-600 text-white rounded-xl transition-all shadow-lg hover:shadow-brand-500/20 border border-brand-600 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 group-hover:scale-110 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Tab Navigation */}
                <div className="flex border-b border-brand-800 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`
                            relative px-6 py-4 text-sm font-medium transition-colors focus:outline-none
                            ${activeTab === tab.id ? 'text-brand-100' : 'text-brand-400 hover:text-brand-200'}
                        `}
                        >
                            <div className="flex flex-col items-start gap-1">
                                <span className="font-bold tracking-wide">{tab.label}</span>
                                <span className={`text-xs ${activeTab === tab.id ? 'text-brand-300' : 'text-brand-500'}`}>
                                    {tab.description}
                                </span>
                            </div>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 shadow-[0_-2px_8px_rgba(201,209,165,0.4)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {renderContent()}
                </div>
            </div>

            {isDatePickerOpen && (
                <DateRangePicker
                    initialStartDate={departureDateStart}
                    initialEndDate={departureDateEnd}
                    onApply={handleApplyDateRange}
                    onClear={handleClearDateRange}
                    onClose={() => setIsDatePickerOpen(false)}
                    topOffset={pickerTopOffset}
                />
            )}

            {/* Modal de Configuración de Tasa */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-brand-900 border border-brand-700 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-white">Configurar Tasa del Día</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-brand-400 hover:text-white">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-300 mb-1">Fecha</label>
                                <input
                                    type="text"
                                    value={todayFormatted}
                                    disabled
                                    className="w-full bg-brand-800/50 border border-brand-700 rounded-lg px-3 py-2 text-brand-400 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-300 mb-1">Tasa de Cambio (Bs/USD)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-brand-500">Bs.</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={exchangeRate}
                                        onChange={(e) => setExchangeRate(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-brand-800 border border-brand-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-lg"
                                    />
                                </div>
                                <p className="text-xs text-brand-500 mt-1">Esta tasa se usará para calcular la facturación del día.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-300 mb-1">Tasa de Cambio (Bs/EUR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-brand-500">Bs.</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={euroRate}
                                        onChange={(e) => setEuroRate(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-brand-800 border border-brand-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-lg"
                                    />
                                </div>
                                <p className="text-xs text-brand-500 mt-1">Tasa de cambio del euro para el día.</p>
                            </div>

                            <button
                                onClick={handleSaveRate}
                                disabled={isSavingRate}
                                className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all flex justify-center items-center gap-2
                                ${saveSuccess ? 'bg-green-600' : 'bg-brand-600 hover:bg-brand-500'}
                            `}
                            >
                                {isSavingRate ? (
                                    <span className="animate-pulse">Guardando...</span>
                                ) : saveSuccess ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                        ¡Guardado!
                                    </>
                                ) : (
                                    'Confirmar Tasa'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición de Factura */}
            {isEditInvoiceModalOpen && (
                <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-brand-900 border border-brand-700 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-white">Editar Factura</h2>
                            <button onClick={() => setIsEditInvoiceModalOpen(false)} className="text-brand-400 hover:text-white">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-300 mb-1">Número de Factura</label>
                                <input
                                    type="text"
                                    value={editInvoiceNumber}
                                    onChange={(e) => setEditInvoiceNumber(e.target.value)}
                                    className="w-full bg-brand-800 border border-brand-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-300 mb-1">Fecha Factura</label>
                                <input
                                    type="date"
                                    value={editInvoiceDate ? new Date(editInvoiceDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setEditInvoiceDate(e.target.value)}
                                    className="w-full bg-brand-800 border border-brand-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            <button
                                onClick={saveEditedInvoice}
                                className="w-full py-3 px-4 rounded-lg font-bold text-white bg-brand-600 hover:bg-brand-500 transition-all flex justify-center items-center gap-2"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación de Factura */}
            {deleteInvoiceModal.isOpen && (
                <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-brand-900 border border-brand-700 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="h-12 w-12 rounded-full bg-red-900/30 flex items-center justify-center text-red-500 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                            </div>

                            <h3 className="text-xl font-bold text-white">¿Estás seguro?</h3>
                            <p className="text-brand-300">
                                Esta acción eliminará la factura permanentemente de la base de datos. No se puede deshacer.
                            </p>

                            <div className="grid grid-cols-2 gap-3 w-full pt-2">
                                <button
                                    onClick={() => setDeleteInvoiceModal({ isOpen: false, row: null })}
                                    className="py-2.5 px-4 bg-brand-800 hover:bg-brand-700 text-brand-200 font-semibold rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteInvoice}
                                    disabled={loading}
                                    className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Eliminando...' : 'Sí, Eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Modal de Edición de Fuente CxC */}
            {isEditCxCSourceOpen && (
                <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-brand-900 border border-brand-700 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-white">Editar Fuente</h2>
                            <button onClick={() => setIsEditCxCSourceOpen(false)} className="text-brand-400 hover:text-white">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-300 mb-1">Empresa / Fuente</label>
                                <input
                                    type="text"
                                    value={editCxCSource}
                                    onChange={(e) => setEditCxCSource(e.target.value)}
                                    className="w-full bg-brand-800 border border-brand-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="Nombre de la fuente..."
                                />
                            </div>

                            <button
                                onClick={saveCxCSourceEdit}
                                disabled={isSavingCxCSource || !editCxCSource.trim()}
                                className="w-full py-3 px-4 rounded-lg font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                            >
                                {isSavingCxCSource ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Guardando...
                                    </>
                                ) : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Resumen de CxC */}
            <CxCSummaryModal
                isOpen={isCxCSummaryOpen}
                onClose={() => setIsCxCSummaryOpen(false)}
                data={data}
            />
        </div>
    );
}

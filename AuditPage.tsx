

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { Spinner } from './components/Spinner';
import { ErrorMessage } from './components/ErrorMessage';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { BuildingOfficeIcon } from './components/icons/BuildingOfficeIcon';
import { parseFileToJSON } from './utils/fileParser';
import { queryData } from './services/geminiService';
import { fetchDataFromSupabase } from './services/supabaseService';
import type { Filters, DataRow, SummaryData, SourceSummary, ChatMessage } from './types';
import { FilterBar } from './components/FilterBar';
import { DataTable } from './components/DataTable';
import { SummaryDisplay } from './components/SummaryDisplay';
import { SourceSummaryDisplay } from './components/SourceSummaryDisplay';
import { DataQuery } from './components/DataQuery';
import { DateRangePicker } from './components/DateRangePicker';
import { ColumnSelector } from './components/ColumnSelector';
import { ExportMenu } from './components/ExportMenu';
import { DatabaseSync } from './components/DatabaseSync';

// Configuración de Supabase centralizada en supabaseClient.ts

// Tablas disponibles
const TABLE_PLUS = 'reservas';
const TABLE_PALM = 'reservaspalm';

interface AppState {
    status: 'idle' | 'loading' | 'processing' | 'display' | 'error';
    error: string | null;
    fileName: string | null;
    fileToProcess: File | null;
    rawData: DataRow[] | null;
    displayData: DataRow[] | null;
    headers: string[] | null;
    originalHeaderMap: Record<string, string> | null;
    detectedHotelType: string | null;
    isDatabaseSource: boolean;
}

const initialState: AppState = {
    status: 'idle',
    error: null,
    fileName: null,
    fileToProcess: null,
    rawData: null,
    displayData: null,
    headers: null,
    originalHeaderMap: null,
    detectedHotelType: null,
    isDatabaseSource: false,
};

const initialFilters: Filters = {
    source: '',
    status: '',
    originalStatus: '',
    arrivalDateStart: '',
    arrivalDateEnd: '',
    departureDateStart: '',
    departureDateEnd: '',
    reservationSearch: '',
    cancelledFilter: 'hidden', // Por defecto, ocultar canceladas
};

const initialSummary: SummaryData = {
    recordCount: 0,
    totalAdults: 0,
    totalChildren: 0,
    totalRooms: 0,
};

// Columnas deseadas y palabras clave para encontrarlas en el archivo original. La prioridad la da el orden en el array 'keywords'.
const DESIRED_COLUMNS_CONFIG = [
    { key: 'Nombre', keywords: ['nombre', 'cliente', 'huesped', 'guest'] },
    { key: 'Numero de la reserva', keywords: ['reserva', 'booking id', 'reservation'] },
    { key: 'Adultos', keywords: ['adultos', 'adults'] },
    { key: 'Niños', keywords: ['niños', 'nonos', 'children', 'kids'] },
    // Se prioriza 'Total Hab.' y se añaden acentos para evitar conflictos de nombres
    { key: 'Total Hab.', keywords: ['total de la habitacion', 'total de la habitación', 'total habitacion', 'total habitación', 'monto habitacion', 'monto habitación', 'monto hab', 'total hab', 'importe habitacion', 'rate', 'room total'] },
    { key: 'Numero de habitacion', keywords: ['habitacion', 'habitación', 'room', 'no. hab'] },
    { key: 'Monto Pagado', keywords: ['pagado', 'monto pagado', 'paid'] },
    { key: 'Fecha de llegada', keywords: ['llegada', 'arrival', 'inicio', 'check in', 'checkin'] },
    { key: 'Salida', keywords: ['salida', 'departure', 'fin', 'check out', 'checkout'] },
    { key: 'Noches', keywords: ['noches', 'nights'] },
    { key: 'Total General', keywords: ['total general', 'gran total', 'grand total', 'total'] },
    { key: 'Deposito', keywords: ['deposito', 'deposit', 'anticipo'] },
    { key: 'Saldo Pendiente', keywords: ['pendiente', 'saldo', 'balance', 'due'] },
    { key: 'Fuente', keywords: ['fuente', 'source', 'canal', 'channel'] },
    // UPDATE: Added 'estado' to keywords to fix the filter mapping issue
    { key: 'Estado de la Reserva', keywords: ['estado_1', 'status_1', 'estatus_1', 'estado_de_la_reserva', 'status', 'estatus', 'estado'] },
    // UPDATE: Removed 'estado' from Region to allow 'Estado de la Reserva' to capture it
    { key: 'Region', keywords: ['provincia', 'region', 'state'] },
];


const jsonToCSV = (jsonData: Record<string, any>[]): string => {
    if (!jsonData || jsonData.length === 0) {
        return '';
    }
    const headers = Object.keys(jsonData[0]);
    const csvRows = [headers.join(',')];
    for (const row of jsonData) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
};

/**
 * Finds the best matching header from a list of headers based on a prioritized list of keywords.
 * It respects the order of keywords in the array for priority.
 * Now accepts a Set of ignored headers to avoid shadowing.
 */
const findKey = (headers: string[], keywords: string[], ignoredHeaders?: Set<string>): string | null => {
    if (!headers) return null;

    // Iterate in the provided order of priority.
    for (const keyword of keywords) {
        for (const header of headers) {
            if (ignoredHeaders && ignoredHeaders.has(header)) continue;

            if (header.toLowerCase().includes(keyword.toLowerCase())) {
                return header;
            }
        }
    }

    return null;
};

/**
 * Intelligently finds the reservation status column by analyzing cell content.
 * This is more reliable than relying on header names alone, especially when multiple 'Estado' columns exist.
 */
const findStatusColumnByContent = (data: DataRow[], headers: string[]): string | null => {
    if (!data || data.length === 0 || !headers) return null;

    // Expanded keywords list to cover more scenarios and languages
    const statusKeywords = [
        // English
        'check in', 'check-in', 'checkin',
        'check out', 'check-out', 'checkout',
        'cancelled', 'canceled',
        'confirmed',
        'no show', 'noshow',
        'in house', 'inhouse',
        'guaranteed',
        // Spanish
        'entrada', 'salida',
        'pendiente',
        'cancelada', 'anulada',
        'confirmada', 'reservada',
        'uso casa', 'interno',
        'hospedado',
        'bloqueo', 'garantizada',
        'tentativa', 'espera'
    ];

    let bestColumn: string | null = null;
    let maxScore = 0;
    let maxScoreIndex = -1;

    // Analyze first 100 rows to get a better statistical sample
    const sampleData = data.slice(0, 100);

    headers.forEach((header, index) => {
        let currentScore = 0;
        const headerLower = header.toLowerCase();

        // Optimization: Skip columns that are likely dates or financial totals based on header name
        // unless it explicitly looks like a duplicate status column
        if (!header.match(/_\d+$/) && (headerLower.includes('fecha') || headerLower.includes('date') || headerLower.includes('monto') || headerLower.includes('rate') || headerLower.includes('total') || headerLower.includes('balance'))) {
            return; // continue equivalent in forEach
        }

        // Check for content match
        let hasContentMatch = false;
        for (const row of sampleData) {
            const value = String(row[header] || '').toLowerCase();
            if (value && value !== 'null' && value !== 'undefined' && value.trim() !== '') {
                for (const keyword of statusKeywords) {
                    if (value.includes(keyword)) {
                        currentScore++;
                        hasContentMatch = true;
                        break; // Max 1 point per row
                    }
                }
            }
        }

        // HUGE Bonus for columns that look like duplicates renamed by SheetJS (e.g. Estado_1), 
        // BUT ONLY if they have at least one content match. 
        // This prevents picking an empty "Estado_1" column over a filled "Estado" column if that ever happened.
        // In the user's case, AJ (Estado_1) has data, so this will trigger.
        if (header.match(/_\d+$/) && hasContentMatch) {
            currentScore += 50;
        }

        // Logic to prefer the LATEST column (Higher Index) in case of ties or near-ties.
        // This solves the Q vs AJ problem directly: AJ has a higher index than Q.
        // If Q has "Pending" and AJ has "Check In", both get points. 
        // But AJ is likely preferred in reports where duplicates exist.
        if (currentScore > maxScore) {
            maxScore = currentScore;
            bestColumn = header;
            maxScoreIndex = index;
        } else if (currentScore === maxScore && currentScore > 0) {
            // Tie-breaker: Pick the column that appears later in the file (Higher Index)
            // This assumes the later column is the "actual" one or the one intended for display
            if (index > maxScoreIndex) {
                bestColumn = header;
                maxScoreIndex = index;
            }
        }
    });

    // Return best column if we found any matches
    return maxScore > 0 ? bestColumn : null;
};

const processAndRenameData = (originalData: DataRow[], originalHeaders: string[]): { data: DataRow[], allHeaders: string[], defaultVisibleHeaders: string[], originalHeaderMap: Record<string, string> } => {
    const mapping: { [desiredKey: string]: string } = {}; // e.g., { 'Nombre': 'nombre del cliente' }
    const mappedOriginals = new Set<string>();

    // 1. Create mapping from desired key to original header
    DESIRED_COLUMNS_CONFIG.forEach(config => {
        // Pass mappedOriginals to avoid shadowing (e.g. 'Total Hab' matching 'Total Habitacion', 
        // preventing 'Numero de habitacion' from matching if it was the only one left).
        const originalHeader = findKey(originalHeaders, config.keywords, mappedOriginals);
        if (originalHeader && !mappedOriginals.has(originalHeader)) {
            mapping[config.key] = originalHeader;
            mappedOriginals.add(originalHeader);
        }
    });

    // 1.5 FORCE OVERRIDE: Specifically look for "Estado_1" or similar duplicates.
    // The user explicitly wants "estado_1" to be mapped to "Estado de la Reserva"
    const explicitDuplicateStatus = originalHeaders.find(h => /^(estado|status|estatus)(_1)$/i.test(h));
    if (explicitDuplicateStatus) {
        mapping['Estado de la Reserva'] = explicitDuplicateStatus;
        mappedOriginals.add(explicitDuplicateStatus);
    }

    // 2. Intelligent Override: Use content detection to verify or fix 'Estado de la Reserva'
    const statusHeaderByContent = findStatusColumnByContent(originalData, originalHeaders);
    if (statusHeaderByContent && !mapping['Estado de la Reserva']) {
        mapping['Estado de la Reserva'] = statusHeaderByContent;
        mappedOriginals.add(statusHeaderByContent);
    }

    // 3. Create a reverse mapping for efficient data processing
    const reverseMapping: { [originalHeader: string]: string } = {}; // e.g., { 'nombre del cliente': 'Nombre' }
    Object.keys(mapping).forEach(desiredKey => {
        const originalHeader = mapping[desiredKey];
        reverseMapping[originalHeader] = desiredKey;
    });

    // 4. Process the data: rename keys according to the mapping, keeping all columns
    const processedData = originalData.map(row => {
        const newRow: DataRow = {};
        for (const key in row) {
            const newRowKey = reverseMapping[key] || key;
            newRow[newRowKey] = row[key];
        }
        return newRow;
    });

    // 5. Create the full list of final headers, with renamed keys
    const allHeaders = originalHeaders.map(h => reverseMapping[h] || h);

    // 6. Determine which of the desired columns were successfully found and mapped
    let defaultVisibleHeaders = DESIRED_COLUMNS_CONFIG
        .map(c => c.key)
        .filter(key => allHeaders.includes(key));

    // 7. Reorder for Display: Ensure 'Total Hab.' comes after 'Numero de habitacion'
    const roomIndex = defaultVisibleHeaders.indexOf('Numero de habitacion');
    const totalIndex = defaultVisibleHeaders.indexOf('Total Hab.');

    if (roomIndex !== -1 && totalIndex !== -1) {
        defaultVisibleHeaders = defaultVisibleHeaders.filter(h => h !== 'Total Hab.');
        const newRoomIndex = defaultVisibleHeaders.indexOf('Numero de habitacion');
        defaultVisibleHeaders.splice(newRoomIndex + 1, 0, 'Total Hab.');
    }

    // 8. Prepare mapping for display (Normalized Key -> Original Header)
    const originalHeaderMap = { ...mapping };

    return { data: processedData, allHeaders, defaultVisibleHeaders, originalHeaderMap };
};


const getTodayDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Robustly parses a date input from various formats into a JS Date object normalized to local midnight.
 */
const parseDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;

    // Case 1: Already a Date object (from SheetJS with cellDates:true)
    if (dateInput instanceof Date) {
        if (isNaN(dateInput.getTime())) return null;
        // Normalize to midnight to remove time component
        dateInput.setHours(0, 0, 0, 0);
        return dateInput;
    }

    // Case 2: It's a number (Excel serial date number)
    if (typeof dateInput === 'number') {
        // Excel's epoch starts on 1900-01-01, but has a leap year bug for 1900.
        // The formula is (dateNumber - 25569) * 86400000.
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const jsDate = new Date(excelEpoch.getTime() + dateInput * 86400000);
        if (isNaN(jsDate.getTime())) return null;
        jsDate.setHours(0, 0, 0, 0);
        return jsDate;
    }

    // Case 3: It's a string (from date picker or a text cell)
    if (typeof dateInput === 'string') {
        let date: Date | null = null;

        // Try parsing YYYY-MM-DD (from date picker). Crucially, split and construct to avoid UTC issues.
        let parts = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (parts) {
            // new Date(year, monthIndex, day) creates a date in the local timezone.
            date = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
        } else {
            // Try parsing common European/Latin American formats like DD-MM-YYYY or DD/MM/YYYY.
            parts = dateInput.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
            if (parts) {
                date = new Date(parseInt(parts[3], 10), parseInt(parts[2], 10) - 1, parseInt(parts[1], 10));
            } else {
                // Last resort: try the native parser, which might handle other formats like "Nov 15 2025"
                const tempDate = new Date(dateInput);
                if (!isNaN(tempDate.getTime())) {
                    date = tempDate;
                }
            }
        }

        if (date && !isNaN(date.getTime())) {
            date.setHours(0, 0, 0, 0); // Normalize to midnight
            return date;
        }
    }

    return null;
};

// Helper to normalize string to snake_case (used to match DB columns)
const normalizeKey = (key: string): string => {
    return key
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s_]/g, '')
        .trim()
        .replace(/\s+/g, '_');
};

// Maps database snake_case columns back to the App's Title Case columns
const processDatabaseData = (dbData: DataRow[]): { data: DataRow[], allHeaders: string[], defaultVisibleHeaders: string[], originalHeaderMap: Record<string, string> } => {
    // Create a map of normalized keys (db columns) to Desired App Keys
    // e.g. 'numero_de_la_reserva' -> 'Numero de la reserva'
    const dbKeyToAppKeyMap: Record<string, string> = {};
    // Create reverse map for display: App Key -> Original DB Key
    const appKeyToDbKeyMap: Record<string, string> = {};

    // Identify all available keys in the database response (scan first 50 rows to be safe)
    const dbKeys = new Set<string>();
    const sampleSize = Math.min(dbData.length, 50);
    for (let i = 0; i < sampleSize; i++) {
        Object.keys(dbData[i]).forEach(k => dbKeys.add(k));
    }
    const allDbKeys = Array.from(dbKeys);

    DESIRED_COLUMNS_CONFIG.forEach(config => {
        // 1. Try matching by Exact Normalized Key
        const normalized = normalizeKey(config.key);
        if (allDbKeys.includes(normalized)) {
            dbKeyToAppKeyMap[normalized] = config.key;
            appKeyToDbKeyMap[config.key] = normalized;
        }

        // 2. Try matching by Keywords (Robustness similar to file import)
        config.keywords.forEach(keyword => {
            const normalizedKeyword = normalizeKey(keyword);
            const matchedDbKey = allDbKeys.find(dbKey => normalizeKey(dbKey) === normalizedKeyword);

            if (matchedDbKey) {
                dbKeyToAppKeyMap[matchedDbKey] = config.key;
                // Prefer exact match for reverse map, but fallback to keyword match
                if (!appKeyToDbKeyMap[config.key]) {
                    appKeyToDbKeyMap[config.key] = matchedDbKey;
                }
            }
        });
    });

    // Add manual overrides for specific DB column names requested by user.
    // Ensure both potential DB columns map to 'Estado de la Reserva'.
    // The data processing loop will handle merging if both exist.
    dbKeyToAppKeyMap['estado_de_la_reserva'] = 'Estado de la Reserva';
    dbKeyToAppKeyMap['estado_1'] = 'Estado de la Reserva';

    // Reverse map preference: Assume 'estado_de_la_reserva' is the "canonical" original name if it exists,
    // otherwise it will default to whatever was found first.
    appKeyToDbKeyMap['Estado de la Reserva'] = 'estado_de_la_reserva';


    // Collect all headers found in the DB data
    const foundDbHeaders = new Set<string>();
    if (dbData.length > 0) {
        Object.keys(dbData[0]).forEach(k => foundDbHeaders.add(k));
    }

    // Process data
    const processedData = dbData.map(row => {
        const newRow: DataRow = {};
        Object.keys(row).forEach(dbKey => {
            const appKey = dbKeyToAppKeyMap[dbKey] || dbKey; // Use mapped name or fallback to original

            let val = row[dbKey];
            // Attempt to parse dates if the key suggests it's a date field
            if (typeof val === 'string' && (appKey.toLowerCase().includes('fecha') || appKey.toLowerCase().includes('salida') || appKey.toLowerCase().includes('llegada'))) {
                const parsed = parseDate(val);
                if (parsed) val = parsed;
            }

            // FIX: Prevent overwriting existing valid data with empty/null data
            // This handles cases where multiple DB columns map to the same App Key (e.g. estado_1 vs estado_de_la_reserva)
            const currentVal = newRow[appKey];
            const hasCurrentVal = currentVal !== undefined && currentVal !== null && currentVal !== '';
            const hasNewVal = val !== undefined && val !== null && val !== '';

            if (hasCurrentVal && !hasNewVal) {
                // Keep the existing valid value, ignore the new empty value
                return;
            }

            newRow[appKey] = val;

            // Ensure we capture originals for any columns not in config but present in data
            if (!appKeyToDbKeyMap[appKey]) {
                appKeyToDbKeyMap[appKey] = dbKey;
            }
        });
        return newRow;
    });

    // Generate headers list - DEDUPLICATE using Set to avoid React key issues if multiple DB columns map to same App Key
    const mappedHeaders = Array.from(foundDbHeaders).map(h => dbKeyToAppKeyMap[h] || h);
    const allHeaders = Array.from(new Set(mappedHeaders));

    // Determine visible headers based on DESIRED_COLUMNS_CONFIG
    let defaultVisibleHeaders = DESIRED_COLUMNS_CONFIG
        .map(c => c.key)
        .filter(key => allHeaders.includes(key));

    // Add DB specific keys to visible headers if they exist
    if (allHeaders.includes('Estado de la Reserva')) {
        // Ensure it's added if not already matched
        if (!defaultVisibleHeaders.includes('Estado de la Reserva')) {
            defaultVisibleHeaders.push('Estado de la Reserva');
        }
    }

    // Swap room logic (same as file import)
    const roomIndex = defaultVisibleHeaders.indexOf('Numero de habitacion');
    const totalIndex = defaultVisibleHeaders.indexOf('Total Hab.');

    if (roomIndex !== -1 && totalIndex !== -1) {
        defaultVisibleHeaders = defaultVisibleHeaders.filter(h => h !== 'Total Hab.');
        const newRoomIndex = defaultVisibleHeaders.indexOf('Numero de habitacion');
        defaultVisibleHeaders.splice(newRoomIndex + 1, 0, 'Total Hab.');
    }

    return { data: processedData, allHeaders, defaultVisibleHeaders, originalHeaderMap: appKeyToDbKeyMap };
};


export function AuditPage() {
    const [appState, setAppState] = useState<AppState>(initialState);
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [sources, setSources] = useState<string[]>([]);
    const [statuses, setStatuses] = useState<string[]>([]);
    const [originalStatuses, setOriginalStatuses] = useState<string[]>([]);

    // Dynamic labels for status columns based on source (DB vs File)
    const [statusLabel, setStatusLabel] = useState('Estado de la Reserva');
    const [originalStatusLabel, setOriginalStatusLabel] = useState('Estado (Original)');

    const [summaryData, setSummaryData] = useState<SummaryData>(initialSummary);
    const [sourceSummary, setSourceSummary] = useState<SourceSummary[]>([]);
    const [queryHistory, setQueryHistory] = useState<ChatMessage[]>([]);
    const [isQuerying, setIsQuerying] = useState(false);
    const [pickerType, setPickerType] = useState<null | 'arrival' | 'departure'>(null);
    const [pickerTopOffset, setPickerTopOffset] = useState(0);
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const [activeTable, setActiveTable] = useState<string>(TABLE_PLUS);
    const headerRef = useRef<HTMLElement>(null);


    // Función reutilizable para cargar datos de Supabase
    const loadDatabaseData = useCallback(async (tableName: string) => {
        setAppState(prev => ({ ...prev, status: 'loading' }));

        try {
            const dbData = await fetchDataFromSupabase(tableName);

            if (dbData && dbData.length > 0) {
                const { data: processedData, allHeaders, defaultVisibleHeaders, originalHeaderMap } = processDatabaseData(dbData);

                // Determinar tipo de hotel basado en la tabla
                const hotelType = tableName === TABLE_PALM ? 'Palm' : 'Plus';
                const displayName = `Base de Datos: LD' ${hotelType}`;

                // Pass true for isDatabase
                configureDataState(processedData, allHeaders, defaultVisibleHeaders, originalHeaderMap, displayName, hotelType, true);
            } else {
                // If no data in DB, go to idle state to allow file upload
                setAppState(prev => ({ ...initialState, status: 'idle' }));
            }
        } catch (error) {
            console.error(`Error loading data from database table ${tableName}:`, error);
            // Fallback to idle state on error so user can upload a file manually
            setAppState(prev => ({ ...initialState, status: 'idle' }));
        }
    }, []);

    // Load data from Supabase on mount
    useEffect(() => {
        loadDatabaseData(TABLE_PLUS);
    }, [loadDatabaseData]);

    const handleTableSwitch = (table: string) => {
        if (table === activeTable) return;
        setActiveTable(table);
        loadDatabaseData(table);
    };

    const handleFileSelect = (file: File | null) => {
        if (!file) {
            handleReset();
            return;
        }
        setAppState({ ...initialState, status: 'loading', fileName: file.name, fileToProcess: file });
    };

    // Helper function to set state after data is loaded (from File or DB)
    const configureDataState = (processedData: DataRow[], allHeaders: string[], defaultVisibleHeaders: string[], originalHeaderMap: Record<string, string>, sourceName: string, hotelType: string | null = null, isDatabase: boolean = false) => {
        setVisibleColumns(defaultVisibleHeaders);

        // Set status labels
        setStatusLabel('Estado de la Reserva');
        setOriginalStatusLabel('Estado (Original)');

        const currentStatusLabel = 'Estado de la Reserva';
        const currentOriginalStatusLabel = 'Estado'; // Fallback if needed, usually not used if Estado de la Reserva has the data

        const sourceKey = 'Fuente';
        if (allHeaders.includes(sourceKey)) {
            const uniqueSourcesSet = new Set(
                processedData.map(row => String(row[sourceKey])).filter(Boolean)
            );
            setSources(Array.from(uniqueSourcesSet).sort());
        }

        if (allHeaders.includes(currentStatusLabel)) {
            const uniqueStatusesSet = new Set(
                processedData.map(row => String(row[currentStatusLabel])).filter(Boolean)
            );
            setStatuses(Array.from(uniqueStatusesSet).sort());
        }

        // Optional: Populate original statuses if column exists
        if (allHeaders.includes(currentOriginalStatusLabel)) {
            const uniqueOriginalStatusesSet = new Set(
                processedData.map(row => String(row[currentOriginalStatusLabel])).filter(Boolean)
            );
            setOriginalStatuses(Array.from(uniqueOriginalStatusesSet).sort());
        } else {
            setOriginalStatuses([]);
        }

        setQueryHistory([
            { role: 'model', text: '¡Hola! Tus datos están cargados. Ahora puedes hacerme preguntas sobre ellos.' }
        ]);

        setAppState(prev => ({
            ...prev,
            status: 'display',
            rawData: processedData,
            displayData: processedData,
            headers: allHeaders,
            originalHeaderMap: originalHeaderMap,
            fileToProcess: null,
            fileName: sourceName,
            detectedHotelType: hotelType,
            isDatabaseSource: isDatabase
        }));

        // Aplicar filtro inicial para mostrar solo las llegadas de hoy
        const today = getTodayDateString();
        setFilters({ ...initialFilters, arrivalDateStart: today, arrivalDateEnd: today });
    };

    useEffect(() => {
        const processFile = async () => {
            if (appState.status === 'loading' && appState.fileToProcess) {
                setAppState(prev => ({ ...prev, status: 'processing' }));
                try {
                    const { data: originalData, headers: originalHeaders } = await parseFileToJSON(appState.fileToProcess);

                    const { data: processedData, allHeaders, defaultVisibleHeaders, originalHeaderMap } = processAndRenameData(originalData, originalHeaders);

                    // --- Inicio: Lógica de detección de hotel basada en número de habitación ---
                    let hotelVariable = "";
                    const roomKey = 'Numero de habitacion';

                    if (allHeaders.includes(roomKey)) {
                        let count3Digits = 0;
                        let count4Digits = 0;

                        // Analizamos los primeros 100 registros para tener una muestra significativa
                        const sampleSize = Math.min(processedData.length, 100);

                        for (let i = 0; i < sampleSize; i++) {
                            const val = processedData[i][roomKey];
                            if (val) {
                                const strVal = String(val).trim();
                                // Revisamos estrictamente la longitud
                                if (strVal.length === 3) count3Digits++;
                                if (strVal.length === 4) count4Digits++;
                            }
                        }

                        if (count4Digits > count3Digits) {
                            hotelVariable = "Plus";
                        } else if (count3Digits > count4Digits) {
                            hotelVariable = "Palm";
                        }
                    }

                    // Definir el nombre final a mostrar
                    const displayFileName = hotelVariable
                        ? `Datos del hotel: ${hotelVariable}`
                        : appState.fileToProcess.name;
                    // --- Fin: Lógica de detección ---

                    // Pass false for isDatabase
                    configureDataState(processedData, allHeaders, defaultVisibleHeaders, originalHeaderMap, displayFileName, hotelVariable || null, false);

                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
                    setAppState(prev => ({ ...prev, status: 'error', error: `Fallo en el procesamiento del archivo: ${errorMessage}`, fileToProcess: null }));
                }
            }
        };
        processFile();
    }, [appState.status, appState.fileToProcess]);


    const handleQuery = useCallback(async (question: string, modelName: string) => {
        setIsQuerying(true);
        const userMessage: ChatMessage = { role: 'user', text: question };
        setQueryHistory(prev => [...prev, userMessage]);

        try {
            // Datos locales actuales (limitados)
            const MAX_ROWS = 500; // Menos filas para local ya que ahora tiene acceso a la BD
            const dataToProcess = (appState.displayData || []).slice(0, MAX_ROWS);
            const csvData = jsonToCSV(dataToProcess);

            // Mapeamos el historial al formato que espera Gemini SDK
            const geminiHistory = queryHistory.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            })) as any[];

            const toolHandler = async (name: string, args: any) => {
                if (name === 'list_database_tables') {
                    return [
                        'reservas', 'reservaspalm', 'transacciones_plus',
                        'transacciones_palm', 'notas_de_cuentas', 'factura', 'tasas_cambiarias'
                    ];
                }
                if (name === 'execute_database_query') {
                    const { table_name, select, filter, limit, order } = args;

                    // Importamos dinámicamente o usamos la función de supabaseService
                    const { executeDatabaseQuery } = await import('./services/supabaseService');
                    return await executeDatabaseQuery(table_name, select, filter, limit, order);
                }
                return { error: 'Función no reconocida' };
            };

            const result = await queryData(csvData, question, geminiHistory, toolHandler, modelName);
            const modelMessage: ChatMessage = { role: 'model', text: result };
            setQueryHistory(prev => [...prev, modelMessage]);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
            const errorModelMessage: ChatMessage = { role: 'model', text: `Lo siento, ocurrió un error: ${errorMessage}` };
            setQueryHistory(prev => [...prev, errorModelMessage]);
        } finally {
            setIsQuerying(false);
        }
    }, [appState.displayData, queryHistory]);

    const handleReset = () => {
        setAppState(initialState);
        setFilters(initialFilters);
        setSources([]);
        setStatuses([]);
        setOriginalStatuses([]);
        setSummaryData(initialSummary);
        setSourceSummary([]);
        setQueryHistory([]);
        setIsQuerying(false);
        setVisibleColumns([]);
        setStatusLabel('Estado de la Reserva');
        setOriginalStatusLabel('Estado (Original)');
    };

    const handleSourceSelect = (source: string) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            source: source,
        }));
    };

    const handleClearSourceFilter = () => {
        setFilters(prevFilters => ({
            ...prevFilters,
            source: '',
        }));
    };

    useEffect(() => {
        if (appState.status !== 'display' || !appState.rawData || !appState.headers) return;

        let filteredData = [...appState.rawData];
        const { source, status, originalStatus, arrivalDateStart, arrivalDateEnd, departureDateStart, departureDateEnd, reservationSearch, cancelledFilter } = filters;

        // FILTRO DE CANCELADAS/NO SHOW según el modo seleccionado
        const cancelTerms = ['cancelado', 'cancelada', 'cancelled', 'no show', 'noshow'];

        filteredData = filteredData.filter(row => {
            const rowStatus = String(row[statusLabel] || '').toLowerCase();
            const rowOriginalStatus = String(row[originalStatusLabel] || '').toLowerCase();

            const isCancelled = cancelTerms.some(term =>
                rowStatus.includes(term) || rowOriginalStatus.includes(term)
            );

            // Según el modo del filtro:
            if (cancelledFilter === 'hidden') {
                return !isCancelled; // Ocultar canceladas
            } else if (cancelledFilter === 'only') {
                return isCancelled; // Mostrar solo canceladas
            } else {
                return true; // Mostrar todas
            }
        });

        if (source) {
            filteredData = filteredData.filter(row => String(row['Fuente']) === source);
        }

        // Dynamic filtering based on active labels
        if (status) {
            filteredData = filteredData.filter(row => String(row[statusLabel]) === status);
        }

        if (originalStatus) {
            filteredData = filteredData.filter(row => String(row[originalStatusLabel]) === originalStatus);
        }

        if (reservationSearch) {
            const searchLower = reservationSearch.toLowerCase();
            filteredData = filteredData.filter(row =>
                String(row['Numero de la reserva'] || '').toLowerCase().includes(searchLower)
            );
        }

        // Filtro de Rango de Fecha de Llegada
        const arrivalKey = 'Fecha de llegada';
        if ((arrivalDateStart || arrivalDateEnd) && appState.headers.includes(arrivalKey)) {
            const startDate = parseDate(arrivalDateStart);
            const endDate = parseDate(arrivalDateEnd);

            filteredData = filteredData.filter(row => {
                const rowDate = parseDate(row[arrivalKey]);
                if (!rowDate) return false;

                const rowTime = rowDate.getTime();
                const startMatch = startDate ? rowTime >= startDate.getTime() : true;
                const endMatch = endDate ? rowTime <= endDate.getTime() : true;

                return startMatch && endMatch;
            });
        }

        // Filtro de Rango de Fecha de Salida
        const departureKey = 'Salida';
        if ((departureDateStart || departureDateEnd) && appState.headers.includes(departureKey)) {
            const startDate = parseDate(departureDateStart);
            const endDate = parseDate(departureDateEnd);

            filteredData = filteredData.filter(row => {
                const rowDate = parseDate(row[departureKey]);
                if (!rowDate) return false;

                const rowTime = rowDate.getTime();
                const startMatch = startDate ? rowTime >= startDate.getTime() : true;
                const endMatch = endDate ? rowTime <= endDate.getTime() : true;

                return startMatch && endMatch;
            });
        }

        // --- Calcular resúmenes ---
        const adultsKey = 'Adultos';
        const childrenKey = 'Niños';
        const roomKey = 'Numero de habitacion';
        const sourceKey = 'Fuente';

        let adults = 0;
        let children = 0;
        let totalRoomsCount = 0;
        const summaryBySource: { [key: string]: { totalRooms: number; totalAdults: number; totalChildren: number; } } = {};


        for (const row of filteredData) {
            const adultCount = parseInt(String(row[adultsKey]), 10) || 0;
            adults += adultCount;

            const childCount = parseInt(String(row[childrenKey]), 10) || 0;
            children += childCount;

            const roomValue = row[roomKey];
            let roomsInRow = 0;
            if (roomValue) {
                const individualRooms = String(roomValue)
                    .split(/[,\/;-]+/)
                    .map(r => r.trim())
                    .filter(r => r);

                roomsInRow = individualRooms.length;
            }

            const roomsForThisRow = roomsInRow > 0 ? roomsInRow : 1;
            totalRoomsCount += roomsForThisRow;

            // Resumen por Fuente
            const sourceName = String(row[sourceKey] || 'Desconocida');
            if (!summaryBySource[sourceName]) {
                summaryBySource[sourceName] = { totalRooms: 0, totalAdults: 0, totalChildren: 0 };
            }
            summaryBySource[sourceName].totalAdults += adultCount;
            summaryBySource[sourceName].totalChildren += childCount;
            summaryBySource[sourceName].totalRooms += roomsForThisRow;

        }

        // Setear Resumen General
        setSummaryData({
            recordCount: filteredData.length,
            totalAdults: adults,
            totalChildren: children,
            totalRooms: totalRoomsCount,
        });

        // Setear Resumen por Fuente
        const sourceSummaryArray = Object.entries(summaryBySource)
            .map(([source, data]) => ({ source, ...data }))
            .sort((a, b) => b.totalRooms - a.totalRooms); // Ordenar por más habitaciones

        setSourceSummary(sourceSummaryArray);

        setAppState(prev => ({ ...prev, displayData: filteredData }));
    }, [filters, appState.rawData, appState.headers, appState.status, statusLabel, originalStatusLabel]);

    const handleOpenPicker = (type: 'arrival' | 'departure') => {
        if (pickerType === type) {
            setPickerType(null);
            return;
        }
        if (headerRef.current) {
            const rect = headerRef.current.getBoundingClientRect();
            setPickerTopOffset(rect.bottom + 8);
        }
        setPickerType(type);
    };

    const handleApplyDateRange = (startDate: string, endDate: string) => {
        if (pickerType === 'arrival') {
            setFilters({ ...filters, arrivalDateStart: startDate, arrivalDateEnd: endDate });
        } else if (pickerType === 'departure') {
            setFilters({ ...filters, departureDateStart: startDate, departureDateEnd: endDate });
        }
        setPickerType(null);
    };

    const handleClearDateRange = () => {
        if (pickerType === 'arrival') {
            setFilters({ ...filters, arrivalDateStart: '', arrivalDateEnd: '' });
        } else if (pickerType === 'departure') {
            setFilters({ ...filters, departureDateStart: '', departureDateEnd: '' });
        }
        setPickerType(null);
    };

    const showFileUpload = appState.status === 'idle';
    const showLoading = appState.status === 'loading' || appState.status === 'processing';
    const showDataView = appState.status === 'display' && appState.rawData;
    const showError = appState.status === 'error' && appState.error;

    return (
        <div className="w-full flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
            <div className="w-full max-w-7xl mx-auto">
                <header ref={headerRef} className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <SparklesIcon className="w-8 h-8 text-brand-400" />
                        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                            Auditoria de Ingresos, LD' Hoteles
                        </h1>
                    </div>
                    <p className="text-lg text-brand-300">
                        Sube, filtra y analiza tus datos para descubrir información valiosa.
                    </p>
                </header>

                {pickerType && (
                    <DateRangePicker
                        key={pickerType}
                        initialStartDate={pickerType === 'arrival' ? filters.arrivalDateStart : filters.departureDateStart}
                        initialEndDate={pickerType === 'arrival' ? filters.arrivalDateEnd : filters.departureDateEnd}
                        onApply={handleApplyDateRange}
                        onClear={handleClearDateRange}
                        onClose={() => setPickerType(null)}
                        topOffset={pickerTopOffset}
                    />
                )}

                <div className="bg-brand-900/50 backdrop-blur-sm border border-brand-800 rounded-2xl shadow-2xl p-6 sm:p-8 transition-all duration-300">
                    {showFileUpload && <FileUpload onFileSelect={handleFileSelect} />}

                    {showLoading && <Spinner />}

                    {showError && <ErrorMessage message={appState.error} onReset={handleReset} />}

                    {showDataView && (
                        <div className='space-y-6 animate-fade-in'>

                            {/* Selector de Base de Datos */}
                            <div className="flex justify-center mb-2">
                                <div className="inline-flex bg-brand-900 border border-brand-700 p-1 rounded-xl shadow-inner">
                                    <button
                                        onClick={() => handleTableSwitch(TABLE_PLUS)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTable === TABLE_PLUS ? 'bg-brand-700 text-white shadow-md' : 'text-brand-300 hover:text-white'}`}
                                    >
                                        <BuildingOfficeIcon className="w-4 h-4" />
                                        LD' Plus
                                    </button>
                                    <button
                                        onClick={() => handleTableSwitch(TABLE_PALM)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTable === TABLE_PALM ? 'bg-brand-700 text-white shadow-md' : 'text-brand-300 hover:text-white'}`}
                                    >
                                        <BuildingOfficeIcon className="w-4 h-4" />
                                        LD' Palm Beach
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <h2 className="text-xl sm:text-2xl font-bold text-white">{appState.fileName}</h2>
                                <button
                                    onClick={handleReset}
                                    className="w-full sm:w-auto px-6 py-2 bg-brand-700 text-white font-semibold rounded-lg hover:bg-brand-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-opacity-50"
                                >
                                    Subir Otro Archivo
                                </button>
                            </div>

                            {/* Toggle compacto de filtro de canceladas */}
                            <div className="flex items-center gap-1 mb-4">
                                <button
                                    onClick={() => setFilters({ ...filters, cancelledFilter: 'hidden' })}
                                    className={`p-2 rounded-lg transition-all duration-300 ${filters.cancelledFilter === 'hidden' ? 'bg-brand-600 text-brand-100 shadow-md' : 'text-brand-500 hover:text-brand-300 hover:bg-brand-800/50'}`}
                                    title="Ocultar canceladas (por defecto)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setFilters({ ...filters, cancelledFilter: 'all' })}
                                    className={`p-2 rounded-lg transition-all duration-300 ${filters.cancelledFilter === 'all' ? 'bg-brand-600 text-brand-100 shadow-md' : 'text-brand-500 hover:text-brand-300 hover:bg-brand-800/50'}`}
                                    title="Mostrar todas las reservas"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setFilters({ ...filters, cancelledFilter: 'only' })}
                                    className={`p-2 rounded-lg transition-all duration-300 ${filters.cancelledFilter === 'only' ? 'bg-brand-600 text-brand-100 shadow-md' : 'text-brand-500 hover:text-brand-300 hover:bg-brand-800/50'}`}
                                    title="Mostrar solo canceladas"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                    </svg>
                                </button>
                            </div>

                            <FilterBar
                                filters={filters}
                                onFilterChange={setFilters}
                                onClearFilters={() => setFilters(initialFilters)}
                                sources={sources}
                                statuses={statuses}
                                originalStatuses={originalStatuses}
                                onOpenPicker={handleOpenPicker}
                                statusLabel={statusLabel}
                                originalStatusLabel={originalStatusLabel}
                            />
                            <div className="flex flex-wrap gap-3 items-center">
                                {appState.headers && appState.headers.length > 0 && (
                                    <ColumnSelector
                                        allColumns={appState.headers}
                                        selectedColumns={visibleColumns}
                                        onSelectionChange={setVisibleColumns}
                                        originalHeaderMap={appState.originalHeaderMap}
                                    />
                                )}
                                <ExportMenu
                                    data={appState.displayData || []}
                                    visibleColumns={visibleColumns}
                                    fileName={appState.fileName}
                                />
                                {!appState.isDatabaseSource && (
                                    <DatabaseSync
                                        data={appState.displayData || []}
                                        visibleColumns={visibleColumns}
                                        hotelType={appState.detectedHotelType}
                                    />
                                )}
                            </div>
                            <SummaryDisplay data={summaryData} />
                            <SourceSummaryDisplay
                                data={sourceSummary}
                                onSourceSelect={handleSourceSelect}
                                selectedSource={filters.source}
                                onClearSourceFilter={handleClearSourceFilter}
                                filters={filters}
                            />
                            <DataTable
                                headers={visibleColumns}
                                data={appState.displayData || []}
                                originalHeaderMap={appState.originalHeaderMap}
                                hotelSource={appState.detectedHotelType || (activeTable === 'reservaspalm' ? 'Palm' : 'Plus')}
                            />
                            <DataQuery onQuery={handleQuery} history={queryHistory} isQuerying={isQuerying} />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
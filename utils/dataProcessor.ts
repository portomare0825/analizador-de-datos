
import { DataRow } from '../types';

export const DESIRED_COLUMNS_CONFIG = [
    { key: 'Nombre', keywords: ['nombre', 'cliente', 'huesped', 'guest'] },
    { key: 'Numero de la reserva', keywords: ['reserva', 'booking id', 'reservation'] },
    { key: 'Adultos', keywords: ['adultos', 'adult', 'adults', 'pax_adulto', 'pax_a'] },
    { key: 'Niños', keywords: ['niños', 'ninos', 'children', 'kids', 'menores', 'infantes', 'pax_nino', 'pax_n'] },
    { key: 'Total Hab.', keywords: ['total_hab', 'total de la habitacion', 'total de la habitación', 'total habitacion', 'total habitación', 'monto habitacion', 'monto_hab', 'monto habitación', 'monto hab', 'total hab', 'importe habitacion', 'rate', 'room total'] },
    { key: 'Numero de habitacion', keywords: ['habitacion', 'habitación', 'room', 'no. hab', 'numero_de_habitacion'] },
    { key: 'Monto Pagado', keywords: ['pagado', 'monto pagado', 'monto_pagado', 'paid'] },
    { key: 'Fecha de llegada', keywords: ['llegada', 'arrival', 'inicio', 'check in', 'checkin', 'fecha_de_llegada'] },
    { key: 'Salida', keywords: ['salida', 'departure', 'fin', 'check out', 'checkout'] },
    { key: 'Noches', keywords: ['noches', 'nights'] },
    { key: 'Total General', keywords: ['total_general', 'total general', 'gran total', 'grand total', 'total'] },
    { key: 'Deposito', keywords: ['deposito', 'deposit', 'anticipo'] },
    { key: 'Saldo Pendiente', keywords: ['pendiente', 'saldo', 'balance', 'due'] },
    { key: 'Fuente', keywords: ['fuente', 'source', 'canal', 'channel'] },
    { key: 'Estado de la Reserva', keywords: ['estado_1', 'status_1', 'estatus_1', 'estado_de_la_reserva', 'status', 'estatus', 'estado'] },
    { key: 'Region', keywords: ['provincia', 'region', 'state'] },
];

/**
 * Robustly parses a date input from various formats into a JS Date object normalized to local midnight.
 */
export const parseDate = (dateInput: any): Date | null => {
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

        if (date && !isNaN(date.getTime())) {
            date.setHours(0, 0, 0, 0);
            return date;
        }
    }

    return null;
};

export const findKey = (headers: string[], keywords: string[], ignoredHeaders?: Set<string>): string | null => {
    if (!headers) return null;
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

export const processDatabaseData = (dbData: any[]) => {
    if (!dbData || dbData.length === 0) return { data: [], allHeaders: [], defaultVisibleHeaders: [], originalHeaderMap: {} };

    const firstRow = dbData[0];
    const allHeaders = Object.keys(firstRow);
    const appKeyToDbKeyMap: Record<string, string> = {};
    const usedDbHeaders = new Set<string>();

    DESIRED_COLUMNS_CONFIG.forEach(config => {
        const matchingDbHeader = findKey(allHeaders, config.keywords, usedDbHeaders);
        if (matchingDbHeader) {
            appKeyToDbKeyMap[config.key] = matchingDbHeader;
            usedDbHeaders.add(matchingDbHeader);
        }
    });

    const processedData = dbData.map(row => {
        const newRow: DataRow = { ...row };
        Object.entries(appKeyToDbKeyMap).forEach(([appKey, dbKey]) => {
            let val = row[dbKey];
            
            // Date parsing
            if (typeof val === 'string' && (appKey.toLowerCase().includes('fecha') || appKey.toLowerCase().includes('salida') || appKey.toLowerCase().includes('llegada'))) {
                const parsed = parseDate(val);
                if (parsed) val = parsed;
            }
            
            newRow[appKey] = val;
        });
        return newRow;
    });

    let defaultVisibleHeaders = DESIRED_COLUMNS_CONFIG
        .filter(c => appKeyToDbKeyMap[c.key])
        .map(c => c.key);

    if (allHeaders.includes('Estado de la Reserva')) {
        if (!defaultVisibleHeaders.includes('Estado de la Reserva')) {
            defaultVisibleHeaders.push('Estado de la Reserva');
        }
    }

    const roomIndex = defaultVisibleHeaders.indexOf('Numero de habitacion');
    const totalIndex = defaultVisibleHeaders.indexOf('Total Hab.');

    if (roomIndex !== -1 && totalIndex !== -1) {
        defaultVisibleHeaders = defaultVisibleHeaders.filter(h => h !== 'Total Hab.');
        const newRoomIndex = defaultVisibleHeaders.indexOf('Numero de habitacion');
        defaultVisibleHeaders.splice(newRoomIndex + 1, 0, 'Total Hab.');
    }

    return { data: processedData, allHeaders, defaultVisibleHeaders, originalHeaderMap: appKeyToDbKeyMap };
};

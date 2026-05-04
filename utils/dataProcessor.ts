
import { DataRow } from '../types';

export const DESIRED_COLUMNS_CONFIG = [
    { key: 'Nombre', keywords: ['nombre', 'cliente', 'huesped', 'guest'] },
    { key: 'Numero de la reserva', keywords: ['reserva', 'booking id', 'reservation'] },
    { key: 'Adultos', keywords: ['adultos', 'adults'] },
    { key: 'Niños', keywords: ['niños', 'nonos', 'children', 'kids'] },
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
    { key: 'Estado de la Reserva', keywords: ['estado_1', 'status_1', 'estatus_1', 'estado_de_la_reserva', 'status', 'estatus', 'estado'] },
    { key: 'Region', keywords: ['provincia', 'region', 'state'] },
];

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
            newRow[appKey] = row[dbKey];
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

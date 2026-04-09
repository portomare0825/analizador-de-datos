import { supabase } from '../supabaseClient';
import type { DataRow } from '../types';

/**
 * Convierte una cadena arbitraria (ej: "Fecha de llegada") en un slug snake_case (ej: "fecha_de_llegada")
 * compatible con nombres de columnas en PostgreSQL/Supabase.
 */
const normalizeKey = (key: string): string => {
    // Catch specific edge case where underscores might have been stripped
    if (key === 'estadodelareserva') return 'estado_de_la_reserva';

    // Optimization: if it already looks like a valid snake_case key, return it.
    if (/^[a-z0-9_]+$/.test(key)) {
        return key;
    }

    const normalized = key
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s_]/g, '')
        .trim()
        .replace(/\s+/g, '_');

    if (normalized === 'estadodelareserva') return 'estado_de_la_reserva';

    return normalized;
};

/**
 * Intenta formatear un valor para ser compatible con PostgreSQL.
 */
const formatValueForPostgres = (value: any): any => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'string') {
        const ddmmyyyy = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(.*)$/);
        if (ddmmyyyy) {
            const day = parseInt(ddmmyyyy[1], 10);
            const month = parseInt(ddmmyyyy[2], 10);
            const year = parseInt(ddmmyyyy[3], 10);

            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const mm = String(month).padStart(2, '0');
                const dd = String(day).padStart(2, '0');
                return `${year}-${mm}-${dd}`;
            }
        }
    }

    return value;
}

/**
 * Prepara una fila de datos para ser enviada.
 */
const prepareRecord = (row: DataRow, visibleColumns: string[]): Record<string, any> => {
    const record: Record<string, any> = {};

    visibleColumns.forEach(col => {
        const normalizedKey = normalizeKey(col);
        const originalValue = row[col];
        record[normalizedKey] = formatValueForPostgres(originalValue);
    });

    return record;
};

export const checkAndEmptyTable = async (
    tableName: string,
    primaryKey: string = 'id'
): Promise<{ success: boolean; message?: string }> => {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .not(primaryKey, 'is', null);

        if (error) {
            console.error("Error vaciando tabla:", error);
            return { success: false, message: `Error vaciando tabla: ${error.message}` };
        }

        return { success: true };

    } catch (error) {
        console.error("Error checking/emptying table:", error);
        return { success: false, message: error instanceof Error ? error.message : 'Error desconocido' };
    }
};

export const sendDataToSupabase = async (
    tableName: string,
    data: DataRow[],
    visibleColumns: string[],
    onProgress: (current: number, total: number) => void,
    conflictKey?: string
): Promise<{ success: number; inserted: number; updated: number; errors: number; lastError?: string; lastErrorCode?: string }> => {
    let successCount = 0;
    let errorCount = 0;
    let lastError: string | undefined;
    let lastErrorCode: string | undefined;

    // Tamaño del bloque a enviar por petición (1000 es un buen balance entre memoria y red)
    const CHUNK_SIZE = 1000;

    // 1. Preparar toda la lista en memoria (Vectorización)
    const preparedRecords = data.map(row => prepareRecord(row, visibleColumns));

    // 2. Enviar en bloques (Lotes)
    for (let i = 0; i < preparedRecords.length; i += CHUNK_SIZE) {
        const chunk = preparedRecords.slice(i, i + CHUNK_SIZE);

        try {
            let errorObj: any = null;

            if (conflictKey) {
                // Upsert: Intenta Insertar, si hay conflicto en `conflictKey`, hace Update.
                const { error } = await supabase
                    .from(tableName)
                    .upsert(chunk, {
                        onConflict: conflictKey,
                        ignoreDuplicates: false // Sobreescribe si existe
                    });
                errorObj = error;
            } else {
                // Insert normal si no se provee llave de conflicto
                const { error } = await supabase
                    .from(tableName)
                    .insert(chunk);
                errorObj = error;
            }

            if (!errorObj) {
                // Supabase no distingue fácilmente insertados vs actualizados en lote sin usar select()
                // Por compatibilidad de respuesta, todo el lote exitoso lo marcamos como éxito general
                successCount += chunk.length;
            } else {
                lastError = errorObj.message;
                lastErrorCode = errorObj.code;
                errorCount += chunk.length;
            }
        } catch (error) {
            errorCount += chunk.length;
            lastError = error instanceof Error ? error.message : 'Error desconocido';
        }

        // Actualizar la interfaz indicando hasta qué registro vamos
        onProgress(Math.min(i + CHUNK_SIZE, preparedRecords.length), preparedRecords.length);
    }

    // Nota: Como enviamos en lote, Supabase no retorna desglose fácil de `inserted` vs `updated`.
    // Retornamos todo exitoso como 'success' agregado en 'inserted'.
    return {
        success: successCount,
        inserted: successCount,
        updated: 0,
        errors: errorCount,
        lastError,
        lastErrorCode
    };
};

export interface FetchFilters {
    eq?: Record<string, any>;
    gte?: Record<string, any>;
    lte?: Record<string, any>;
    ilike?: Record<string, any>;
}

export const fetchDataFromSupabase = async (
    tableName: string,
    limit: number = 20000,
    filters?: FetchFilters
): Promise<DataRow[]> => {
    try {
        let allData: any[] = [];
        let from = 0;
        let to = 999;
        let finished = false;

        // Bucle para superar el límite de 1000 de PostgREST
        while (!finished && allData.length < limit) {
            let query = supabase
                .from(tableName)
                .select('*')
                .order('id', { ascending: false }); // Priorizar lo más reciente por defecto

            // Aplicar filtros directos de Supabase si existen
            if (filters) {
                if (filters.eq) {
                    Object.entries(filters.eq).forEach(([col, val]) => {
                        if (val !== undefined && val !== null && val !== '') query = query.eq(col, val);
                    });
                }
                if (filters.gte) {
                    Object.entries(filters.gte).forEach(([col, val]) => {
                        if (val) query = query.gte(col, val);
                    });
                }
                if (filters.lte) {
                    Object.entries(filters.lte).forEach(([col, val]) => {
                        if (val) query = query.lte(col, val);
                    });
                }
                if (filters.ilike) {
                    Object.entries(filters.ilike).forEach(([col, val]) => {
                        if (val) query = query.ilike(col, `%${val}%`);
                    });
                }
            }

            const { data, error } = await query.range(from, to);

            if (error) throw error;

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                if (data.length < 1000) {
                    finished = true;
                } else {
                    from += 1000;
                    to += 1000;
                }
            } else {
                finished = true;
            }
        }

        return allData as DataRow[];
    } catch (error) {
        console.error("Failed to fetch data from Supabase:", error);
        throw error;
    }
};

export const getExchangeRate = async (
    date: string
): Promise<number | null> => {
    try {
        const { data, error } = await supabase
            .from('tasas_cambiarias')
            .select('monto')
            .eq('fecha', date)
            .maybeSingle();

        if (error || !data) return null;
        return Number(data.monto);
    } catch (error) {
        console.error("Error fetching exchange rate:", error);
        return null;
    }
};

export const saveExchangeRate = async (
    date: string,
    rate: number
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('tasas_cambiarias')
            .upsert({
                fecha: date,
                monto: rate
            }, { onConflict: 'fecha' });

        if (error) {
            console.error("Error saving rate:", error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error saving exchange rate:", error);
        return false;
    }
};

const CHUNK_SIZE = 100;

export const fetchSourcesByReservationNumbers = async (resNumbers: string[]): Promise<Record<string, string>> => {
    if (!resNumbers.length) return {};

    const mapping: Record<string, string> = {};
    const uniqueResNumbers = Array.from(new Set(resNumbers));

    try {
        for (let i = 0; i < uniqueResNumbers.length; i += CHUNK_SIZE) {
            const chunk = uniqueResNumbers.slice(i, i + CHUNK_SIZE);
            const [plusRes, palmRes] = await Promise.all([
                supabase.from('reservas').select('numero_de_la_reserva, fuente').in('numero_de_la_reserva', chunk),
                supabase.from('reservaspalm').select('numero_de_la_reserva, fuente').in('numero_de_la_reserva', chunk)
            ]);

            if (plusRes.data) {
                plusRes.data.forEach(r => {
                    if (r.fuente) mapping[String(r.numero_de_la_reserva)] = r.fuente;
                });
            }

            if (palmRes.data) {
                palmRes.data.forEach(r => {
                    if (r.fuente) mapping[String(r.numero_de_la_reserva)] = r.fuente;
                });
            }
        }

        return mapping;
    } catch (error) {
        console.error("Error fetching sources batch:", error);
        return mapping;
    }
};

export const fetchTotalsByReservationNumbers = async (resNumbers: string[]): Promise<Record<string, number>> => {
    if (!resNumbers.length) return {};

    const totals: Record<string, number> = {};
    const uniqueResNumbers = Array.from(new Set(resNumbers));

    try {
        for (let i = 0; i < uniqueResNumbers.length; i += CHUNK_SIZE) {
            const chunk = uniqueResNumbers.slice(i, i + CHUNK_SIZE);
            const { data, error } = await supabase
                .from('notas_de_cuentas')
                .select('numero_de_la_reserva, monto, tasa')
                .in('numero_de_la_reserva', chunk);

            if (error) {
                console.error("Error fetching totals batch chunk:", error);
                continue;
            }

            if (data) {
                data.forEach(note => {
                    const resNum = String(note.numero_de_la_reserva);
                    const m = parseFloat(note.monto || 0);
                    const t = parseFloat(note.tasa || 0);
                    const totalBs = m * t;

                    if (!totals[resNum]) totals[resNum] = 0;
                    totals[resNum] += totalBs;
                });
            }
        }

        return totals;
    } catch (error) {
        console.error("Error fetching totals batch exception:", error);
        return totals;
    }
};

/**
 * Obtiene todas las fuentes únicas de las tablas reservas, reservaspalm y factura.
 */
export const fetchAllUniqueSources = async (): Promise<string[]> => {
    try {
        const [plusRes, palmRes, factRes] = await Promise.all([
            supabase.from('reservas').select('fuente'),
            supabase.from('reservaspalm').select('fuente'),
            supabase.from('factura').select('fuente')
        ]);

        const sourcesSet = new Set<string>();

        [plusRes, palmRes, factRes].forEach(res => {
            if (res.data) {
                res.data.forEach((item: any) => {
                    if (item.fuente) sourcesSet.add(String(item.fuente).trim());
                });
            }
        });

        return Array.from(sourcesSet).sort();
    } catch (error) {
        console.error("Error fetching global sources:", error);
        return [];
    }
};

export const fetchNotes = async (reservationId: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('transacciones')
            .select('fecha_hora,nota,debito,credito')
            .eq('num_reserva', reservationId)
            .order('fecha_hora', { ascending: false })
            .limit(10000);

        if (error) {
            console.error("Error fetching notes:", error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error("Error fetching notes:", error);
        return [];
    }
};

export const fetchNotesFromView = async (reservationId: string, viewName: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from(viewName)
            .select('*')
            .eq('numero_de_la_reserva', reservationId);

        if (error) {
            console.error("Error fetching notes from view:", error.message);
            return [];
        }

        return (data || []).map((item: any) => ({
            ...item,
            fecha_hora: item.created_at || item.fecha_edit || item.fecha || new Date().toISOString(),
            debito: item.monto !== undefined ? item.monto : item.debito,
            credito: item.tasa !== undefined ? item.tasa : item.credito,
            descripcion: item.nota || item.descripcion || item.observacion || 'Sin nota',
            nota: item.nota || item.descripcion || item.observacion || ''
        }));

    } catch (error) {
        console.error("Error fetching notes from view:", error);
        return [];
    }
};

export const fetchAccountNotes = async (reservationId: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('notas_de_cuentas')
            .select('id,created_at,fecha_edit,nota,descripcion,monto,tasa,hotel')
            .eq('numero_de_la_reserva', reservationId)
            .order('created_at', { ascending: false })
            .limit(10000);

        if (error) {
            console.error("Error fetching account notes:", error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error("Error fetching account notes:", error);
        return [];
    }
};

export const fetchTransactions = async (reservationId: string, tableName: string = 'transacciones_plus'): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('num_reserva', reservationId)
            .order('fecha_hora', { ascending: false })
            .limit(10000);

        if (error) {
            console.error("Error fetching transactions:", error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return [];
    }
};

export const copyTransactionsToNotes = async (reservationId: string, transactions: any[], hotel?: string): Promise<boolean> => {
    const records = transactions.map(trx => ({
        numero_de_la_reserva: reservationId,
        nota: trx.nota || '',
        descripcion: trx.descripcion || '',
        monto: trx.credito || trx.debito || 0,
        tasa: trx.tasa_manual || 0,
        fecha_edit: trx.fecha_hora || trx.fecha_servicio || new Date().toISOString(),
        hotel: hotel || null
    }));

    try {
        const { error } = await supabase
            .from('notas_de_cuentas')
            .insert(records);

        if (error) {
            console.error("Error saving notes:", error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error copying transactions to notes:", error);
        return false;
    }
};

export const updateAccountNotesRate = async (reservationId: string, newRate: number): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('notas_de_cuentas')
            .update({ tasa: newRate })
            .eq('numero_de_la_reserva', reservationId);

        if (error) {
            console.error("Error updating notes rate:", error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error updating notes rate:", error);
        return false;
    }
};

export const updateNoteRate = async (noteId: number, newRate: number): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('notas_de_cuentas')
            .update({ tasa: newRate })
            .eq('id', noteId);

        if (error) {
            console.error("Error updating note rate:", error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error updating note rate:", error);
        return false;
    }
};

export const deleteAccountNote = async (noteId: number): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('notas_de_cuentas')
            .delete()
            .eq('id', noteId);

        if (error) {
            console.error("Error deleting note:", error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error deleting note:", error);
        return false;
    }
};

export const updateInvoice = async (id: number, invoiceData: any): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('factura')
            .update(invoiceData)
            .eq('id', id);

        if (error) {
            console.error("Error updating invoice:", error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error updating invoice:", error);
        return false;
    }
};

export const deleteInvoice = async (id: number): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('factura')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting invoice:", error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error deleting invoice:", error);
        return false;
    }
};

export const saveInvoice = async (invoiceData: any): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('factura')
            .insert(invoiceData);

        if (error) {
            console.error("Error saving invoice:", error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error saving invoice:", error);
        return false;
    }
};

export const deleteTransaction = async (id: number, tableName: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting transaction:", error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return false;
    }
};

export const deleteTransactionsByRange = async (startDate: string, endDate: string, dateColumn: string, tableName: string): Promise<boolean> => {
    try {
        const endObj = new Date(endDate);
        endObj.setDate(endObj.getDate() + 1);
        const nextDay = endObj.toISOString().split('T')[0];

        const { data: rowsToDelete, error: selectError } = await supabase
            .from(tableName)
            .select('id')
            .gte(dateColumn, startDate)
            .lt(dateColumn, nextDay);

        if (selectError) {
            console.error("[Delete Batch] Error fetching IDs:", selectError.message);
            return false;
        }

        if (!rowsToDelete || rowsToDelete.length === 0) {
            return true;
        }

        const ids = rowsToDelete.map((r: any) => r.id);

        const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .in('id', ids);

        if (deleteError) {
            console.error("[Delete Batch] Error deleting IDs:", deleteError.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error in batch deletion:", error);
        return false;
    }
};

export const batchUpdateInvoices = async (updates: { id: string, fuente?: string, montobs?: number }[]): Promise<boolean> => {
    if (!updates.length) return true;

    try {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
            const chunk = updates.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(item =>
                supabase.from('factura').update({
                    fuente: item.fuente,
                    montobs: item.montobs
                }).eq('id', item.id)
            ));
        }
        return true;
    } catch (error) {
        console.error("Error in batchUpdateInvoices:", error);
        return false;
    }
};

export const executeDatabaseQuery = async (
    tableName: string,
    select: string = '*',
    filter: string = '',
    limit: number = 10000,
    order: string = ''
): Promise<any[]> => {
    try {
        let query = supabase.from(tableName).select(select).limit(limit);

        if (filter) {
            const match = filter.match(/^([^=]+)=([^.]+)\.(.+)$/);
            if (match) {
                const [, col, op, val] = match;
                if (op === 'eq') query = query.eq(col, val);
                else if (op === 'ilike') query = query.ilike(col, val);
                else if (op === 'gt') query = query.gt(col, val);
                else if (op === 'lt') query = query.lt(col, val);
                else if (op === 'gte') query = query.gte(col, val);
                else if (op === 'lte') query = query.lte(col, val);
                else console.warn(`Operador no soportado en filter: ${op}`);
            } else {
                console.warn(`Formato de filtro no reconocido: ${filter}`);
            }
        }

        if (order) {
            const [column, direction] = order.split('.');
            query = query.order(column, { ascending: direction !== 'desc' });
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data || [];
    } catch (error) {
        console.error("Database query failed:", error);
        throw error;
    }
};


export const getDatabaseMetrics = async () => {
    try {
        const { data, error } = await supabase.rpc('get_database_metrics');
        if (error) throw new Error(error.message);
        return data;
    } catch (error) {
        console.error("Failed to fetch database metrics:", error);
        return {
            db_size: '0 MB',
            db_size_bytes: 0,
            tables: [],
            latency_sample: 0,
            index_hit_rate: 0
        };
    }
};

/**
 * Guarda registros de cuenta por cobrar (CxC) entre fuentes.
 */
export const saveCxCRecords = async (records: {
    reserva_id: string;
    fuente_origen: string;
    fuente_destino: string;
    monto: number;
    descripcion: string;
    hotel: string;
    tipo?: string; // 'cxc' o 'intercambio'
    fecha_transaccion?: string;
    fecha_in?: string;
    fecha_out?: string;
    huesped?: string; // Nombre del huésped (se llena directamente al guardar)
}[]): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('cxc_interfuentes')
            .insert(records.map(({ huesped, ...r }) => ({
                ...r,
                Huesped: huesped, // Se guarda en la columna real
                fecha_transaccion: r.fecha_transaccion || new Date().toISOString(),
                estado: 'pendiente',
                tipo: r.tipo || 'cxc'
            })));

        if (error) {
            console.error("Error saving CxC records:", error.message, error.details, error.hint);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error in saveCxCRecords unexpected:", error);
        return false;
    }
};

/**
 * Obtiene todos los registros de la tabla cxc_interfuentes.
 */
export const fetchCxCRecords = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('cxc_interfuentes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        // Transformar para que DataTable lo entienda igual que una reserva si es necesario
        return (data || []).map(row => ({
            ...row,
            'Nombre': row.Huesped || row.huesped || row.descripcion || 'CxC Record',
            'Numero de la reserva': row.reserva_id,
            'monto_cxc': row.monto,
            'Fuente': row.fuente_destino,
            'Fecha Registro': row.fecha_transaccion,
            'Fecha de llegada': row.fecha_in,
            'Salida': row.fecha_out,
            'Tipo': row.tipo ? row.tipo.toUpperCase() : 'CxC',
            'Hotel': row.hotel ? row.hotel.toUpperCase() : 'N/A'
        }));
    } catch (error) {
        console.error("Error fetching CxC records:", error);
        return [];
    }
};

/**
 * Sincroniza los nombres de huéspedes en cxc_interfuentes buscándolos en reservas y reservaspalm.
 * Busca por reserva_id en ambas tablas y actualiza el campo 'huesped' en cxc_interfuentes.
 */
export const syncCxCGuestNames = async (): Promise<{ updated: number; errors: number }> => {
    let updatedCount = 0;
    let errorCount = 0;
    // Declarado fuera del try para que sea accesible en el catch
    let cxcRecords: any[] | null = null;

    try {
        // 1. Obtener todos los registros de cxc_interfuentes
        const { data, error: fetchError } = await supabase
            .from('cxc_interfuentes')
            .select('id, reserva_id, hotel')
            .or('Huesped.is.null,Huesped.eq.""') // Busca nulos o vacíos en la columna con H mayúscula
            .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        cxcRecords = data;

        if (!cxcRecords || cxcRecords.length === 0) {
            return { updated: 0, errors: 0 };
        }

        console.log(`[syncCxCGuestNames] Encontrados ${cxcRecords.length} registros sin huésped.`);

        // 2. Agrupar reserva_ids únicos para buscar eficientemente
        const uniqueReservaIds = [...new Set(cxcRecords.map(r => r.reserva_id).filter(Boolean))];

        if (uniqueReservaIds.length === 0) {
            return { updated: 0, errors: 0 };
        }

        console.log(`[syncCxCGuestNames] Buscando ${uniqueReservaIds.length} reservas únicas...`);

        // 3. Buscar huéspedes en ambas tablas
        const guestMap: Record<string, string> = {};

        // Buscar en reservas (Plus)
        const { data: plusData } = await supabase
            .from('reservas')
            .select('numero_de_la_reserva, nombre')
            .in('numero_de_la_reserva', uniqueReservaIds);

        if (plusData) {
            plusData.forEach(row => {
                if (row.numero_de_la_reserva && row.nombre) {
                    guestMap[row.numero_de_la_reserva] = row.nombre;
                }
            });
        }

        // Buscar en reservaspalm (Palm)
        const { data: palmData } = await supabase
            .from('reservaspalm')
            .select('numero_de_la_reserva, nombre')
            .in('numero_de_la_reserva', uniqueReservaIds);

        if (palmData) {
            palmData.forEach(row => {
                if (row.numero_de_la_reserva && row.nombre) {
                    guestMap[row.numero_de_la_reserva] = row.nombre;
                }
            });
        }

        console.log(`[syncCxCGuestNames] Huéspedes encontrados: ${Object.keys(guestMap).length}`);

        // 4. Actualizar registros en cxc_interfuentes
        for (const record of cxcRecords) {
            if (!record.reserva_id) continue;

            const guestName = guestMap[record.reserva_id];
            if (guestName) {
                const { error: updateError } = await supabase
                    .from('cxc_interfuentes')
                    .update({ Huesped: guestName }) // Actualiza la columna Huesped
                    .eq('id', record.id);

                if (updateError) {
                    console.error(`[syncCxCGuestNames] Error actualizando reserva ${record.reserva_id}:`, updateError);
                    errorCount++;
                } else {
                    updatedCount++;
                }
            } else {
                console.warn(`[syncCxCGuestNames] Huésped no encontrado para reserva ${record.reserva_id}`);
            }
        }

        console.log(`[syncCxCGuestNames] Completado: ${updatedCount} actualizados, ${errorCount} errores.`);
    } catch (error) {
        console.error("[syncCxCGuestNames] Error general:", error);
        errorCount = cxcRecords?.length || 0;
    }

    return { updated: updatedCount, errors: errorCount };
};

export const updateCxCSource = async (id: string, newSource: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('cxc_interfuentes')
            .update({ fuente_destino: newSource })
            .eq('id', id);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error updating CxC source:", error);
        return false;
    }
};


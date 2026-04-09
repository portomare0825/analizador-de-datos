
import type { DataRow } from '../types';

/**
 * Convierte una cadena arbitraria (ej: "Fecha de llegada") en un slug snake_case (ej: "fecha_de_llegada")
 * compatible con nombres de campos de bases de datos.
 */
const normalizeKey = (key: string): string => {
    return key
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
        .replace(/[^a-z0-9\s]/g, '') // Eliminar caracteres especiales
        .trim()
        .replace(/\s+/g, '_'); // Reemplazar espacios con guiones bajos
};

/**
 * Prepara una fila de datos para ser enviada.
 * Convierte las claves y formatea fechas.
 */
const prepareRecord = (row: DataRow, visibleColumns: string[]): Record<string, any> => {
    const record: Record<string, any> = {};
    
    visibleColumns.forEach(col => {
        const normalizedKey = normalizeKey(col);
        let value = row[col];

        // Manejo de fechas para APIs JSON
        if (value instanceof Date) {
            value = value.toISOString();
        }
        
        // Asegurar que no enviamos undefined
        record[normalizedKey] = value === undefined ? null : value;
    });

    return record;
};

export const sendDataToPocketBase = async (
    url: string, 
    collection: string, 
    token: string, 
    data: DataRow[], 
    visibleColumns: string[],
    onProgress: (current: number, total: number) => void
): Promise<{ success: number; errors: number }> => {
    
    // Limpiar URL final para evitar dobles slashes
    const cleanUrl = url.replace(/\/$/, "");
    const endpoint = `${cleanUrl}/api/collections/${collection}/records`;
    
    let successCount = 0;
    let errorCount = 0;

    // Enviamos los registros uno por uno (o en pequeños lotes si implementáramos promesas paralelas)
    // Para mantener el orden y feedback visual claro, lo hacemos secuencialmente aquí.
    for (let i = 0; i < data.length; i++) {
        const record = prepareRecord(data[i], visibleColumns);
        
        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = token;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(record),
            });

            if (!response.ok) {
                // Si falla, intentamos leer el error pero no detenemos todo el proceso
                console.error(`Error enviando registro ${i}:`, await response.text());
                errorCount++;
            } else {
                successCount++;
            }
        } catch (error) {
            console.error(`Error de red registro ${i}:`, error);
            errorCount++;
        }

        onProgress(i + 1, data.length);
    }

    return { success: successCount, errors: errorCount };
};

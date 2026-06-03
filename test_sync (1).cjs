const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSync() {
    console.log('--- Iniciando Prueba de Sincronización ---');

    // 1. Intentar obtener un registro para ver las columnas
    const { data: sample, error: colsError } = await supabase
        .from('cxc_interfuentes')
        .select('*')
        .limit(1);

    if (colsError) {
        console.error('Error al inspeccionar columnas:', colsError.message);
        return;
    }

    if (sample && sample.length > 0) {
        console.log('Columnas encontradas:', Object.keys(sample[0]));
    } else {
        console.log('La tabla está vacía, no puedo ver las columnas.');
    }

    // Probar con Huesped (Mayúscula)
    const { data: cxcRecords, error: fetchError } = await supabase
        .from('cxc_interfuentes')
        .select('id, reserva_id, hotel')
        .limit(10);

    if (fetchError) {
        console.error('Error al obtener CxC:', fetchError.message);
        return;
    }

    if (!cxcRecords || cxcRecords.length === 0) {
        console.log('No se encontraron registros con Huesped = NULL.');
        return;
    }

    console.log(`Se encontraron ${cxcRecords.length} registros para probar.`);

    const uniqueReservaIds = [...new Set(cxcRecords.map(r => r.reserva_id).filter(Boolean))];
    console.log('Reserva IDs a buscar:', uniqueReservaIds);

    // 2. Intentar buscar en reservaspalm
    const { data: palmData, error: palmError } = await supabase
        .from('reservaspalm')
        .select('numero_de_la_reserva, nombre')
        .in('numero_de_la_reserva', uniqueReservaIds);

    if (palmError) console.error('Error en reservaspalm:', palmError.message);
    
    // 3. Intentar buscar en reservas
    const { data: plusData, error: plusError } = await supabase
        .from('reservas')
        .select('numero_de_la_reserva, nombre')
        .in('numero_de_la_reserva', uniqueReservaIds);

    if (plusError) console.error('Error en reservas:', plusError.message);

    const guestMap = {};
    if (palmData) palmData.forEach(r => guestMap[r.numero_de_la_reserva] = r.nombre);
    if (plusData) plusData.forEach(r => guestMap[r.numero_de_la_reserva] = r.nombre);

    console.log('Huéspedes encontrados en BD:', guestMap);

    // 4. Reportar resultados
    for (const record of cxcRecords) {
        const found = guestMap[record.reserva_id];
        console.log(`Registro ${record.id} (Reserva: ${record.reserva_id}): ${found ? 'ENCONTRADO -> ' + found : 'NO ENCONTRADO'}`);
    }
}

testSync();

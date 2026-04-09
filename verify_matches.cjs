const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
    console.log('--- Buscando Datos para Sincronización ---');
    
    // 1. Obtener registros sin Huesped
    const { data: cxcList, error: e1 } = await supabase
        .from('cxc_interfuentes')
        .select('id, reserva_id, hotel')
        .or('Huesped.is.null,Huesped.eq.""')
        .limit(10);

    if (e1) {
        console.error('Error CxC:', e1.message);
        return;
    }

    if (!cxcList || cxcList.length === 0) {
        console.log('No hay registros sin Huesped. ¡Todo parece estar sincronizado o la tabla está vacía!');
        return;
    }

    console.log(`Encontrados ${cxcList.length} registros para sincronizar.`);
    const ids = cxcList.map(r => r.reserva_id).filter(Boolean);

    // 2. Buscar en reservaspalm
    console.log('Buscando en reservaspalm para IDs:', ids);
    const { data: palmData } = await supabase
        .from('reservaspalm')
        .select('numero_de_la_reserva, nombre')
        .in('numero_de_la_reserva', ids);

    console.log('Matches en reservaspalm:', palmData?.length || 0);
    if (palmData) palmData.forEach(p => console.log(`- Reserva ${p.numero_de_la_reserva}: ${p.nombre}`));

    // 3. Buscar en reservas
    console.log('Buscando en reservas para IDs:', ids);
    const { data: plusData } = await supabase
        .from('reservas')
        .select('numero_de_la_reserva, nombre')
        .in('numero_de_la_reserva', ids);

    console.log('Matches en reservas:', plusData?.length || 0);
    if (plusData) plusData.forEach(p => console.log(`- Reserva ${p.numero_de_la_reserva}: ${p.nombre}`));
}

runTest();

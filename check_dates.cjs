const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://mvgixuikuvlwbuuenlpq.supabase.co', 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu');

async function checkAll() {
    for (const table of ['transacciones_palm', 'transacciones_plus']) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        console.log(`${table}: ${error ? 'ERROR: ' + error.message : count + ' registros'}`);
        
        if (!error && count > 0) {
            const { data } = await supabase.from(table).select('id, fecha_servicio, fecha_hora, num_reserva').limit(2);
            console.log('  Muestra:', data);
        }
    }
}
checkAll();

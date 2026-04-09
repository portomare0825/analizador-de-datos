const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listTables() {
    console.log('--- Listando tablas en el proyecto ---');
    
    // We can query the information_schema via RPC if available, or just try to guess.
    // However, usually we can't query information_schema with anon key.
    
    // Let's try to fetch 1 row from several likely tables
    const tables = ['transacciones_palm', 'transacciones_plus', 'reservas', 'reservaspalm', 'factura', 'notas_de_cuentas', 'cxc_interfuentes'];
    
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Table ${table}: ERROR - ${error.message}`);
        } else {
            console.log(`Table ${table}: ${count} rows`);
        }
    }
}

listTables();


import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const supabaseKey = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log("Listando tablas en el esquema public...");
    const { data, error } = await supabase.rpc('get_tables'); // A veces rpc está disponible
    
    if (error) {
        // Fallback: intentar consultar information_schema si los permisos lo permiten (poco probable via anon key)
        console.log("RPC falló, intentando consulta directa a tablas conocidas...");
        const tablesToCheck = ['factura', 'facturas', 'invoices', 'facturación', 'factura_plus', 'factura_palm'];
        for (const t of tablesToCheck) {
            const { count, error: err } = await supabase.from(t).select('*', { count: 'exact', head: true });
            if (!err) {
                console.log(`Tabla '${t}' existe y tiene ${count} registros.`);
            }
        }
    } else {
        console.log("Tablas encontradas:", JSON.stringify(data, null, 2));
    }
}

listTables();


import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const supabaseKey = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("Consultando columnas de la tabla factura...");
    // Intentamos una consulta que falle o nos devuelva metadata
    const { data, error } = await supabase.from('factura').select('*').limit(1);
    
    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Columnas encontradas:", Object.keys(data[0]));
        console.log("Primer registro:", JSON.stringify(data[0], null, 2));
    } else {
        console.log("No se encontraron registros en 'factura'.");
    }
}

checkColumns();


import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const supabaseKey = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Revisando datos de la tabla factura...");
    const { data, error } = await supabase.from('factura').select('*').limit(5);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkData();

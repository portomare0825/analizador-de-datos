const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectData() {
    console.log('--- Inspeccionando cxc_interfuentes ---');
    
    // 1. Obtener los primeros 5 registros de cxc_interfuentes sin filtros
    const { data, error } = await supabase
        .from('cxc_interfuentes')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error al leer tabla:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('La tabla cxc_interfuentes parece estar vacía desde la conexión del cliente.');
    } else {
        console.log(`Encontrados ${data.length} registros.`);
        console.log('Columnas presentes:', Object.keys(data[0]));
        console.log('Ejemplo de registro:', JSON.stringify(data[0], null, 2));
    }
}

inspectData();

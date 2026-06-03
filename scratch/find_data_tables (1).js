
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
    // Intentar listar tablas de forma indirecta o por lo menos ver qué responde public
    console.log('--- Buscando tablas con datos ---');
    const potentialTables = [
        'reservas', 'reservaspalm', 'factura', 'notas_de_cuentas', 
        'transacciones', 'tasas_cambiarias', 'reservas_plus', 'reservas_palm'
    ];

    for (const table of potentialTables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
            
        if (error) {
            console.log(`Tabla ${table}: Error (${error.message})`);
        } else {
            console.log(`Tabla ${table}: ${count} registros`);
            if (count > 0) {
                // Ver una fila para ver las columnas
                const { data } = await supabase.from(table).select('*').limit(1);
                console.log(`   Columnas: ${Object.keys(data[0])}`);
            }
        }
    }
}

check();


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
    console.log('--- Buscando schemas y tablas ---');
    // Intentar una consulta que falle y nos dé pistas o usar rpc si existe
    const { data, error } = await supabase.from('reservas').select('*').limit(1);
    if (error) {
        console.log('Error en reservas:', error);
    } else {
        console.log('Tabla reservas existe en public y tiene', data.length, 'filas (limit 1)');
    }

    // Probar con esquema explícito si es posible (aunque supabase-js no lo soporta directamente fácil en from)
    // Pero podemos probar nombres como "audit.reservas" si el usuario lo configuró así
}

check();

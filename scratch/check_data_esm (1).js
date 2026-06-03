
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Leer .env.local manualmente
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
    console.log('Consultando proyecto:', env.VITE_SUPABASE_URL);
    
    // Probar con nombres normalizados (snake_case)
    const tables = ['reservas', 'reservaspalm'];
    const column = 'fecha_de_llegada';

    for (const table of tables) {
        console.log(`--- Analizando tabla: ${table} ---`);
        const { data, error } = await supabase
            .from(table)
            .select(column)
            .order(column, { ascending: false })
            .limit(5000);
            
        if (error) {
            console.error(`Error en ${table}:`, error.message);
            continue;
        }

        if (data && data.length > 0) {
            const dates = data.map(d => d[column]).filter(Boolean);
            console.log(`Total registros: ${dates.length}`);
            console.log(`Rango: ${dates[dates.length - 1]} hasta ${dates[0]}`);

            const months = {};
            dates.forEach(d => {
                const m = d.substring(0, 7); // YYYY-MM
                months[m] = (months[m] || 0) + 1;
            });
            console.log('Distribución por meses:', months);
        } else {
            console.log(`No hay datos en ${table}`);
        }
    }
}

check();

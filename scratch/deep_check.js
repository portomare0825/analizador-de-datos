
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
    console.log('--- Listando todas las tablas accesibles ---');
    // En Supabase, si no tenemos acceso a information_schema, podemos probar tablas comunes
    const tables = [
        'reservas', 'reservaspalm', 'factura', 'notas_de_cuentas', 
        'transacciones', 'tasas_cambiarias', 'cxc_interfuentes',
        'usuarios', 'propiedades', 'habitaciones'
    ];

    for (const t of tables) {
        const { data, count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`Tabla ${t}: ${count} filas`);
            if (count > 0) {
                const { data: first } = await supabase.from(t).select('*').limit(1);
                console.log(`   Columnas: ${Object.keys(first[0])}`);
                
                // Si es una tabla de reservas, ver el rango de fechas
                if (t.includes('reserva')) {
                    const { data: dates } = await supabase.from(t).select('fecha_de_llegada').order('fecha_de_llegada', { ascending: false }).limit(5000);
                    const dList = dates.map(d => d.fecha_de_llegada).filter(Boolean);
                    console.log(`   Rango de fechas: ${dList[dList.length-1]} a ${dList[0]}`);
                    const months = {};
                    dList.forEach(d => { const m = d.substring(0, 7); months[m] = (months[m] || 0) + 1; });
                    console.log(`   Meses:`, months);
                }
            }
        } else {
            // console.log(`Tabla ${t}: No accesible o no existe`);
        }
    }
}

check();

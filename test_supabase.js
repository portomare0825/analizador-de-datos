import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parsear .env.local de forma simple
const envContent = fs.readFileSync('.env.local', 'utf-8');
const lines = envContent.split('\n');
const env = {};
lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", supabaseUrl);
console.log("Anon Key (length):", supabaseAnonKey?.length);
console.log("Service Key (length):", supabaseServiceKey?.length);

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error("Faltan variables de entorno en .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    // Intentar insertar con anon key (debería fallar o pasar según políticas RLS)
    console.log("Probando inserción con Anon Key...");
    const { error: anonError } = await supabase
        .from('transacciones_plus')
        .insert([{
            num_reserva: 'TEST_ANON',
            fecha_hora: new Date().toISOString(),
            descripcion: 'Test Anon RLS'
        }]);
    
    if (anonError) {
        console.error("Error Anon:", anonError.message);
    } else {
        console.log("Inserción con Anon Key exitosa (¡no debería de haber RLS estricto o falló la prueba!)");
    }

    // Intentar insertar con admin key (debería pasar siempre si la clave es correcta)
    console.log("Probando inserción con Admin Key...");
    const { error: adminError } = await supabaseAdmin
        .from('transacciones_plus')
        .insert([{
            num_reserva: 'TEST_ADMIN',
            fecha_hora: new Date().toISOString(),
            descripcion: 'Test Admin RLS'
        }]);

    if (adminError) {
        console.error("Error Admin:", adminError.message);
    } else {
        console.log("Inserción con Admin Key exitosa.");
    }

    // Limpiar registros de prueba
    console.log("Limpiando registros de prueba...");
    await supabaseAdmin.from('transacciones_plus').delete().eq('num_reserva', 'TEST_ANON');
    await supabaseAdmin.from('transacciones_plus').delete().eq('num_reserva', 'TEST_ADMIN');
    console.log("Limpieza completada.");
}

test();

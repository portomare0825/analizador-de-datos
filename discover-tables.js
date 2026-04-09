
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12Z2l4dWlrdXZsd2J1dWVubHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk1Njc3NSwiZXhwIjoyMDc1NTMyNzc1fQ.FgxCaUDEIg8AJTV5gjbpEcM0i4nrSEB77K82-bEh9VA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAllTables() {
  // Con Service Role podemos correr SQL via RPC si existe, o intentar adivinar esquemas
  // Pero lo más fácil es usar la API de PostgREST para preguntar por el esquema si es público
  // O simplemente intentar un listado de tablas conocido.
  
  // Vamos a intentar obtener el recuento de filas de una lista sospechosa
  const tablesToCheck = [
    'plus', 'palm', 'reservas', 'factura', 'cxc_interfuentes',
    'reservas_sin_nota_plus', 'reservas_sin_nota_palm',
    'reservas_filtradas_plus', 'reservas_filtradas_palm'
  ];

  for (const t of tablesToCheck) {
    const { count, error } = await supabase
      .from(t)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
    //   console.log(`Table ${t} not found or error: ${error.message}`);
    } else {
      console.log(`Table ${t} exists and has ${count} rows.`);
    }
  }
}

listAllTables();

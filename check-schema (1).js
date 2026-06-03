
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase config');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('cxc_interfuentes')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching cxc_interfuentes:', error.message);
  } else {
    console.log('Columns in cxc_interfuentes:', data[0] ? Object.keys(data[0]) : 'Table is empty, but accessible');
  }

  // Si no hay datos, intentar ver el esquema via RPC o simplemente intentar una inserción de prueba (no recomendada)
  // Mejor intentar otra tabla conocida como "factura"
  const { data: factura, error: facturaError } = await supabase
    .from('factura')
    .select('*')
    .limit(1);
  if (facturaError) {
     console.error('Error fetching factura:', facturaError.message);
  } else {
     console.log('Columns in factura:', factura[0] ? Object.keys(factura[0]) : 'factura table is empty');
  }
}

checkColumns();

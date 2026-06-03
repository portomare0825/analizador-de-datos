
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

async function debugData() {
  const { data: cxc } = await supabase.from('cxc_interfuentes').select('reserva_id').limit(2);
  console.log('Target IDs:', cxc.map(r => r.reserva_id));

  const tables = [
    'reservas_filtradas_plus', 
    'reservas_filtradas_palm',
    'factura'
  ];

  for (const t of tables) {
    // Intentar buscar los IDs específicos en estas tablas
    for (const rid of cxc.map(r => r.reserva_id)) {
      const { data, error } = await supabase
        .from(t)
        .select('*')
        .or(`"Numero de la reserva".eq.${rid},numero_de_la_reserva.eq.${rid},num_reserva.eq.${rid},registro_reserva.eq.${rid}`)
        .limit(1);
      
      if (data && data.length > 0) {
        console.log(`Found ID ${rid} in table ${t}!`);
        console.log(`Keys:`, Object.keys(data[0]));
        console.log(`Values:`, data[0]);
        return; // Detenemos al encontrar uno para no llenar el log
      }
    }
    console.log(`Checked table ${t}, no matches found.`);
  }
}

debugData();

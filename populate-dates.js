
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

async function updateDates() {
  console.log('Fetching cxc_interfuentes records...');
  // Seleccionamos solo los que aún no tienen fechas para ser eficientes
  const { data: cxcRecords, error: cxcError } = await supabase
    .from('cxc_interfuentes')
    .select('id, reserva_id')
    .or('fecha_in.is.null,fecha_out.is.null');

  if (cxcError) {
    console.error('Error fetching records:', cxcError.message);
    return;
  }

  if (cxcRecords.length === 0) {
    console.log('All records already have dates. No further updates needed.');
    return;
  }

  console.log(`Found ${cxcRecords.length} records needing dates. Searching in "reservas" and "reservaspalm"...`);

  let updatedCount = 0;
  const sourceTables = ['reservas', 'reservaspalm'];

  for (const record of cxcRecords) {
    const { reserva_id, id } = record;
    if (!reserva_id) continue;

    let arrivalDate = null;
    let departureDate = null;

    for (const tableName of sourceTables) {
      const { data: sourceData, error: sourceError } = await supabase
        .from(tableName)
        .select('fecha_de_llegada, salida')
        .eq('numero_de_la_reserva', reserva_id)
        .limit(1);

      if (sourceError || !sourceData || sourceData.length === 0) continue;

      const item = sourceData[0];
      arrivalDate = item.fecha_de_llegada;
      departureDate = item.salida;

      if (arrivalDate || departureDate) {
        const { error: updateError } = await supabase
          .from('cxc_interfuentes')
          .update({
            fecha_in: arrivalDate,
            fecha_out: departureDate
          })
          .eq('id', id);

        if (!updateError) {
          updatedCount++;
          console.log(`Updated ID ${id} (Reserva ${reserva_id}) from ${tableName}`);
          break; // Stop searching if found
        }
      }
    }
  }

  console.log(`Update process finished. Newly updated: ${updatedCount}/${cxcRecords.length}`);
}

updateDates();


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

async function inspectReservas() {
  const { data, error } = await supabase.from('reservas').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Columns in reservas:', Object.keys(data[0]));
    console.log('Sample data:', data[0]);
  } else {
    console.log('Table reservas is empty or error:', error?.message);
  }
}

inspectReservas();

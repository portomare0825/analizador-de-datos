const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

// Leer variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function main() {
  try {
    console.log('Consultando esquema de tabla "profiles"...');
    
    // Consulta para listar columnas de profiles en Postgres
    const { data: cols, error: errCols } = await supabase
      .rpc('get_table_columns', { table_name: 'profiles' }) // Si existe RPC
      .select('*')
      .limit(1);
      
    if (errCols) {
      console.log('RPC get_table_columns falló o no existe. Intentando consultar datos de profiles...');
      const { data: rows, error: errRows } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
        
      if (errRows) {
        console.error('Error al consultar la tabla profiles:', errRows);
      } else {
        console.log('Fila de ejemplo de profiles:', rows);
        if (rows.length > 0) {
          console.log('Columnas disponibles:', Object.keys(rows[0]));
        } else {
          console.log('La tabla profiles está vacía.');
        }
      }
    } else {
      console.log('Resultado RPC columns:', cols);
    }
  } catch (error) {
    console.error('Error no controlado:', error);
  }
}

main();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de entorno");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const id = '5558410882996';
  
  // 1. Check reservas
  console.log("Checking reservas...");
  const { data: resData, error: resErr } = await supabase
    .from('reservas')
    .select('numero_de_la_reserva, total_hab, total_general')
    .eq('numero_de_la_reserva', id);
    
  if (resErr) console.error("Error reservas:", resErr.message);
  else console.log("Reservas:", JSON.stringify(resData, null, 2));
  
  // 2. Check reservaspalm
  console.log("Checking reservaspalm...");
  const { data: palmData, error: palmErr } = await supabase
    .from('reservaspalm')
    .select('numero_de_la_reserva, total_hab, total_general')
    .eq('numero_de_la_reserva', id);
    
  if (palmErr) console.error("Error reservaspalm:", palmErr.message);
  else console.log("Reservaspalm:", JSON.stringify(palmData, null, 2));

  // 3. Check cxc
  console.log("Checking cxc_interfuentes...");
  const { data: cxcData, error: cxcErr } = await supabase
    .from('cxc_interfuentes')
    .select('*')
    .eq('reserva_id', id);
    
  if (cxcErr) console.error("Error cxc:", cxcErr.message);
  else console.log("CxC:", JSON.stringify(cxcData, null, 2));
}

checkData();

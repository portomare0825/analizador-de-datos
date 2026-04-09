const url = process.env.VITE_SUPABASE_URL + '/rest/v1/reservas?numero_de_la_reserva=eq.5558410882996';
const urlPalm = process.env.VITE_SUPABASE_URL + '/rest/v1/reservaspalm?numero_de_la_reserva=eq.5558410882996';
const headers = {
  'apikey': process.env.VITE_SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY
};

async function run() {
  let res = await fetch(url, { headers });
  let data = await res.json();
  console.log("Reservas:", data);

  res = await fetch(urlPalm, { headers });
  data = await res.json();
  console.log("Reservaspalm:", data);
}

run().catch(console.error);

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    console.log('Project:', SUPABASE_URL);
    
    // Check total count using count: exact
    const { count, error, status } = await supabase
        .from('transacciones_palm')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error('Count Error:', error);
    } else {
        console.log('Total Rows in transacciones_palm:', count, 'Status:', status);
    }

    // Attempt to fetch the LATEST 5 records
    const { data: latest, error: latestError } = await supabase
        .from('transacciones_palm')
        .select('id, fecha_servicio, num_reserva')
        .order('id', { ascending: false })
        .limit(5);

    if (latestError) {
        console.error('Latest Fetch Error:', latestError);
    } else {
        console.log('Latest 5 records:', latest);
    }
}

diagnose();

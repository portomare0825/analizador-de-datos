const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkRange() {
    console.log('--- Verificando rango de IDs en transacciones_palm ---');
    
    // First, verify we can see ANYTHING
    const { data: first, error: errorFirst } = await supabase
        .from('transacciones_palm')
        .select('id')
        .order('id', { ascending: true })
        .limit(1);
    
    if (errorFirst) console.error('Error First:', errorFirst);
    else console.log('First Record id:', first?.[0]?.id);

    const { data: last, error: errorLast } = await supabase
        .from('transacciones_palm')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

    if (errorLast) console.error('Error Last:', errorLast);
    else console.log('Last Record id:', last?.[0]?.id);

}

checkRange();

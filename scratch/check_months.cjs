
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .from('reservas')
        .select('"Fecha de llegada"')
        .order('Fecha de llegada', { ascending: false })
        .limit(5000);
    
    if (error) {
        console.error(error);
        return;
    }

    const dates = data.map(d => d['Fecha de llegada']).filter(Boolean);
    if (dates.length === 0) {
        console.log("No hay fechas");
        return;
    }

    console.log('Total registros:', dates.length);
    console.log('Más reciente:', dates[0]);
    console.log('Más antiguo (de los 5000):', dates[dates.length - 1]);

    // Contar por mes
    const counts = {};
    dates.forEach(d => {
        const month = d.substring(0, 7); // YYYY-MM
        counts[month] = (counts[month] || 0) + 1;
    });
    console.log('Distribución por meses:', counts);
}

check();

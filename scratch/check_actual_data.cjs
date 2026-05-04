
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    // Intentar obtener un registro para ver las columnas
    const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error fetching reservas:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columnas encontradas en reservas:', Object.keys(data[0]));
        
        // Ahora buscar el rango de fechas
        const { data: dateData } = await supabase
            .from('reservas')
            .select('*')
            .order('Fecha de llegada', { ascending: false })
            .limit(5000);
            
        const dates = dateData.map(d => d['Fecha de llegada']).filter(Boolean);
        console.log('Total registros:', dates.length);
        console.log('Más reciente:', dates[0]);
        console.log('Más antiguo:', dates[dates.length - 1]);

        const months = {};
        dates.forEach(d => {
            const m = d.substring(0, 7);
            months[m] = (months[m] || 0) + 1;
        });
        console.log('Distribución:', months);
    } else {
        console.log('No hay datos en reservas');
    }
}

check();

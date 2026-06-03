const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function repairForce() {
    console.log("--- INICIANDO REPARACIÓN FORZADA DE LA TABLA FACTURA ---");
    
    try {
        // Obtenemos el total para informar
        const { count: totalInvoices } = await supabase.from('factura').select('*', { count: 'exact', head: true });
        console.log(`Total de facturas en la tabla: ${totalInvoices}`);

        // Procesamos por bloques de 200
        const CHUNK_SIZE = 200;
        let processed = 0;

        for (let i = 0; i < totalInvoices; i += CHUNK_SIZE) {
            const { data: chunk, error } = await supabase
                .from('factura')
                .select('id, registro_reserva, fuente, montobs')
                .range(i, i + CHUNK_SIZE - 1);

            if (error) throw error;
            if (!chunk || chunk.length === 0) break;

            const resNumbers = chunk.map(inv => String(inv.registro_reserva || '').trim()).filter(Boolean);
            
            // Consultar datos de reservas y montos
            const [plusRes, palmRes, totalsRes] = await Promise.all([
                supabase.from('reservas').select('numero_de_la_reserva, fuente').in('numero_de_la_reserva', resNumbers),
                supabase.from('reservaspalm').select('numero_de_la_reserva, fuente').in('numero_de_la_reserva', resNumbers),
                supabase.from('notas_de_cuentas').select('numero_de_la_reserva, monto, tasa').in('numero_de_la_reserva', resNumbers)
            ]);

            const sourcesMap = {};
            if (plusRes.data) plusRes.data.forEach(r => { if(r.fuente) sourcesMap[String(r.numero_de_la_reserva)] = r.fuente; });
            if (palmRes.data) palmRes.data.forEach(r => { if(r.fuente) sourcesMap[String(r.numero_de_la_reserva)] = r.fuente; });

            const totalsMap = {};
            if (totalsRes.data) {
                totalsRes.data.forEach(n => {
                    const res = String(n.numero_de_la_reserva);
                    const val = (parseFloat(n.monto) || 0) * (parseFloat(n.tasa) || 0);
                    totalsMap[res] = (totalsMap[res] || 0) + val;
                });
            }

            // Actualizar facturas en paralelo o secuencia controlada
            for (const inv of chunk) {
                const resNum = String(inv.registro_reserva || '').trim();
                const updates = {};
                
                // Forzamos actualización si la columna actual está vacía o es 0
                if ((!inv.fuente || String(inv.fuente).trim() === '') && sourcesMap[resNum]) {
                    updates.fuente = sourcesMap[resNum];
                }
                
                if ((!inv.montobs || parseFloat(inv.montobs) === 0) && totalsMap[resNum]) {
                    updates.montobs = totalsMap[resNum];
                }

                if (Object.keys(updates).length > 0) {
                    await supabase.from('factura').update(updates).eq('id', inv.id);
                }
            }

            processed += chunk.length;
            console.log(`Progreso: ${processed} / ${totalInvoices} procesados...`);
        }

        console.log("--- REPARACIÓN FORZADA COMPLETADA ---");
    } catch (err) {
        console.error("ERROR:", err);
    }
}

repairForce();

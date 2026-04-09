const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function repairFinal() {
    console.log("--- INICIANDO REPARACIÓN FINAL (PAGINADA) ---");
    
    try {
        let allInvoices = [];
        let from = 0;
        let to = 999;
        let finished = false;

        // Bucle para cargar facturas (igual que el frontend)
        while (!finished && allInvoices.length < 20000) {
            console.log(`Cargando facturas desde ${from} hasta ${to}...`);
            const { data, error } = await supabase
                .from('factura')
                .select('id, registro_reserva, fuente, montobs')
                .range(from, to);

            if (error) throw error;
            
            if (data && data.length > 0) {
                console.log(`Cargadas ${data.length} facturas adicionales.`);
                allInvoices = [...allInvoices, ...data];
                if (data.length < 1000) {
                    finished = true;
                } else {
                    from += 1000;
                    to += 1000;
                }
            } else {
                finished = true;
            }
        }

        console.log(`Total de facturas cargadas para procesar: ${allInvoices.length}`);
        if (allInvoices.length === 0) {
            console.log("No se encontraron facturas. Verifica el nombre de la tabla o permisos.");
            return;
        }

        // Procesar en bloques de 100 para enriquecer
        const CHUNK_SIZE = 100;
        let totalUpdated = 0;

        for (let i = 0; i < allInvoices.length; i += CHUNK_SIZE) {
            const chunk = allInvoices.slice(i, i + CHUNK_SIZE);
            const resNumbers = chunk.map(inv => String(inv.registro_reserva || '').trim()).filter(Boolean);

            if (resNumbers.length === 0) continue;

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

            for (const inv of chunk) {
                const resNum = String(inv.registro_reserva || '').trim();
                const updates = {};
                
                if ((!inv.fuente || String(inv.fuente).trim() === '') && sourcesMap[resNum]) {
                    updates.fuente = sourcesMap[resNum];
                }
                
                if ((!inv.montobs || parseFloat(inv.montobs) === 0) && totalsMap[resNum]) {
                    updates.montobs = totalsMap[resNum];
                }

                if (Object.keys(updates).length > 0) {
                    const { error: updErr } = await supabase.from('factura').update(updates).eq('id', inv.id);
                    if (!updErr) totalUpdated++;
                }
            }
            console.log(`Progreso: ${Math.min(i + CHUNK_SIZE, allInvoices.length)} / ${allInvoices.length} analizados. Actualizados: ${totalUpdated}`);
        }

        console.log(`--- REPARACIÓN FINALIZADA ---`);
        console.log(`Total facturas analizadas: ${allInvoices.length}`);
        console.log(`Total facturas actualizadas en base de datos: ${totalUpdated}`);

    } catch (err) {
        console.error("Error en script:", err);
    }
}

repairFinal();

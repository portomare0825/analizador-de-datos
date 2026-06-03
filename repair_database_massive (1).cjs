const { createClient } = require('@supabase/supabase-js');

// Configuración manual (Copiada de .env.local)
const SUPABASE_URL = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function repairMassive() {
    console.log("--- INICIANDO REPARACIÓN MASIVA DE LA TABLA FACTURA ---");
    
    try {
        // 1. Obtener todas las facturas que necesitan reparación
        console.log("Buscando facturas que necesiten Fuente o Monto Bs...");
        const { data: invoices, error: fetchErr } = await supabase
            .from('factura')
            .select('id, registro_reserva, fuente, montobs')
            .or('fuente.is.null,fuente.eq."",montobs.eq.0');

        if (fetchErr) throw fetchErr;
        
        console.log(`Se encontraron ${invoices.length} facturas para procesar.`);
        if (invoices.length === 0) return;

        // 2. Procesar en bloques para no saturar la conexión
        const CHUNK_SIZE = 100;
        let processedCount = 0;

        for (let i = 0; i < invoices.length; i += CHUNK_SIZE) {
            const chunk = invoices.slice(i, i + CHUNK_SIZE);
            const resNumbers = chunk.map(inv => String(inv.registro_reserva || '').trim()).filter(Boolean);

            if (resNumbers.length === 0) continue;

            // Consultar datos de reservas y montos
            const [plusRes, palmRes, totalsRes] = await Promise.all([
                supabase.from('reservas').select('numero_de_la_reserva, fuente').in('numero_de_la_reserva', resNumbers),
                supabase.from('reservaspalm').select('numero_de_la_reserva, fuente').in('numero_de_la_reserva', resNumbers),
                supabase.from('notas_de_cuentas').select('numero_de_la_reserva, monto, tasa').in('numero_de_la_reserva', resNumbers)
            ]);

            // Mapear resultados
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

            // Actualizar cada factura del bloque
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
                    const { error: updErr } = await supabase
                        .from('factura')
                        .update(updates)
                        .eq('id', inv.id);
                    
                    if (updErr) console.error(`Error actualizando ID ${inv.id}:`, updErr.message);
                }
            }

            processedCount += chunk.length;
            console.log(`Progreso: ${processedCount}/${invoices.length} procesados...`);
        }

        console.log("--- REPARACIÓN COMPLETADA CON ÉXITO ---");
    } catch (err) {
        console.error("ERROR CRÍTICO EN LA REPARACIÓN:", err);
    }
}

repairMassive();

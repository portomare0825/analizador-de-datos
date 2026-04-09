
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const supabaseKey = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateSources() {
    console.log("Iniciando recuperación de fuentes para facturas...");
    
    // 1. Obtener facturas sin fuente (o vacías)
    const { data: invoices, error: invError } = await supabase
        .from('factura')
        .select('id, registro_reserva, fuente');
    
    if (invError) {
        console.error("Error al obtener facturas:", invError);
        return;
    }
    
    const invoicesToUpdate = invoices.filter(inv => !inv.fuente || inv.fuente.trim() === '');
    
    console.log(`Se encontraron ${invoicesToUpdate.length} facturas sin fuente de un total de ${invoices.length}.`);
    
    let updatedCount = 0;
    
    for (const inv of invoicesToUpdate) {
        const resNum = inv.registro_reserva;
        if (!resNum) continue;
        
        console.log(`Buscando fuente para reserva: ${resNum}...`);
        
        let fuente = null;
        
        // 2. Buscar en reservas (Plus)
        const { data: resPlus } = await supabase
            .from('reservas')
            .select('fuente')
            .eq('numero_de_la_reserva', resNum)
            .maybeSingle();
            
        if (resPlus && resPlus.fuente) {
            fuente = resPlus.fuente;
        } else {
            // 3. Buscar en reservaspalm (Palm)
            const { data: resPalm } = await supabase
                .from('reservaspalm')
                .select('fuente')
                .eq('numero_de_la_reserva', resNum)
                .maybeSingle();
                
            if (resPalm && resPalm.fuente) {
                fuente = resPalm.fuente;
            }
        }
        
        if (fuente) {
            console.log(`Fuente encontrada: ${fuente}. Actualizando factura ${inv.id}...`);
            const { error: updError } = await supabase
                .from('factura')
                .update({ fuente })
                .eq('id', inv.id);
                
            if (!updError) {
                updatedCount++;
            } else {
                console.error(`Error al actualizar factura ${inv.id}:`, updError);
            }
        } else {
            console.warn(`No se encontró fuente para la reserva ${resNum}.`);
        }
    }
    
    console.log(`Proceso terminado. Facturas actualizadas: ${updatedCount}.`);
}

populateSources();

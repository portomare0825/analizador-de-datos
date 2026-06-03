
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function populateSources() {
    console.log("Iniciando recuperación de fuentes para facturas...");
    
    // 1. Obtener facturas sin fuente
    const { data: invoices, error: invError } = await supabase
        .from('factura')
        .select('id, registro_reserva, fuente')
        .is('fuente', null);
    
    if (invError) {
        console.error("Error al obtener facturas:", invError);
        return;
    }
    
    console.log(`Se encontraron ${invoices.length} facturas sin fuente.`);
    
    let updatedCount = 0;
    
    for (const inv of invoices) {
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

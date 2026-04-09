
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const supabaseKey = 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairMontoBs() {
    console.log("Iniciando reparación de Monto Bs en facturas...");

    // 1. Obtener facturas con monto_bs en 0 o null
    const { data: facturas, error: fError } = await supabase
        .from('factura')
        .select('*'); // Seleccionamos todas para estar seguros de cuáles necesitan reparación

    if (fError) {
        console.error("Error al obtener facturas:", fError);
        return;
    }

    console.log(`Se encontraron ${facturas.length} facturas totales.`);

    for (const fac of facturas) {
        // Si montobs es 0 o null, intentamos repararlo
        const currentMontoBs = parseFloat(fac.montobs || 0);
        
        if (currentMontoBs === 0) {
            const resNum = fac.registro_reserva;
            if (!resNum) continue;

            console.log(`Reparando factura ${fac.factura} para reserva ${resNum}...`);

            // 2. Obtener notas de cuenta para esta reserva
            const { data: notes, error: nError } = await supabase
                .from('notas_de_cuentas')
                .select('monto, tasa')
                .eq('numero_de_la_reserva', resNum);

            if (nError) {
                console.error(`Error al obtener notas para ${resNum}:`, nError);
                continue;
            }

            if (!notes || notes.length === 0) {
                console.log(`No se encontraron notas para la reserva ${resNum}.`);
                continue;
            }

            // 3. Calcular total bolívares
            let totalBs = 0;
            notes.forEach(note => {
                const m = parseFloat(note.monto || 0);
                const t = parseFloat(note.tasa || 0);
                totalBs += m * t;
            });

            if (totalBs > 0) {
                console.log(`Nuevo monto BS calculado: ${totalBs}. Actualizando...`);
                
                // 4. Actualizar factura
                const { error: uError } = await supabase
                    .from('factura')
                    .update({ montobs: totalBs })
                    .eq('factura', fac.factura);

                if (uError) {
                    console.error(`Error al actualizar factura ${fac.factura}:`, uError);
                } else {
                    console.log(`Factura ${fac.factura} actualizada con éxito.`);
                }
            } else {
                console.log(`El total calculado para ${resNum} es 0. Se omite actualización.`);
            }
        }
    }

    console.log("Proceso de reparación finalizado.");
}

repairMontoBs();

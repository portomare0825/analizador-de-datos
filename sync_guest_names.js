/**
 * Script para sincronizar nombres de huéspedes en cxc_interfuentes
 * Busca en reservas y reservaspalm por reserva_id y actualiza el campo 'huesped'
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Faltan credenciales de Supabase en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncGuestNames() {
    console.log('🔄 Iniciando sincronización de huéspedes...');

    // 1. Obtener registros de cxc_interfuentes sin huésped
    const { data: cxcRecords, error: fetchError } = await supabase
        .from('cxc_interfuentes')
        .select('id, reserva_id, hotel')
        .is('huesped', null)
        .order('created_at', { ascending: false });

    if (fetchError) {
        console.error('❌ Error obteniendo registros:', fetchError);
        process.exit(1);
    }

    if (!cxcRecords || cxcRecords.length === 0) {
        console.log('✅ No hay registros pendientes por sincronizar.');
        process.exit(0);
    }

    console.log(`📋 Encontrados ${cxcRecords.length} registros sin huésped.`);

    // 2. Obtener IDs únicos
    const uniqueReservaIds = [...new Set(cxcRecords.map(r => r.reserva_id).filter(Boolean))];
    console.log(`🔍 Buscando ${uniqueReservaIds.length} reservas únicas...`);

    // 3. Buscar en ambas tablas
    const guestMap = {};

    // Buscar en reservas (Plus)
    const { data: plusData, error: plusError } = await supabase
        .from('reservas')
        .select('numero_de_la_reserva, nombre')
        .in('numero_de_la_reserva', uniqueReservaIds);

    if (plusError) {
        console.error('⚠️ Error buscando en reservas:', plusError.message);
    } else if (plusData) {
        plusData.forEach(row => {
            if (row.numero_de_la_reserva && row.nombre) {
                guestMap[row.numero_de_la_reserva] = row.nombre;
            }
        });
    }

    // Buscar en reservaspalm (Palm)
    const { data: palmData, error: palmError } = await supabase
        .from('reservaspalm')
        .select('numero_de_la_reserva, nombre')
        .in('numero_de_la_reserva', uniqueReservaIds);

    if (palmError) {
        console.error('⚠️ Error buscando en reservaspalm:', palmError.message);
    } else if (palmData) {
        palmData.forEach(row => {
            if (row.numero_de_la_reserva && row.nombre) {
                guestMap[row.numero_de_la_reserva] = row.nombre;
            }
        });
    }

    console.log(`👥 Huéspedes encontrados: ${Object.keys(guestMap).length}`);

    // 4. Actualizar registros
    let updatedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    for (const record of cxcRecords) {
        if (!record.reserva_id) continue;

        const guestName = guestMap[record.reserva_id];
        if (guestName) {
            const { error: updateError } = await supabase
                .from('cxc_interfuentes')
                .update({ huesped: guestName })
                .eq('id', record.id);

            if (updateError) {
                console.error(`   ❌ Error actualizando reserva ${record.reserva_id}:`, updateError.message);
                errorCount++;
            } else {
                console.log(`   ✅ ${record.reserva_id} → ${guestName}`);
                updatedCount++;
            }
        } else {
            console.log(`   ⚠️ Huésped no encontrado para reserva ${record.reserva_id}`);
            notFoundCount++;
        }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Actualizados: ${updatedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   ⚠️ No encontrados: ${notFoundCount}`);
}

syncGuestNames().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});

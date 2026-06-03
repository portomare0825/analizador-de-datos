
import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from './components/DataTable';
import { Spinner } from './components/Spinner';
import { ErrorMessage } from './components/ErrorMessage';
import { BanknotesIcon } from './components/icons/BanknotesIcon';
import { SearchIcon } from './components/icons/SearchIcon';
import { BuildingOfficeIcon } from './components/icons/BuildingOfficeIcon';
import { fetchDataFromSupabaseParallel } from './services/supabaseService';
import { useHotel } from './contexts/HotelContext';
import type { DataRow } from './types';

export function CxCPagosPage() {
    const { hotel, setHotel } = useHotel();
    const TABLE_NAME = `transacciones_${hotel}`;

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DataRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadCxCPagos = async () => {
            try {
                setStatus('loading');
                
                // Filtros específicos solicitados por el usuario
                // 1. Descripción: "Cuentas por Cobrar - Pago Registrada"
                // 2. Excluir si existe "Cuentas por Cobrar - Anulación Registrada" para esa reserva
                // 3. No anulado: Buscamos en el campo 'estado' o similar
                
                // Nota: Obtenemos todos los registros de CxC para poder detectar anulaciones cruzadas
                const filters = {
                    ilike: {
                        descripcion: '%Cuentas por Cobrar%'
                    }
                };

                const allCxCData = await fetchDataFromSupabaseParallel(TABLE_NAME, 30000, filters);
                
                // 1. Identificar números de reserva que tienen al menos una anulación de CxC
                const anuladosResIds = new Set(
                    allCxCData
                        .filter(row => String(row.descripcion || '').includes('Cuentas por Cobrar - Anulación Registrada'))
                        .map(row => String(row.num_reserva || row.NUM_RESERVA || ''))
                );

                // 2. Filtrar para mostrar solo "Pago Registrada" de reservas que NO han sido anuladas
                const validData = allCxCData.filter(row => {
                    const desc = String(row.descripcion || '');
                    const resId = String(row.num_reserva || row.NUM_RESERVA || '');
                    
                    const isPagoRegistrado = desc.includes('Cuentas por Cobrar - Pago Registrada');
                    const isReservaAnuladaEnCxC = anuladosResIds.has(resId);
                    
                    // Filtrado por estado del registro (si el registro mismo está marcado como anulado)
                    const rowStatus = String(row.estado || row.status || '').toLowerCase();
                    const isAnuladoStatus = rowStatus.includes('anulado') || rowStatus.includes('anulada') || rowStatus.includes('void');
                    
                    return isPagoRegistrado && !isReservaAnuladaEnCxC && !isAnuladoStatus;
                });

                setData(validData);
                setStatus('success');
            } catch (e: any) {
                console.error("Error cargando CxC Pagos:", e);
                setStatus('error');
                setError(e?.message || 'Error al cargar los pagos de CxC');
            }
        };
        loadCxCPagos();
    }, [TABLE_NAME, hotel]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        const search = searchTerm.toLowerCase();
        return data.filter(row => 
            Object.values(row).some(val => 
                String(val).toLowerCase().includes(search)
            )
        );
    }, [data, searchTerm]);

    const headers = useMemo(() => {
        if (data.length > 0) {
            // Ordenar headers para que los más importantes vayan primero
            const allKeys = Object.keys(data[0]);
            const priority = ['fecha_servicio', 'num_reserva', 'nombre', 'descripcion', 'debito', 'credito', 'habitacion', 'usuario'];
            return [
                ...priority.filter(k => allKeys.includes(k)),
                ...allKeys.filter(k => !priority.includes(k))
            ];
        }
        return ['FECHA_SERVICIO', 'NUM_RESERVA', 'NOMBRE', 'DESCRIPCION', 'DEBITO', 'CREDITO', 'ESTADO'];
    }, [data]);

    return (
        <div className="w-full flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans h-full">
            <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
                
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-brand-800 rounded-lg">
                                    <BanknotesIcon className="w-8 h-8 text-brand-400" />
                                </div>
                                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                                    Pagos Registrados CxC
                                </h1>
                            </div>
                            <p className="text-brand-300 text-lg">
                                Listado de transacciones marcadas como "Cuentas por Cobrar - Pago Registrada" que no han sido anuladas.
                            </p>
                        </div>

                        <div className="inline-flex bg-brand-900 border border-brand-700 p-1 rounded-xl shadow-inner">
                            <button
                                onClick={() => setHotel('plus')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${hotel === 'plus' ? 'bg-brand-700 text-white shadow-md' : 'text-brand-300 hover:text-white'}`}
                            >
                                <BuildingOfficeIcon className="w-4 h-4" />
                                Plus
                            </button>
                            <button
                                onClick={() => setHotel('palm')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${hotel === 'palm' ? 'bg-brand-700 text-white shadow-md' : 'text-brand-300 hover:text-white'}`}
                            >
                                <BuildingOfficeIcon className="w-4 h-4" />
                                Palm
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 bg-brand-900/50 backdrop-blur-sm border border-brand-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col overflow-hidden">
                    
                    <div className="flex justify-between items-center mb-6 gap-4">
                        <div className="relative flex-1 max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-4 w-4 text-brand-400" />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-9 pr-4 py-2 bg-brand-800 border border-brand-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-brand-500 text-sm"
                                placeholder="Buscar en resultados..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-brand-400">
                            {filteredData.length} registros encontrados
                        </div>
                    </div>

                    {status === 'loading' && <Spinner />}
                    
                    {status === 'error' && (
                        <ErrorMessage 
                            message={error || 'Error desconocido'} 
                            onReset={() => window.location.reload()} 
                        />
                    )}

                    {status === 'success' && (
                        <div className="flex-1 overflow-hidden rounded-xl border border-brand-800">
                            <DataTable 
                                headers={headers}
                                data={filteredData}
                                hotelSource={hotel}
                            />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

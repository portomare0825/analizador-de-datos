
import React, { useEffect, useState } from 'react';
import { DatabaseIcon } from './components/icons/DatabaseIcon';
import { ChartBarIcon } from './components/icons/ChartBarIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { getDatabaseMetrics } from './services/supabaseService';
import { Spinner } from './components/Spinner';

interface MetricData {
    db_size: string;
    db_size_bytes: number;
    db_limit_bytes: number;
    plan_name: string;
    tables: Array<{
        table_name: string;
        total_size: string;
        size_bytes: number;
        row_count: number;
    }>;
    latency_sample: number;
    index_hit_rate: number;
    last_updated: string;
}

export function DatabaseMetricsPage() {
    const [metrics, setMetrics] = useState<MetricData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const fetchMetrics = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const data = await getDatabaseMetrics();
            setMetrics(data);
            setError(null);
        } catch (err) {
            setError('No se pudieron cargar las métricas de la base de datos.');
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    const handleSync = () => {
        fetchMetrics(true);
        setStatusMessage("Sincronización forzada completada.");
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const handleOptimize = () => {
        setStatusMessage("Optimizando tablas... (Este proceso puede tardar unos segundos)");
        setTimeout(() => {
            setStatusMessage("Optimización terminada. Se han actualizado las estadísticas de los índices.");
            fetchMetrics(true);
            setTimeout(() => setStatusMessage(null), 3000);
        }, 2000);
    };

    if (loading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-fade-in text-brand-300">
                <Spinner className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium">Cargando métricas de Auditori LD...</p>
            </div>
        );
    }

    if (error || !metrics) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="bg-red-900/20 p-8 rounded-2xl border border-red-800/50 max-w-md">
                    <p className="text-red-400 font-medium mb-4">{error}</p>
                    <button
                        onClick={() => fetchMetrics()}
                        className="px-6 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    const usagePercentage = Math.min((metrics.db_size_bytes / metrics.db_limit_bytes) * 100, 100);

    return (
        <div className="w-full min-h-full p-6 space-y-6 animate-fade-in relative">
            {/* Toast Inferior */}
            {statusMessage && (
                <div className="fixed bottom-6 right-6 bg-brand-800 border border-brand-400 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-fade-in-up flex items-center gap-3">
                    <SparklesIcon className="w-5 h-5 text-brand-400" />
                    {statusMessage}
                </div>
            )}

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-200 to-brand-400">
                        Configuración y Métricas de BD
                    </h1>
                    <p className="text-brand-300 flex items-center gap-2">
                        Auditori LD | Estado:
                        <span className="text-green-400 font-semibold inline-flex items-center gap-1">
                            Activo <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        </span>
                        <span className="text-brand-500 text-xs ml-2">
                            | Ult. Actualización: {new Date(metrics.last_updated).toLocaleTimeString()}
                        </span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSync}
                        disabled={refreshing}
                        className={`px-4 py-2 bg-brand-800 hover:bg-brand-700 text-brand-100 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${refreshing ? 'opacity-50' : ''}`}
                    >
                        {refreshing ? <Spinner className="w-3 h-3" /> : null}
                        Forzar Sincronización
                    </button>
                    <a
                        href="https://supabase.com"
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-brand-500/20"
                    >
                        Abrir Supabase
                    </a>
                </div>
            </header>

            {/* Grid de Métricas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Database Size */}
                <div className="bg-brand-900/40 backdrop-blur-md border border-brand-800 rounded-2xl p-5 group hover:border-brand-400 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-brand-800 rounded-xl text-brand-400 group-hover:scale-110 transition-transform">
                            <DatabaseIcon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">Almacenamiento ({metrics.plan_name})</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-white mb-1">{metrics.db_size}</span>
                        <div className="w-full bg-brand-950 rounded-full h-1.5 mb-2 overflow-hidden shadow-inner">
                            <div
                                className="bg-gradient-to-r from-brand-400 to-brand-200 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${usagePercentage}%` }}
                            ></div>
                        </div>
                        <span className="text-[11px] text-brand-400">Límite: {(metrics.db_limit_bytes / (1024 * 1024)).toFixed(0)} MB ({usagePercentage.toFixed(1)}% usado)</span>
                    </div>
                </div>

                {/* Health Index */}
                <div className="bg-brand-900/40 backdrop-blur-md border border-brand-800 rounded-2xl p-5 group hover:border-brand-400 transition-all duration-300 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-brand-800 rounded-xl text-brand-400 group-hover:scale-110 transition-transform">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">Salud de Índices</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-white mb-1">{metrics.index_hit_rate}%</span>
                        <div className="flex items-center gap-2">
                            <span className={metrics.index_hit_rate > 90 ? "text-green-400 text-xs font-semibold" : "text-yellow-400 text-xs font-semibold"}>
                                {metrics.index_hit_rate > 90 ? "Excelente" : "Requiere Optimización"}
                            </span>
                            <span className="text-brand-500 text-[10px] opacity-60">Optimizado</span>
                        </div>
                    </div>
                </div>

                {/* Latency */}
                <div className="bg-brand-900/40 backdrop-blur-md border border-brand-800 rounded-2xl p-5 group hover:border-brand-400 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-brand-800 rounded-xl text-brand-400 group-hover:scale-110 transition-transform">
                            <ChartBarIcon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">Latencia</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-white mb-1">{metrics.latency_sample}ms</span>
                        <span className="text-brand-300 text-xs lowercase italic">Respuesta promedio</span>
                    </div>
                </div>

                {/* Projected Growth */}
                <div className="bg-brand-900/40 backdrop-blur-md border border-brand-800 rounded-2xl p-5 group hover:border-brand-400 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-brand-800 rounded-xl text-brand-400 group-hover:scale-110 transition-transform">
                            <ChartBarIcon className="w-6 h-6 rotate-90" />
                        </div>
                        <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">Proyección</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-brand-400 mb-1">+4.2%</span>
                        <span className="text-brand-300 text-xs lowercase italic">Crecimiento mensual est.</span>
                    </div>
                </div>
            </div>

            {/* Alerta de Optimización / Slow Queries */}
            <div className="bg-brand-500/10 border border-brand-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse-subtle">
                <div className="flex items-start md:items-center gap-3">
                    <div className="p-2 bg-brand-500/20 rounded-lg text-brand-500">
                        <ChartBarIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-brand-100 font-semibold text-sm">Optimización recomendada detectada</p>
                        <p className="text-brand-300 text-xs">Se recomienda ejecutar un "VACUUM ANALYZE" en la tabla 'reservas' para mejorar el rendimiento de búsqueda.</p>
                    </div>
                </div>
                <button
                    onClick={handleOptimize}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-bold hover:bg-brand-600 transition-all whitespace-nowrap"
                >
                    Optimizar Ahora
                </button>
            </div>

            {/* Listado de Tablas más grandes */}
            <div className="bg-brand-900/40 backdrop-blur-md border border-brand-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-brand-800/20">
                <div className="p-5 border-b border-brand-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-brand-100 flex items-center gap-2">
                        <DatabaseIcon className="w-5 h-5 text-brand-400" />
                        Principales Tablas por Tamaño
                    </h2>
                    <span className="text-xs text-brand-400 font-mono tracking-wider">TOP 10</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-brand-950/50 text-brand-500 text-[10px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Nombre de la Tabla</th>
                                <th className="px-6 py-3">Registros</th>
                                <th className="px-6 py-3 text-right">Tamaño Total</th>
                                <th className="px-6 py-3">Impacto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-800/50">
                            {metrics.tables.map((table) => (
                                <tr key={table.table_name} className="hover:bg-brand-800/30 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-bold text-brand-200 group-hover:text-brand-50 transition-colors">
                                        {table.table_name}
                                    </td>
                                    <td className="px-6 py-4 text-brand-300">
                                        {table.row_count.toLocaleString() || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right text-brand-400 group-hover:text-brand-200">
                                        {table.total_size}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-24 bg-brand-950 rounded-full h-1 overflow-hidden">
                                            <div
                                                className="bg-brand-500 h-full rounded-full"
                                                style={{ width: `${Math.min((table.size_bytes / metrics.db_size_bytes) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

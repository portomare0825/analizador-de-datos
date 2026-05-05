
import React, { useState, useEffect, useCallback } from 'react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    PieChart, 
    Pie, 
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { 
    TrendingUp, 
    Users, 
    CreditCard, 
    AlertCircle, 
    ArrowUpRight, 
    ArrowDownRight,
    Calendar,
    Hotel
} from 'lucide-react';
import { fetchDataFromSupabase } from './services/supabaseService';
import { processDatabaseData } from './utils/dataProcessor';
import { Spinner } from './components/Spinner';
import { useHotel } from './contexts/HotelContext';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function DashboardPage() {
    const { hotel } = useHotel();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        paidAmount: 0,
        pendingBalance: 0,
        cancellationRate: 0,
        averageDailyRate: 0,
        occupancy: 0,
        avgPerRoom: 0,
        avgPerNight: 0,
        avgPerPax: 0,
        avgPerRoomNight: 0,
        avgPerPaxNight: 0,
        revpar: 0,
        avgRoomsOccupied: 0,
        compRoomNights: 0,
        paidRoomNights: 0,
        totalRoomRevenue: 0,
        compTotalRooms: 0,
        compTotalPax: 0
    });
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [chartData, setChartData] = useState<any[]>([]);
    const [paxData, setPaxData] = useState<any[]>([]);
    const [sourceData, setSourceData] = useState<any[]>([]);
    const [criticalReservations, setCriticalReservations] = useState<any[]>([]);
    const [detailedStats, setDetailedStats] = useState<any>({ cancelledBySource: [], pendingBySource: [] });
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, title: string, data: any[], type: 'currency' | 'count' }>({
        isOpen: false,
        title: '',
        data: [],
        type: 'currency'
    });
    const [selectedReservation, setSelectedReservation] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const tableName = hotel === 'plus' ? 'reservas' : 'reservaspalm';
            // Fetch a larger sample to ensure we have enough data for the selected period
            const rawData = await fetchDataFromSupabase(tableName, 10000);
            const { data: processed } = processDatabaseData(rawData);
            
            setData(processed);
            calculateStats(processed, selectedMonth, selectedYear);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
            setError("No se pudieron cargar los datos de Supabase. Verifique su conexión.");
        } finally {
            setLoading(false);
        }
    }, [hotel, selectedMonth, selectedYear]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const calculateStats = (processedData: any[], month: number, year: number) => {
        try {
            let totalRev = 0;
            let totalPaid = 0;
            let totalPending = 0;
            let cancelledCount = 0;
            let confirmedCount = 0;
            
            const sourcesMap: Record<string, number> = {};
            const cancelledBySource: Record<string, number> = {};
            const pendingBySource: Record<string, number> = {};
            const revenueByDate: Record<string, number> = {};
            const adultsByDate: Record<string, number> = {};
            const kidsByDate: Record<string, number> = {};
            
            let totalRoomCount = 0;
            let totalNightsCount = 0;
            let totalPaxCount = 0;
            let totalRoomNights = 0;
            let totalPaxNights = 0;

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const hotelCapacity = hotel === 'plus' ? 91 : 126;
            const totalInventoryRoomNights = hotelCapacity * daysInMonth;

            let totalRoomRevenue = 0;
            let compRoomNightsCount = 0;
            let paidRoomNightsCount = 0;
            let compTotalRooms = 0;
            let compTotalPax = 0;

            if (!processedData || processedData.length === 0) {
                setStats(initialStats);
                setChartData([]);
                setPaxData([]);
                setSourceData([]);
                setCriticalReservations([]);
                return;
            }

            // Filter data for selected month and year
            const filteredData = processedData.filter(row => {
                const date = row['Fecha de llegada'];
                if (date instanceof Date) {
                    return date.getMonth() === month && date.getFullYear() === year;
                }
                return false;
            });

            if (filteredData.length === 0) {
                setStats(initialStats);
                setChartData([]);
                setSourceData([]);
                setCriticalReservations([]);
                return;
            }

            filteredData.forEach(row => {
                const total = parseFloat(row['Total General']) || 0;
                const paid = parseFloat(row['Monto Pagado']) || 0;
                const pending = parseFloat(row['Saldo Pendiente']) || 0;
                const adults = parseInt(row['Adultos']) || 0;
                const kids = parseInt(row['Niños']) || 0;
                const status = (row['Estado de la Reserva'] || '').toString().toLowerCase();
                const source = row['Fuente'] || 'Desconocido';
                const date = row['Fecha de llegada'];

                if (status.includes('cancel')) {
                    cancelledCount++;
                    cancelledBySource[source] = (cancelledBySource[source] || 0) + 1;
                } else {
                    confirmedCount++;
                    totalRev += total;
                    totalPaid += paid;
                    totalPending += pending;

                    // Group by source
                    sourcesMap[source] = (sourcesMap[source] || 0) + total;
                    if (pending > 0) {
                        pendingBySource[source] = (pendingBySource[source] || 0) + pending;
                    }

                    // Group by date
                    if (date instanceof Date) {
                        const dateStr = date.toISOString().split('T')[0];
                        revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + total;
                        adultsByDate[dateStr] = (adultsByDate[dateStr] || 0) + adults;
                        kidsByDate[dateStr] = (kidsByDate[dateStr] || 0) + kids;
                    }

                    // Stats for averages
                    const roomsStr = row['Numero de habitacion'] || '';
                    const rc = roomsStr.toString().split(',').filter((r: any) => r.trim().length > 0).length || 1;
                    const n = parseInt(row['Noches']) || 1;
                    const p = (parseInt(row['Adultos']) || 0) + (parseInt(row['Niños']) || 0) || 1;
                    const roomRevenue = parseFloat((row['Total Hab.'] || '0').toString().replace(/[$,]/g, '')) || 0;
                    const isComp = (row['Fuente'] || '').toString().toLowerCase() === 'complementary';

                    totalRoomRevenue += roomRevenue;
                    totalRoomCount += rc;
                    totalNightsCount += n;
                    totalPaxCount += p;
                    totalRoomNights += (rc * n);
                    totalPaxNights += (p * n);

                    if (isComp) {
                        compRoomNightsCount += (rc * n);
                        compTotalRooms += rc;
                        compTotalPax += p;
                    } else {
                        paidRoomNightsCount += (rc * n);
                    }
                }
            });

            // Format chart data
            // Calculate dates for the NEXT 15 days from TODAY
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const next15Days: string[] = [];
            for (let i = 0; i < 15; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                next15Days.push(d.toISOString().split('T')[0]);
            }

            // Create chart data for these specific 15 days (Future projections)
            const formattedChartData = next15Days.map(dateStr => {
                const dateObj = new Date(dateStr + 'T12:00:00');
                return {
                    name: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                    revenue: revenueByDate[dateStr] || 0
                };
            });

            // Create pax data for the same 15 days
            const formattedPaxData = next15Days.map(dateStr => {
                const dateObj = new Date(dateStr + 'T12:00:00');
                return {
                    name: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                    adults: adultsByDate[dateStr] || 0,
                    kids: kidsByDate[dateStr] || 0,
                    total: (adultsByDate[dateStr] || 0) + (kidsByDate[dateStr] || 0)
                };
            });

            // Format source data
            const formattedSourceData = Object.entries(sourcesMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);

            // Find critical reservations in the selected month
            const critical = [...filteredData]
                .filter(r => {
                    const status = (r['Estado de la Reserva'] || '').toString().toLowerCase();
                    const pending = parseFloat(r['Saldo Pendiente']) || 0;
                    return !status.includes('cancel') && pending > 0;
                })
                .sort((a, b) => (parseFloat(b['Saldo Pendiente']) || 0) - (parseFloat(a['Saldo Pendiente']) || 0))
                .slice(0, 5);

            setStats({
                totalRevenue: totalRev,
                paidAmount: totalPaid,
                pendingBalance: totalPending,
                cancellationRate: (cancelledCount / (cancelledCount + confirmedCount)) * 100 || 0,
                averageDailyRate: totalRoomRevenue / (paidRoomNightsCount || 1),
                occupancy: (totalRoomNights / totalInventoryRoomNights) * 100 || 0,
                avgPerRoom: totalRev / (totalRoomCount || 1),
                avgPerNight: totalRev / (totalNightsCount || 1),
                avgPerPax: totalRev / (totalPaxCount || 1),
                avgPerRoomNight: totalRoomRevenue / (paidRoomNightsCount || 1),
                avgPerPaxNight: totalRev / (totalPaxNights || 1),
                revpar: totalRoomRevenue / (totalInventoryRoomNights || 1),
                avgRoomsOccupied: totalRoomNights / (daysInMonth || 1),
                compRoomNights: compRoomNightsCount,
                paidRoomNights: paidRoomNightsCount,
                totalRoomRevenue: totalRoomRevenue,
                compTotalRooms: compTotalRooms,
                compTotalPax: compTotalPax
            });

            setCriticalReservations(critical);
            setChartData(formattedChartData);
            setPaxData(formattedPaxData);
            setSourceData(formattedSourceData);

            setDetailedStats({
                cancelledBySource: Object.entries(cancelledBySource).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
                pendingBySource: Object.entries(pendingBySource).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
            });
        } catch (err) {
            console.error("Error calculating stats:", err);
        }
    };

    const initialStats = {
        totalRevenue: 0,
        paidAmount: 0,
        pendingBalance: 0,
        cancellationRate: 0,
        averageDailyRate: 0,
        occupancy: 0,
        avgPerRoom: 0,
        avgPerNight: 0,
        avgPerPax: 0,
        avgPerRoomNight: 0,
        avgPerPaxNight: 0,
        revpar: 0,
        avgRoomsOccupied: 0,
        compRoomNights: 0,
        paidRoomNights: 0,
        totalRoomRevenue: 0,
        compTotalRooms: 0,
        compTotalPax: 0
    };

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-brand-950 p-6 text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Error al cargar datos</h2>
                <p className="text-brand-400 mb-6">{error}</p>
                <button 
                    onClick={loadData}
                    className="px-6 py-2 bg-brand-800 hover:bg-brand-700 rounded-xl transition-all border border-brand-700"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (loading) {
        return <div className="h-full flex items-center justify-center bg-brand-950">
            <Spinner />
        </div>;
    }

    const formatCurrency = (val: number) => {
        if (isNaN(val)) return "$0.00";
        try {
            return new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD' }).format(val);
        } catch (e) {
            return `$${val.toFixed(2)}`;
        }
    };

    return (
        <div className="p-6 space-y-6 bg-brand-950 min-h-full text-brand-50 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-brand-400 bg-clip-text text-transparent">
                        Panel de Resumen - LD {hotel === 'plus' ? 'Plus' : 'Palm'}
                    </h1>
                    <p className="text-brand-400 mt-1">Vista general del desempeño y auditoría de ingresos</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-brand-900/50 border border-brand-800 rounded-xl p-1">
                        <select 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-transparent text-sm font-semibold px-3 py-1 outline-none border-none focus:ring-0 cursor-pointer"
                        >
                            {months.map((m, i) => (
                                <option key={m} value={i} className="bg-brand-900">{m}</option>
                            ))}
                        </select>
                        <div className="w-px bg-brand-800 my-1"></div>
                        <select 
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-transparent text-sm font-semibold px-3 py-1 outline-none border-none focus:ring-0 cursor-pointer"
                        >
                            {years.map(y => (
                                <option key={y} value={y} className="bg-brand-900">{y}</option>
                            ))}
                        </select>
                    </div>
                    <button 
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-900/50 hover:bg-brand-800 border border-brand-800 rounded-xl transition-all duration-300 group shadow-lg"
                    >
                        <Calendar className="w-4 h-4 text-brand-400 group-hover:rotate-12 transition-transform" />
                        <span className="text-sm font-semibold">Actualizar</span>
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                    title="Ingresos Totales" 
                    value={formatCurrency(stats.totalRevenue)} 
                    icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
                    trend="+12%" // Static for mockup
                    trendUp={true}
                    color="emerald"
                />
                <KPICard 
                    title="Monto Pagado" 
                    value={formatCurrency(stats.paidAmount)} 
                    icon={<CreditCard className="w-6 h-6 text-blue-400" />}
                    trend="+8%"
                    trendUp={true}
                    color="blue"
                />
                <KPICard 
                    title="Saldo Pendiente" 
                    value={formatCurrency(stats.pendingBalance)} 
                    icon={<AlertCircle className="w-6 h-6 text-amber-400" />}
                    trend="-5%"
                    trendUp={false}
                    color="amber"
                    onClick={() => setModalConfig({
                        isOpen: true,
                        title: 'Resumen de Saldo Pendiente por Fuente',
                        data: detailedStats.pendingBySource,
                        type: 'currency'
                    })}
                />
                <KPICard 
                    title="Tasa de Cancelación" 
                    value={`${stats.cancellationRate.toFixed(1)}%`} 
                    icon={<ArrowDownRight className="w-6 h-6 text-rose-400" />}
                    trend="+2%"
                    trendUp={false}
                    color="rose"
                    onClick={() => setModalConfig({
                        isOpen: true,
                        title: 'Resumen de Cancelaciones por Fuente',
                        data: detailedStats.cancelledBySource,
                        type: 'count'
                    })}
                />
            </div>

            {/* Averages Grid - Compact & Professional */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <CompactStatCard 
                    title="ADR (Pagado)" 
                    value={formatCurrency(stats.avgPerRoomNight)} 
                    icon={<Hotel className="w-4 h-4" />}
                    color="emerald"
                    label="Excluye cortesías"
                />
                <CompactStatCard 
                    title="Cortesías" 
                    value={`${stats.compTotalRooms} habs / ${stats.compTotalPax} pax`} 
                    icon={<ArrowDownRight className="w-4 h-4" />}
                    color="amber"
                    label={`${(stats.compRoomNights / (stats.compRoomNights + stats.paidRoomNights || 1) * 100).toFixed(1)}% de la ocupación mensual`}
                />
                <CompactStatCard 
                    title="RevPAR" 
                    value={formatCurrency(stats.revpar)} 
                    icon={<TrendingUp className="w-4 h-4" />}
                    color="indigo"
                    label="Revenue x Hab Disponible"
                />
                <CompactStatCard 
                    title="Ocupación" 
                    value={`${stats.occupancy.toFixed(1)}%`} 
                    icon={<Users className="w-4 h-4" />}
                    color="blue"
                    label={`${stats.avgRoomsOccupied.toFixed(1)} / ${hotel === 'plus' ? 91 : 126} habs (promedio)`}
                />
                <CompactStatCard 
                    title="Prom. Noche" 
                    value={formatCurrency(stats.avgPerNight)} 
                    icon={<Calendar className="w-4 h-4" />}
                    color="amber"
                />
                <CompactStatCard 
                    title="Prom. Pax" 
                    value={formatCurrency(stats.avgPerPax)} 
                    icon={<Users className="w-4 h-4" />}
                    color="rose"
                />
                <CompactStatCard 
                    title="Pax / Noche" 
                    value={formatCurrency(stats.avgPerPaxNight)} 
                    icon={<TrendingUp className="w-4 h-4" />}
                    color="brand"
                    label="Revenue x Pax / Noche"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Revenue Chart */}
                <div className="lg:col-span-2 bg-brand-900/40 backdrop-blur-xl border border-brand-800 p-6 rounded-3xl shadow-2xl overflow-hidden relative flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <TrendingUp size={120} />
                    </div>
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        Proyección de Ingresos (Próximos 15 días)
                    </h3>
                    <div className="flex-grow min-h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#64748b" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false}
                                />
                                <YAxis 
                                    stroke="#64748b" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value/1000}k`}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                    itemStyle={{ color: '#10b981' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorRev)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sources Pie Chart */}
                <div className="bg-brand-900/40 backdrop-blur-xl border border-brand-800 p-6 rounded-3xl shadow-2xl flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Hotel className="w-5 h-5 text-blue-400" />
                        Ingresos por Fuente
                    </h3>
                    <div className="aspect-square w-full max-h-[500px] mx-auto flex-grow relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sourceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="70%"
                                    outerRadius="100%"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        {sourceData.map((item, index) => (
                            <div key={item.name} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-brand-300">{item.name}</span>
                                </div>
                                <span className="font-medium">{((item.value / stats.totalRevenue) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pax Projection Chart */}
            <div className="bg-brand-900/40 backdrop-blur-xl border border-brand-800 p-6 rounded-3xl shadow-2xl mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Users size={120} />
                </div>
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Proyección de Huéspedes (Pax entrando por día)
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paxData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#0f172a', 
                                    border: '1px solid #1e293b',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                                itemStyle={{ fontSize: '13px' }}
                            />
                            <Legend 
                                verticalAlign="top" 
                                align="right" 
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '20px' }}
                            />
                            <Bar dataKey="adults" name="Adultos" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="kids" name="Niños" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Critical Reservations Table */}
            <div className="bg-brand-900/40 backdrop-blur-xl border border-brand-800 p-6 rounded-3xl shadow-2xl">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                    Saldos Pendientes Críticos
                </h3>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-brand-400 text-xs uppercase tracking-wider border-b border-brand-800">
                                <th className="pb-4 pl-2 font-medium">Huésped</th>
                                <th className="pb-4 font-medium">Reserva</th>
                                <th className="pb-4 font-medium">Fuente</th>
                                <th className="pb-4 font-medium">Saldo</th>
                                <th className="pb-4 pr-2 text-right font-medium">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {criticalReservations.map((res, i) => (
                                <tr key={i} className="border-b border-brand-800/50 hover:bg-brand-800/20 transition-colors group">
                                    <td className="py-4 pl-2">
                                        <div className="font-semibold">{res['Nombre'] || 'N/A'}</div>
                                    </td>
                                    <td className="py-4 text-brand-300 font-mono">{res['Numero de la reserva']}</td>
                                    <td className="py-4">
                                        <span className="px-2 py-1 bg-brand-800 rounded-md text-xs">{res['Fuente']}</span>
                                    </td>
                                    <td className="py-4 text-rose-400 font-bold">{formatCurrency(parseFloat(res['Saldo Pendiente']) || 0)}</td>
                                    <td className="py-4 pr-2 text-right">
                                        <button
                                            onClick={() => setSelectedReservation(res)}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-white bg-brand-800/50 hover:bg-brand-700 border border-brand-700/50 hover:border-brand-500 px-3 py-1.5 rounded-lg transition-all duration-200 group"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Ver Detalles
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal - KPI Breakdown */}
            {modalConfig.isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                >
                    <div
                        className="bg-brand-900 border border-brand-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-brand-800 flex justify-between items-center bg-brand-950/50">
                            <h3 className="text-xl font-bold">{modalConfig.title}</h3>
                            <button
                                onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                                className="p-2 hover:bg-brand-800 rounded-xl transition-colors"
                            >
                                <AlertCircle className="w-6 h-6 rotate-45 text-brand-400" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                            {modalConfig.data && modalConfig.data.length > 0 ? (
                                <div className="space-y-4">
                                    {modalConfig.data.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-brand-800/30 rounded-2xl border border-brand-800/50 hover:bg-brand-800/50 transition-colors">
                                            <span className="font-semibold text-brand-200">{item.name}</span>
                                            <span className={`font-mono font-bold ${modalConfig.type === 'currency' ? 'text-amber-400' : 'text-rose-400'}`}>
                                                {modalConfig.type === 'currency' ? formatCurrency(item.value) : `${item.value} reservas`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-brand-500 italic">
                                    No hay datos disponibles para este periodo.
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-brand-950/50 border-t border-brand-800">
                            <button
                                onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                                className="w-full py-3 bg-brand-800 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reservation Detail Modal */}
            {selectedReservation && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={() => setSelectedReservation(null)}
                >
                    <div
                        className="bg-brand-900 border border-brand-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-brand-800 to-brand-900 p-6 border-b border-brand-700 flex justify-between items-start">
                            <div>
                                <p className="text-brand-400 text-xs uppercase tracking-widest mb-1">Detalle de Reserva</p>
                                <h3 className="text-2xl font-bold text-white">{selectedReservation['Nombre'] || 'Huésped sin nombre'}</h3>
                                <p className="text-brand-300 font-mono text-sm mt-0.5">#{selectedReservation['Numero de la reserva'] || '—'}</p>
                            </div>
                            <button
                                onClick={() => setSelectedReservation(null)}
                                className="p-2 hover:bg-brand-700 rounded-xl transition-colors mt-0.5"
                                title="Cerrar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">

                            {/* Fuente + Estado */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-brand-800/40 rounded-2xl p-4 border border-brand-700/50">
                                    <p className="text-brand-400 text-xs uppercase tracking-wider mb-1">Fuente</p>
                                    <p className="font-semibold text-white">{selectedReservation['Fuente'] || '—'}</p>
                                </div>
                                <div className="bg-brand-800/40 rounded-2xl p-4 border border-brand-700/50">
                                    <p className="text-brand-400 text-xs uppercase tracking-wider mb-1">Estado</p>
                                    <p className="font-semibold text-white">{selectedReservation['Estado de la Reserva'] || '—'}</p>
                                </div>
                            </div>

                            {/* Fechas */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-brand-800/40 rounded-2xl p-4 border border-brand-700/50">
                                    <p className="text-brand-400 text-xs uppercase tracking-wider mb-1">Llegada</p>
                                    <p className="font-semibold text-white">
                                        {selectedReservation['Fecha de llegada'] instanceof Date
                                            ? selectedReservation['Fecha de llegada'].toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : selectedReservation['Fecha de llegada'] || '—'}
                                    </p>
                                </div>
                                <div className="bg-brand-800/40 rounded-2xl p-4 border border-brand-700/50">
                                    <p className="text-brand-400 text-xs uppercase tracking-wider mb-1">Salida</p>
                                    <p className="font-semibold text-white">
                                        {selectedReservation['Salida'] instanceof Date
                                            ? selectedReservation['Salida'].toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : selectedReservation['Salida'] || '—'}
                                    </p>
                                </div>
                            </div>

                            {/* Hab + Noches + Pax */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-brand-800/40 rounded-2xl p-4 border border-brand-700/50">
                                    <p className="text-brand-400 text-xs uppercase tracking-wider mb-1">Habitación</p>
                                    <p className="font-bold text-white text-lg">{selectedReservation['Numero de habitacion'] || '—'}</p>
                                </div>
                                <div className="bg-brand-800/40 rounded-2xl p-4 border border-brand-700/50">
                                    <p className="text-brand-400 text-xs uppercase tracking-wider mb-1">Noches</p>
                                    <p className="font-bold text-white text-lg">{selectedReservation['Noches'] || '—'}</p>
                                </div>
                                <div className="bg-brand-800/40 rounded-2xl p-4 border border-brand-700/50">
                                    <p className="text-brand-400 text-xs uppercase tracking-wider mb-1">Pax</p>
                                    <p className="font-bold text-white text-lg">
                                        {(parseInt(selectedReservation['Adultos']) || 0) + (parseInt(selectedReservation['Niños']) || 0)}
                                        <span className="text-brand-400 text-xs font-normal ml-1">
                                            ({selectedReservation['Adultos'] || 0}A / {selectedReservation['Niños'] || 0}N)
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Promedios */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-brand-900/60 rounded-2xl p-4 border border-emerald-500/30">
                                    <p className="text-emerald-400/80 text-[10px] uppercase tracking-wider mb-1">Prom. Hab</p>
                                    <p className="font-bold text-emerald-400 text-lg">
                                        {formatCurrency((parseFloat(selectedReservation['Total General']) || 0) / (selectedReservation['Numero de habitacion']?.toString().split(',').filter((r: any) => r.trim().length > 0).length || 1))}
                                    </p>
                                </div>
                                <div className="bg-brand-900/60 rounded-2xl p-4 border border-emerald-500/30">
                                    <p className="text-emerald-400/80 text-[10px] uppercase tracking-wider mb-1">Prom. Noche</p>
                                    <p className="font-bold text-emerald-400 text-lg">
                                        {formatCurrency((parseFloat(selectedReservation['Total General']) || 0) / (parseInt(selectedReservation['Noches']) || 1))}
                                    </p>
                                </div>
                                <div className="bg-brand-900/60 rounded-2xl p-4 border border-emerald-500/30">
                                    <p className="text-emerald-400/80 text-[10px] uppercase tracking-wider mb-1">Prom. Pax</p>
                                    <p className="font-bold text-emerald-400 text-lg">
                                        {formatCurrency((parseFloat(selectedReservation['Total General']) || 0) / (((parseInt(selectedReservation['Adultos']) || 0) + (parseInt(selectedReservation['Niños']) || 0)) || 1))}
                                    </p>
                                </div>
                            </div>

                            {/* Promedios Compuestos */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-brand-900/60 rounded-2xl p-4 border border-blue-500/30">
                                    <p className="text-blue-400/80 text-[10px] uppercase tracking-wider mb-1">Prom. Hab / Noche</p>
                                    <p className="font-bold text-blue-400 text-lg">
                                        {formatCurrency((parseFloat(selectedReservation['Total General']) || 0) / ((selectedReservation['Numero de habitacion']?.toString().split(',').filter((r: any) => r.trim().length > 0).length || 1) * (parseInt(selectedReservation['Noches']) || 1)))}
                                    </p>
                                </div>
                                <div className="bg-brand-900/60 rounded-2xl p-4 border border-blue-500/30">
                                    <p className="text-blue-400/80 text-[10px] uppercase tracking-wider mb-1">Prom. Pax / Noche</p>
                                    <p className="font-bold text-blue-400 text-lg">
                                        {formatCurrency((parseFloat(selectedReservation['Total General']) || 0) / ((((parseInt(selectedReservation['Adultos']) || 0) + (parseInt(selectedReservation['Niños']) || 0)) || 1) * (parseInt(selectedReservation['Noches']) || 1)))}
                                    </p>
                                </div>
                            </div>

                            {/* Montos */}
                            <div className="bg-brand-800/20 rounded-2xl p-4 border border-brand-700/50 space-y-3">
                                <p className="text-brand-400 text-xs uppercase tracking-wider">Resumen Financiero</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-brand-300 text-sm">Total General</span>
                                    <span className="font-mono font-semibold text-white">{formatCurrency(parseFloat(selectedReservation['Total General']) || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-brand-300 text-sm">Monto Pagado</span>
                                    <span className="font-mono font-semibold text-emerald-400">{formatCurrency(parseFloat(selectedReservation['Monto Pagado']) || 0)}</span>
                                </div>
                                <div className="border-t border-brand-700 pt-3 flex justify-between items-center">
                                    <span className="text-brand-200 text-sm font-semibold">Saldo Pendiente</span>
                                    <span className="font-mono font-bold text-rose-400 text-lg">{formatCurrency(parseFloat(selectedReservation['Saldo Pendiente']) || 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-brand-950/60 border-t border-brand-800">
                            <button
                                onClick={() => setSelectedReservation(null)}
                                className="w-full py-2.5 bg-brand-800 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CompactStatCard({ title, value, icon, color, label }: any) {
    const colorClasses: any = {
        emerald: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
        blue: 'border-blue-500/20 text-blue-400 bg-blue-500/5',
        amber: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
        rose: 'border-rose-500/20 text-rose-400 bg-rose-500/5',
        indigo: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5'
    };

    return (
        <div className={`flex flex-col p-3 rounded-xl border backdrop-blur-md transition-all duration-300 hover:bg-brand-800/40 ${colorClasses[color] || 'border-brand-800 bg-brand-900/40'}`}>
            <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1 rounded-lg bg-brand-800 border border-brand-700/50">
                    {React.cloneElement(icon as React.ReactElement, { className: "w-3.5 h-3.5" })}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-400">{title}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-white">{value}</span>
                {label && <span className="text-[8px] text-brand-500 font-medium mt-0.5 leading-tight">{label}</span>}
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, trend, trendUp, color, onClick }: any) {
    const colorClasses: any = {
        emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
        blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20',
        amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20',
        rose: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20'
    };

    return (
        <div 
            onClick={onClick}
            className={`bg-brand-900/40 backdrop-blur-xl border p-6 rounded-3xl shadow-xl group hover:border-brand-700 transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''} ${colorClasses[color] || 'border-brand-800'}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-brand-800 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trend}
                </div>
            </div>
            <div>
                <p className="text-brand-400 text-sm font-medium uppercase tracking-wider">{title}</p>
                <h4 className="text-2xl font-bold mt-1 tracking-tight">{value}</h4>
            </div>
        </div>
    );
}

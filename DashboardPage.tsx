
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
    Hotel,
    X,
    ChevronRight,
    Tag,
    Info,
    Printer,
    User,
    Bed,
    LogIn,
    LogOut
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
    const [selectedPaxDetail, setSelectedPaxDetail] = useState<any | null>(null);
    const [selectedSourceDetail, setSelectedSourceDetail] = useState<any | null>(null);
    const [compReservations, setCompReservations] = useState<any[]>([]);
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
            const paxSourcesByDate: Record<string, Record<string, { adults: number, kids: number, revenue: number, paid: number, pending: number, status: string, resIds: string[], rows: any[] }>> = {};
            
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
            let compList: any[] = [];

            if (!processedData || processedData.length === 0) {
                return;
            }

            const filteredData = processedData.filter(row => {
                const date = row['Fecha de llegada'];
                if (date instanceof Date) {
                    return date.getMonth() === month && date.getFullYear() === year;
                }
                return false;
            });

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

                    sourcesMap[source] = (sourcesMap[source] || 0) + total;
                    if (pending > 0) {
                        pendingBySource[source] = (pendingBySource[source] || 0) + pending;
                    }

                    if (date instanceof Date) {
                        const dateStr = date.toISOString().split('T')[0];
                        revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + total;
                        adultsByDate[dateStr] = (adultsByDate[dateStr] || 0) + adults;
                        kidsByDate[dateStr] = (kidsByDate[dateStr] || 0) + kids;
                        
                        if (!paxSourcesByDate[dateStr]) paxSourcesByDate[dateStr] = {};
                        if (!paxSourcesByDate[dateStr][source]) paxSourcesByDate[dateStr][source] = { adults: 0, kids: 0, revenue: 0, paid: 0, pending: 0, status: '', resIds: [], rows: [] };
                        paxSourcesByDate[dateStr][source].adults += adults;
                        paxSourcesByDate[dateStr][source].kids += kids;
                        paxSourcesByDate[dateStr][source].revenue += total;
                        paxSourcesByDate[dateStr][source].paid += paid;
                        paxSourcesByDate[dateStr][source].pending += pending;
                        paxSourcesByDate[dateStr][source].status = row['Estado de la Reserva'] || 'Confirmada';
                        
                        const resId = (row['Numero de la reserva'] || row['ID de la reserva'] || '').toString();
                        if (resId && !paxSourcesByDate[dateStr][source].resIds.includes(resId)) {
                            paxSourcesByDate[dateStr][source].resIds.push(resId);
                        }
                        paxSourcesByDate[dateStr][source].rows.push(row);
                    }

                    const roomsStr = row['Numero de habitacion'] || '';
                    const rc = roomsStr.toString().split(',').filter((r: any) => r.trim().length > 0).length || 1;
                    const n = parseInt(row['Noches']) || 1;
                    const p = (parseInt(row['Adultos']) || 0) + (parseInt(row['Niños']) || 0) || 1;
                    const roomRevenue = parseFloat((row['Total Hab.'] || '0').toString().replace(/[$,]/g, '')) || 0;
                    const isComp = (() => {
                        const fuente = (row['Fuente'] || row['fuente'] || '').toString().toLowerCase().trim();
                        return fuente.includes('comp') || fuente.includes('cortesia') || fuente.includes('cortesía') || fuente === 'gratis' || fuente === 'house use' || fuente === 'house';
                    })();

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
                        compList.push(row);
                    } else {
                        paidRoomNightsCount += (rc * n);
                    }
                }
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const next15Days: string[] = [];
            for (let i = 0; i < 15; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                next15Days.push(d.toISOString().split('T')[0]);
            }

            const formattedChartData = next15Days.map(dateStr => {
                const dateObj = new Date(dateStr + 'T12:00:00');
                return {
                    name: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                    revenue: revenueByDate[dateStr] || 0
                };
            });

            const formattedPaxData = next15Days.map(dateStr => {
                const dateObj = new Date(dateStr + 'T12:00:00');
                return {
                    name: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                    weekday: dateObj.toLocaleDateString('es-ES', { weekday: 'short' }),
                    dateStr: dateStr,
                    fullDate: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
                    adults: adultsByDate[dateStr] || 0,
                    kids: kidsByDate[dateStr] || 0,
                    total: (adultsByDate[dateStr] || 0) + (kidsByDate[dateStr] || 0),
                    sources: paxSourcesByDate[dateStr] || {}
                };
            });

            const formattedSourceData = Object.entries(sourcesMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);

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

            setCompReservations(compList);
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

    const formatCurrency = (val: number) => {
        if (isNaN(val)) return "$0.00";
        try {
            return new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD' }).format(val);
        } catch (e) {
            return `$${val.toFixed(2)}`;
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center bg-transparent"><Spinner /></div>;

    return (
        <>
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .recharts-wrapper, .recharts-wrapper *:focus, .recharts-wrapper *:active { outline: none !important; border: none !important; }
                .recharts-surface { outline: none !important; border: none !important; }
                svg, svg *:focus, svg *:active { outline: none !important; border: none !important; }
                .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: #1f2937; }
            `}</style>
            
            <div className="p-6 space-y-6 bg-transparent min-h-full text-brand-50 animate-fade-in print:hidden">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <h1 className="text-4xl font-serif font-bold text-white tracking-tight leading-tight">
                                    Dashboard de <span className="italic font-normal text-brand-300">Ocupación</span>
                                </h1>
                                <div className="h-0.5 w-12 bg-brand-400/50 mt-1 rounded-full"></div>
                            </div>
                            
                            <div className="flex flex-col border-l border-brand-800/50 pl-6">
                                <span className="text-[11px] font-sans font-bold text-brand-400 uppercase tracking-[0.5em] mb-0.5 opacity-80">
                                    Propiedad Seleccionada
                                </span>
                                <span className="text-lg font-serif italic text-white/90">
                                    {hotel.toLowerCase().includes('plus') ? "LD' Plus" : "LD' Palm Beach"}
                                </span>
                            </div>
                        </div>
                        <p className="text-brand-300/70 mt-3 font-sans font-medium text-sm max-w-2xl">
                            Análisis estratégico de métricas operativas y proyecciones de ingresos para la gestión hotelera.
                        </p>
                    </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-brand-900/50 border border-brand-800 rounded-xl p-1">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-sm font-semibold px-3 py-1 outline-none cursor-pointer">
                            {months.map((m, i) => <option key={m} value={i} className="bg-brand-900">{m}</option>)}
                        </select>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-sm font-semibold px-3 py-1 outline-none cursor-pointer">
                            {years.map(y => <option key={y} value={y} className="bg-brand-900">{y}</option>)}
                        </select>
                    </div>
                    <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-brand-900/50 hover:bg-brand-800 border border-brand-800 rounded-xl transition-all">
                        <Calendar className="w-4 h-4 text-brand-400" />
                        <span className="text-sm font-semibold">Actualizar</span>
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Ingresos Totales" value={formatCurrency(stats.totalRevenue)} icon={<TrendingUp className="w-6 h-6 text-emerald-400" />} trend="+12%" trendUp={true} color="emerald" />
                <KPICard title="Monto Pagado" value={formatCurrency(stats.paidAmount)} icon={<CreditCard className="w-6 h-6 text-blue-400" />} trend="+8%" trendUp={true} color="blue" />
                <KPICard title="Saldo Pendiente" value={formatCurrency(stats.pendingBalance)} icon={<AlertCircle className="w-6 h-6 text-amber-400" />} trend="-5%" trendUp={false} color="amber" onClick={() => setModalConfig({ isOpen: true, title: 'Resumen de Saldo Pendiente por Fuente', data: detailedStats.pendingBySource, type: 'currency' })} />
                <KPICard title="Cancelaciones" value={`${stats.cancellationRate.toFixed(1)}%`} icon={<ArrowDownRight className="w-6 h-6 text-rose-400" />} trend="+2%" trendUp={false} color="rose" onClick={() => setModalConfig({ isOpen: true, title: 'Resumen de Cancelaciones por Fuente', data: detailedStats.cancelledBySource, type: 'count' })} />
            </div>

            {/* Averages Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <CompactStatCard title="ADR" value={formatCurrency(stats.avgPerRoomNight)} icon={<Hotel />} color="emerald" label="Excluye cortesías" />
                <CompactStatCard title="Cortesías" value={`${stats.compTotalRooms} habs`} icon={<ArrowDownRight />} color="amber" onClick={() => setSelectedSourceDetail({ name: 'Habitaciones de Cortesía', rows: compReservations, revenue: 0, paid: 0, pending: 0 })} />
                <CompactStatCard title="RevPAR" value={formatCurrency(stats.revpar)} icon={<TrendingUp />} color="indigo" />
                <CompactStatCard title="Ocupación" value={`${stats.occupancy.toFixed(1)}%`} icon={<Users />} color="blue" label={`${stats.avgRoomsOccupied.toFixed(1)} habs prom.`} />
                <CompactStatCard title="Prom. Noche" value={formatCurrency(stats.avgPerNight)} icon={<Calendar />} color="amber" />
                <CompactStatCard title="Prom. Pax" value={formatCurrency(stats.avgPerPax)} icon={<Users />} color="rose" />
                <CompactStatCard title="Pax / Noche" value={formatCurrency(stats.avgPerPaxNight)} icon={<TrendingUp />} color="brand" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-brand-900/40 backdrop-blur-xl p-6 rounded-3xl border border-brand-800 relative min-h-[400px]">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Proyección 15 Días</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-brand-900/40 backdrop-blur-xl border border-brand-800 p-6 rounded-3xl flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><Hotel className="w-5 h-5 text-blue-400" /> Ingresos por Fuente</h3>
                    <div className="flex-grow min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={sourceData} cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5} dataKey="value">
                                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-brand-900/60 p-6 rounded-[32px] border border-brand-800 relative z-10">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" /> Proyección de Huéspedes</h3>
                <div className="h-[300px] relative w-full pointer-events-auto">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                            data={paxData} 
                            style={{ cursor: 'pointer', border: 'none', outline: 'none', background: 'transparent' }}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            onClick={(state: any) => {
                                if (state && state.activePayload && state.activePayload.length > 0) {
                                    setSelectedPaxDetail(state.activePayload[0].payload);
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={(props: any) => {
                                    const { x, y, payload } = props;
                                    const data = paxData[payload.index];
                                    return (
                                        <g transform={`translate(${x},${y})`}>
                                            <text x={0} y={0} dy={16} textAnchor="middle" fill="#94a3b8" fontSize={12} fontWeight="bold">
                                                {payload.value}
                                            </text>
                                            <text x={0} y={0} dy={32} textAnchor="middle" fill="#38bdf8" fontSize={11} fontWeight="600" className="capitalize">
                                                {data?.weekday}
                                            </text>
                                        </g>
                                    );
                                }} 
                                height={60}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                isAnimationActive={false}
                                contentStyle={{
                                    backgroundColor: '#06201b',
                                    border: '1px solid #164d42',
                                    borderRadius: '16px',
                                    padding: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                                }}
                                itemStyle={{ padding: '2px 0' }}
                                labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}
                            />
                            <Bar 
                                dataKey="adults" 
                                name="Adultos" 
                                stackId="a" 
                                fill="#3b82f6" 
                                radius={[0, 0, 0, 0]}
                                onClick={(data, index, e) => {
                                    // Prevenir que el click se pierda
                                    if (data) setSelectedPaxDetail(data);
                                }}
                            />
                            <Bar 
                                dataKey="kids" 
                                name="Niños" 
                                stackId="a" 
                                fill="#10b981" 
                                radius={[4, 4, 0, 0]}
                                onClick={(data, index, e) => {
                                    if (data) setSelectedPaxDetail(data);
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Critical Table */}
            <div className="bg-brand-900/40 border border-brand-800 p-6 rounded-3xl">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-rose-400" /> Saldos Críticos</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="text-brand-400 text-xs uppercase border-b border-brand-800"><th className="pb-4">Huésped</th><th className="pb-4">Fuente</th><th className="pb-4">Saldo</th><th className="pb-4 text-right">Acción</th></tr></thead>
                        <tbody className="text-sm">
                            {criticalReservations.map((res, i) => (
                                <tr key={i} className="border-b border-brand-800/50 hover:bg-brand-800/20 transition-colors">
                                    <td className="py-4 font-bold">{res['Nombre'] || 'N/A'}</td>
                                    <td className="py-4 text-brand-300">{res['Fuente']}</td>
                                    <td className="py-4 text-rose-400 font-bold">{formatCurrency(parseFloat(res['Saldo Pendiente']) || 0)}</td>
                                    <td className="py-4 text-right"><button onClick={() => setSelectedReservation(res)} className="px-3 py-1 bg-brand-800 hover:bg-brand-700 rounded-lg border border-brand-700 text-xs font-bold transition-all">Ver Detalle</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-md" onClick={() => setModalConfig({...modalConfig, isOpen: false})} />
                    <div className="relative w-full max-w-md bg-brand-900 border border-brand-700 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-brand-800 flex justify-between items-center bg-brand-800/50">
                            <h3 className="text-xl font-bold">{modalConfig.title}</h3>
                            <button onClick={() => setModalConfig({...modalConfig, isOpen: false})} className="p-2 hover:bg-brand-700 rounded-full transition-colors"><X className="w-5 h-5 text-brand-400" /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-3">
                            {Object.entries(modalConfig.data).map(([_, entry]: [any, any]) => (
                                <div key={entry.name} className="flex justify-between items-center p-4 bg-brand-800/30 border border-brand-700/50 rounded-2xl">
                                    <span className="text-brand-300 font-medium">{entry.name}</span>
                                    <span className={`font-bold ${modalConfig.type === 'currency' ? 'text-emerald-400' : 'text-blue-400'}`}>{modalConfig.type === 'currency' ? formatCurrency(entry.value) : `${entry.value}`}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {selectedPaxDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-md" onClick={() => setSelectedPaxDetail(null)} />
                    <div className="relative w-full max-w-xl bg-[#0a4d40] border border-[#166658] rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-8 pb-6 border-b border-[#166658]/30 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#166658] rounded-xl text-brand-300/80"><Users className="w-5 h-5" /></div>
                                    <span className="text-[10px] font-bold text-brand-300/80 uppercase tracking-[0.2em]">Resumen de Huéspedes</span>
                                </div>
                                <button onClick={() => setSelectedPaxDetail(null)} className="p-2 hover:bg-[#166658] rounded-full transition-colors text-white/80"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="flex items-baseline gap-3">
                                <h3 className="text-4xl font-black text-white leading-tight">{selectedPaxDetail.fullDate}</h3>
                                <span className="text-[13px] font-mono font-bold text-brand-400 uppercase tracking-[0.4em] whitespace-nowrap opacity-90">
                                    {hotel.toLowerCase().includes('plus') ? 'Hotel Plus' : 'Hotel Palm'}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <div className="px-5 py-2.5 bg-[#166658] border border-[#1d7a6a] rounded-2xl flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                                    <span className="text-sm font-bold text-blue-100/90">{selectedPaxDetail.adults} Adultos</span>
                                </div>
                                <div className="px-5 py-2.5 bg-[#166658] border border-[#1d7a6a] rounded-2xl flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                    <span className="text-sm font-bold text-emerald-100/90">{selectedPaxDetail.kids} Niños</span>
                                </div>
                                {(() => {
                                    let totalRoomsCount = 0;
                                    Object.values(selectedPaxDetail.sources).forEach((s: any) => {
                                        s.rows.forEach((r: any) => {
                                            const rc = (r['Numero de habitacion'] || '').toString().split(',').filter((item: string) => item.trim().length > 0).length || 1;
                                            totalRoomsCount += rc;
                                        });
                                    });
                                    return (
                                        <div className="px-5 py-2.5 bg-[#166658] border border-[#1d7a6a] rounded-2xl flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                                            <span className="text-sm font-bold text-amber-100/90">{totalRoomsCount} {totalRoomsCount === 1 ? 'Habitación' : 'Habitaciones'}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-grow overflow-y-auto p-8 pt-6 no-scrollbar space-y-6">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-brand-500 uppercase tracking-[0.2em] pl-1">Distribución por Fuente</h4>
                                {Object.entries(selectedPaxDetail.sources).map(([source, data]: [string, any]) => {
                                    // Calcular cantidad de habitaciones (por registro)
                                    let roomCount = 0;
                                    data.rows.forEach((r: any) => {
                                        const rc = (r['Numero de habitacion'] || '').toString().split(',').filter((s: string) => s.trim().length > 0).length || 1;
                                        roomCount += rc;
                                    });
                                    const isSmallAmount = data.revenue > 0 && data.revenue < 100;
                                    const hasBalance = data.pending > 0;
                                    const statusStr = hasBalance ? 'PENDIENTE' : 'PAGADO';

                                    return (
                                        <div key={source} onClick={() => setSelectedSourceDetail({name: source, rows: data.rows, date: selectedPaxDetail.dateStr, revenue: data.revenue, paid: data.paid, pending: data.pending})} className={`group border transition-all hover:translate-y-[-1px] hover:shadow-xl shadow-md rounded-2xl p-4 cursor-pointer hover:border-brand-500/30 ${
                                            hasBalance 
                                                ? 'bg-[#1b4a40] border-amber-500/80 ring-1 ring-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.25)]' 
                                                : isSmallAmount 
                                                    ? 'bg-[#114d42] border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.15)]' 
                                                    : 'bg-[#0a4d40] border-[#166658]/40'
                                        }`}>
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-[#166658] border border-[#1d7a6a]/50 rounded-xl flex items-center justify-center text-lg font-black text-brand-300/80">{source.charAt(0)}</div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <h4 className="text-base font-bold text-white tracking-tight leading-none">{source}</h4>
                                                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter ${hasBalance ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                                                {statusStr}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] font-bold text-brand-400/80 uppercase">{data.adults} Ad. • {data.kids} Ni.</p>
                                                            <div className="w-1 h-1 rounded-full bg-brand-600" />
                                                            <p className="text-[10px] font-bold text-brand-300/60 uppercase">{roomCount} {roomCount === 1 ? 'Habitación' : 'Habitaciones'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-white leading-none">{data.adults + data.kids}</p>
                                                    <p className="text-[8px] font-bold text-brand-500 uppercase tracking-widest mt-0.5">Pax</p>
                                                </div>
                                            </div>
                                            
                                            <div className="h-px bg-white/5 mb-3" />
                                            
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-[8px] font-black text-brand-500 uppercase tracking-widest mb-0.5">Total</p>
                                                    <p className={`text-sm font-black ${isSmallAmount ? 'text-rose-400' : 'text-white'}`}>{formatCurrency(data.revenue)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-brand-500 uppercase tracking-widest mb-0.5">Pagado</p>
                                                    <p className="text-sm font-black text-emerald-400">{formatCurrency(data.paid)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-brand-500 uppercase tracking-widest mb-0.5">Pendiente</p>
                                                    <p className="text-sm font-black text-amber-500">{formatCurrency(data.pending)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-[#0a4d40] border-t border-[#166658]/30">
                            <button onClick={() => setSelectedPaxDetail(null)} className="w-full py-5 bg-[#166658] hover:bg-[#1d7a6a] text-white font-black text-lg rounded-3xl transition-all border border-[#1d7a6a]/50 shadow-lg active:scale-[0.98]">
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedReservation && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-950/95 backdrop-blur-2xl" onClick={() => setSelectedReservation(null)} />
                    <div className="relative w-full max-w-xl bg-[#082b24] border border-[#164d42] rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
                        {/* Header */}
                        <div className="p-8 pb-6 border-b border-[#164d42]/30 flex justify-between items-start">
                            <div>
                                <div className="flex items-baseline gap-3">
                                    <h3 className="text-3xl font-black text-white tracking-tight uppercase">Detalle de Reserva</h3>
                                    <span className="text-[11px] font-mono font-bold text-brand-400 uppercase tracking-[0.4em] whitespace-nowrap opacity-90">
                                        {hotel.toLowerCase().includes('plus') ? 'Hotel Plus' : 'Hotel Palm'}
                                    </span>
                                </div>
                                <span className="text-brand-500 font-bold text-sm tracking-widest">#{selectedReservation['Numero de la reserva']}</span>
                            </div>
                            <button onClick={() => setSelectedReservation(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-6 overflow-y-auto no-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-[#0a362d] border border-[#164d42]/50 rounded-2xl">
                                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Llegada</p>
                                    <p className="text-base font-bold text-white">{new Date(selectedReservation['Fecha de llegada']).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div className="p-4 bg-[#0a362d] border border-[#164d42]/50 rounded-2xl">
                                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Salida</p>
                                    <p className="text-base font-bold text-white">{new Date(selectedReservation['Salida']).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div className="p-4 bg-[#0a362d] border border-[#164d42]/50 rounded-2xl">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-2"><Bed className="w-3.5 h-3.5" /> Habitación</p>
                                        <span className="px-1.5 py-0.5 bg-brand-500/20 rounded text-[9px] font-black text-brand-300 border border-brand-500/20">
                                            {selectedReservation['Numero de habitacion'] ? selectedReservation['Numero de habitacion'].toString().split(',').filter(Boolean).length : 0} CANT.
                                        </span>
                                    </div>
                                    <p className="text-base font-bold text-white truncate">{selectedReservation['Numero de habitacion'] || 'N/A'}</p>
                                </div>
                                <div className="p-4 bg-[#0a362d] border border-[#164d42]/50 rounded-2xl">
                                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Estancia</p>
                                    <p className="text-base font-bold text-white">
                                        {selectedReservation['Noches'] || '1'} Noches • {(parseInt(selectedReservation['Adultos']) || 0) + (parseInt(selectedReservation['Niños']) || 0)} Pax
                                    </p>
                                </div>
                            </div>

                            <div className="bg-[#0a362d] border border-[#164d42]/50 rounded-3xl p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-brand-400 uppercase tracking-wider">Monto Total</span>
                                    <span className="text-xl font-black text-white">{formatCurrency(parseFloat(selectedReservation['Total General']) || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-brand-400 uppercase tracking-wider">Abonado</span>
                                    <span className="text-xl font-black text-emerald-400">{formatCurrency(parseFloat(selectedReservation['Monto Pagado']) || 0)}</span>
                                </div>
                                <div className="h-px bg-white/5" />
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm font-black text-rose-400 uppercase tracking-[0.2em]">Saldo Pendiente</span>
                                    <span className="text-3xl font-black text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">{formatCurrency(parseFloat(selectedReservation['Saldo Pendiente']) || 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 pt-0">
                            <button onClick={() => setSelectedReservation(null)} className="w-full py-5 bg-[#166658] hover:bg-[#1d7a6a] text-white font-black text-lg rounded-[24px] transition-all border border-[#1d7a6a]/40 uppercase tracking-[0.2em] shadow-lg">
                                Volver a la Lista
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedSourceDetail && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-950/95 backdrop-blur-2xl" onClick={() => setSelectedSourceDetail(null)} />
                    <div className="relative w-full max-w-xl bg-[#082b24] border border-[#164d42] rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh]">
                        {/* Header */}
                        <div className="p-8 pb-4 border-b border-[#164d42]/30">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1.5 bg-blue-500/10 rounded-lg flex items-center gap-2 border border-blue-500/20">
                                        <Tag className="w-3.5 h-3.5 text-blue-400" />
                                        <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Detalle de Reservas</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => window.print()} className="p-2 hover:bg-brand-500/20 rounded-full transition-colors text-brand-400 hover:text-brand-300 group" title="Imprimir Lista">
                                        <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                    <button onClick={() => setSelectedSourceDetail(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white" title="Cerrar">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-white mb-1 tracking-tight">{selectedSourceDetail.name}</h3>
                            <p className="text-sm font-medium text-brand-500 uppercase tracking-wide">Total de {selectedSourceDetail.rows.length} registros encontrados</p>
                            
                            {/* Resumen de Pax */}
                            <div className="flex gap-2 mt-3">
                                {(() => {
                                    const tA = selectedSourceDetail.rows.reduce((s: number, r: any) => s + (parseInt(r['Adultos']) || 0), 0);
                                    const tK = selectedSourceDetail.rows.reduce((s: number, r: any) => s + (parseInt(r['Niños']) || 0), 0);
                                    
                                    let totalRooms = 0;
                                    selectedSourceDetail.rows.forEach((r: any) => {
                                        const rc = (r['Numero de habitacion'] || '').toString().split(',').filter((s: string) => s.trim().length > 0).length || 1;
                                        totalRooms += rc;
                                    });

                                    return (
                                        <>
                                            <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] font-black text-blue-300 uppercase tracking-widest">
                                                {tA} ADULTOS
                                            </div>
                                            <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-black text-emerald-300 uppercase tracking-widest">
                                                {tK} NIÑOS
                                            </div>
                                            <div className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-[9px] font-black text-amber-100 uppercase tracking-widest">
                                                {totalRooms} {totalRooms === 1 ? 'HABITACIÓN' : 'HABITACIONES'}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Body - Reservation Cards */}
                        <div className="flex-grow overflow-y-auto p-8 pt-6 no-scrollbar space-y-4">
                            {selectedSourceDetail.rows.map((row: any, idx: number) => {
                                const total = parseFloat(row['Total General']) || 0;
                                const paid = parseFloat(row['Monto Pagado']) || 0;
                                const pending = parseFloat(row['Saldo Pendiente']) || 0;
                                const statusStr = (row['Estado de la reserva'] || 'Confirmada').toUpperCase();
                                const isPending = statusStr.includes('PENDIENTE');

                                return (
                                    <div key={idx} onClick={() => setSelectedReservation(row)} className="group bg-[#0a362d] border border-[#164d42]/50 rounded-[32px] p-6 cursor-pointer hover:border-brand-500/40 transition-all hover:shadow-2xl hover:translate-x-1">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-4 flex-grow">
                                                <div className="flex items-center gap-3">
                                                    <div className="px-4 py-1.5 bg-brand-950/60 rounded-xl border border-brand-800 text-xs font-black text-white/90">
                                                        Loc: {row['Numero de la reserva']}
                                                    </div>
                                                    <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${isPending ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                                        {statusStr}
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center gap-3 text-white/90">
                                                        <User className="w-4 h-4 text-brand-500" />
                                                        <span className="text-sm font-bold tracking-tight">{row['Nombre'] || 'Huésped sin nombre'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center gap-2.5 text-brand-300/70">
                                                            <Bed className="w-4 h-4 text-brand-500" />
                                                            <span className="text-xs font-bold tracking-tight">Hab: {row['Numero de habitacion'] || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 text-brand-300/70">
                                                            <Users className="w-4 h-4 text-brand-500" />
                                                            <span className="text-xs font-bold tracking-tight">{row['Pax Total']} Pax ({row['Adultos']}/{row['Niños']})</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center gap-2.5 text-emerald-500/80">
                                                            <Calendar className="w-4 h-4" />
                                                            <span className="text-xs font-bold tracking-tight">Entrada: {new Date(row['Fecha de llegada']).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 text-rose-500/80">
                                                            <Calendar className="w-4 h-4" />
                                                            <span className="text-xs font-bold tracking-tight">Salida: {new Date(row['Salida']).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right flex flex-col items-end gap-1">
                                                <div className="p-2 bg-brand-800/30 rounded-lg mb-2"><Printer className="w-4 h-4 text-blue-400" /></div>
                                                <p className="text-2xl font-black text-white tracking-tighter">{formatCurrency(total)}</p>
                                                <p className="text-[10px] font-black text-emerald-400 uppercase">PAG: {formatCurrency(paid)}</p>
                                                <p className="text-[10px] font-black text-amber-500 uppercase">PEN: {formatCurrency(pending)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer - Totals & Close */}
                        <div className="p-8 pt-0 bg-[#082b24] space-y-6">
                            <div className="grid grid-cols-3 gap-1 bg-[#0a362d] border border-[#164d42]/50 rounded-[24px] overflow-hidden">
                                <div className="p-5 border-r border-[#164d42]/50 text-center">
                                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-1.5">Total Hab.</p>
                                    <p className="text-2xl font-black text-white">{formatCurrency(selectedSourceDetail.revenue)}</p>
                                </div>
                                <div className="p-5 border-r border-[#164d42]/50 text-center">
                                    <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.2em] mb-1.5">Total Pagado</p>
                                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(selectedSourceDetail.paid)}</p>
                                </div>
                                <div className="p-5 text-center">
                                    <p className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em] mb-1.5">Total Pend.</p>
                                    <p className="text-2xl font-black text-amber-500">{formatCurrency(selectedSourceDetail.pending)}</p>
                                </div>
                            </div>

                            <button onClick={() => setSelectedSourceDetail(null)} className="w-full py-5 bg-[#166658] hover:bg-[#1d7a6a] text-white font-black text-xl rounded-[24px] transition-all border border-[#1d7a6a]/40 shadow-[0_8px_30px_rgba(22,102,88,0.3)] hover:shadow-[0_12px_40px_rgba(22,102,88,0.5)] active:scale-[0.98] uppercase tracking-widest">
                                Cerrar Detalles
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        {/* VISTA DE IMPRESIÓN PROFESIONAL (Solo visible al imprimir) */}
        {selectedSourceDetail && (
            <div className="hidden print:block w-full bg-white text-black font-sans pt-8 pb-12 px-4">
                {/* Header Profesional */}
                <div className="flex justify-between items-end border-b-2 border-gray-800 pb-6 mb-8">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-widest text-gray-900 mb-1">
                            {hotel.toLowerCase().includes('plus') ? "LD Plus Hotel & Suites" : "LD Palm Beach"}
                        </h2>
                        <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">Reporte Operativo</p>
                    </div>
                    <div className="text-right">
                        <h1 className="text-2xl font-black uppercase tracking-tight text-gray-800">{selectedSourceDetail.name}</h1>
                        {(() => {
                            const tA = selectedSourceDetail.rows.reduce((s: number, r: any) => s + (parseInt(r['Adultos']) || 0), 0);
                            const tK = selectedSourceDetail.rows.reduce((s: number, r: any) => s + (parseInt(r['Niños']) || 0), 0);
                            let totalRooms = 0;
                            selectedSourceDetail.rows.forEach((r: any) => {
                                const rc = (r['Numero de habitacion'] || '').toString().split(',').filter((s: string) => s.trim().length > 0).length || 1;
                                totalRooms += rc;
                            });
                            return (
                                <div className="mt-2 flex flex-col items-end gap-1">
                                    <p className="text-sm font-bold text-gray-600">{selectedSourceDetail.rows.length} Registros (Reservas) <span className="mx-2">|</span> <span className="text-gray-900 font-black">{totalRooms} Habitaciones</span></p>
                                    <p className="text-xs font-semibold text-gray-500">{tA} Adultos <span className="mx-2">·</span> {tK} Niños</p>
                                </div>
                            );
                        })()}
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-3">Generado: {new Date().toLocaleString('es-VE')}</p>
                    </div>
                </div>

                {/* Tabla */}
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-gray-100 border-y-2 border-gray-800">
                            <th className="py-3 px-3 font-bold uppercase tracking-wider text-gray-700">Localizador</th>
                            <th className="py-3 px-3 font-bold uppercase tracking-wider text-gray-700">Huésped principal</th>
                            <th className="py-3 px-3 font-bold uppercase tracking-wider text-center text-gray-700">Habitación</th>
                            <th className="py-3 px-3 font-bold uppercase tracking-wider text-center text-gray-700">Pax</th>
                            <th className="py-3 px-3 font-bold uppercase tracking-wider text-center text-gray-700">Estadía</th>
                            <th className="py-3 px-3 font-bold uppercase tracking-wider text-right text-gray-700">Monto Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedSourceDetail.rows.map((row: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 break-inside-avoid">
                                <td className="py-3 px-3 font-mono font-semibold text-gray-800">{row['Numero de la reserva']}</td>
                                <td className="py-3 px-3 font-bold text-gray-900">{row['Nombre'] || 'S/N'}</td>
                                <td className="py-3 px-3 text-center font-bold text-gray-900">{row['Numero de habitacion'] || '-'}</td>
                                <td className="py-3 px-3 text-center text-gray-700">{row['Pax Total'] || (parseInt(row['Adultos'] || 0) + parseInt(row['Niños'] || 0))}</td>
                                <td className="py-3 px-3 text-center whitespace-nowrap text-gray-600 font-medium">
                                    {new Date(row['Fecha de llegada']).toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})} 
                                    {' al '} 
                                    {new Date(row['Salida']).toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})}
                                </td>
                                <td className="py-3 px-3 text-right font-black text-gray-900 whitespace-nowrap">{formatCurrency(parseFloat(row['Total General']) || 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50 border-y-2 border-gray-800">
                            <td colSpan={5} className="py-4 px-3 text-right font-black uppercase text-sm text-gray-800 tracking-wider">Total Generado</td>
                            <td className="py-4 px-3 text-right font-black text-lg text-gray-900">{formatCurrency(selectedSourceDetail.revenue)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Footer Profesional */}
                <div className="mt-12 pt-4 border-t border-gray-300 text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        Este documento es de uso interno y estrictamente confidencial.
                    </p>
                </div>
            </div>
        )}
        </>
    );
}

function CompactStatCard({ title, value, icon, color, label, onClick }: any) {
    const colorClasses: any = {
        emerald: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
        blue: 'border-blue-500/20 text-blue-400 bg-blue-500/5',
        amber: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
        rose: 'border-rose-500/20 text-rose-400 bg-rose-500/5',
        indigo: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5',
        brand: 'border-brand-500/20 text-brand-400 bg-brand-500/5'
    };
    return (
        <div onClick={onClick} className={`flex flex-col p-3 rounded-xl border backdrop-blur-md transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} ${colorClasses[color] || 'border-brand-800 bg-brand-900/40'}`}>
            <div className="flex items-center gap-2 mb-1.5"><div className="p-1 rounded-lg bg-brand-800 border border-brand-700/50">{icon && React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { className: "w-3.5 h-3.5" }) : null}</div><span className="text-[9px] font-bold uppercase tracking-widest text-brand-400">{title}</span></div>
            <div className="flex flex-col"><span className="text-base font-bold text-white">{value}</span>{label && <span className="text-[8px] text-brand-500 font-medium mt-0.5 leading-tight">{label}</span>}</div>
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
        <div onClick={onClick} className={`bg-brand-900/40 backdrop-blur-xl border p-6 rounded-3xl shadow-xl transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} ${colorClasses[color] || 'border-brand-800'}`}>
            <div className="flex justify-between items-start mb-4"><div className="p-3 bg-brand-800 rounded-2xl">{icon}</div><div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{trend}</div></div>
            <div><p className="text-brand-400 text-sm font-medium uppercase tracking-wider">{title}</p><h4 className="text-2xl font-bold mt-1 tracking-tight">{value}</h4></div>
        </div>
    );
}

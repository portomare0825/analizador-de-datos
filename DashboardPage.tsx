
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
    Bar
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
        occupancy: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [sourceData, setSourceData] = useState<any[]>([]);
    const [criticalReservations, setCriticalReservations] = useState<any[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const tableName = hotel === 'plus' ? 'reservas' : 'reservaspalm';
            // Fetch a larger sample for the dashboard
            const rawData = await fetchDataFromSupabase(tableName, 5000);
            const { data: processed } = processDatabaseData(rawData);
            
            setData(processed);
            calculateStats(processed);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const calculateStats = (processedData: any[]) => {
        let totalRev = 0;
        let totalPaid = 0;
        let totalPending = 0;
        let cancelledCount = 0;
        let confirmedCount = 0;
        
        const sourcesMap: Record<string, number> = {};
        const revenueByDate: Record<string, number> = {};

        processedData.forEach(row => {
            const total = parseFloat(row['Total General']) || 0;
            const paid = parseFloat(row['Monto Pagado']) || 0;
            const pending = parseFloat(row['Saldo Pendiente']) || 0;
            const status = (row['Estado de la Reserva'] || '').toLowerCase();
            const source = row['Fuente'] || 'Desconocido';
            const date = row['Fecha de llegada'];

            if (status.includes('cancel')) {
                cancelledCount++;
            } else {
                confirmedCount++;
                totalRev += total;
                totalPaid += paid;
                totalPending += pending;

                // Group by source
                sourcesMap[source] = (sourcesMap[source] || 0) + total;

                // Group by date for chart
                if (date instanceof Date) {
                    const dateStr = date.toISOString().split('T')[0];
                    revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + total;
                }
            }
        });

        // Format chart data
        const sortedDates = Object.keys(revenueByDate).sort();
        const formattedChartData = sortedDates.slice(-15).map(date => ({
            name: new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            revenue: revenueByDate[date]
        }));

        // Format source data
        const formattedSourceData = Object.entries(sourcesMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // Find critical reservations (High pending balance)
        const critical = processedData
            .filter(r => !r['Estado de la Reserva']?.toLowerCase().includes('cancel'))
            .sort((a, b) => (parseFloat(b['Saldo Pendiente']) || 0) - (parseFloat(a['Saldo Pendiente']) || 0))
            .slice(0, 5);

        setStats({
            totalRevenue: totalRev,
            paidAmount: totalPaid,
            pendingBalance: totalPending,
            cancellationRate: (cancelledCount / (cancelledCount + confirmedCount)) * 100 || 0,
            averageDailyRate: totalRev / confirmedCount || 0,
            occupancy: 0 // Would need rooms availability
        });

        setChartData(formattedChartData);
        setSourceData(formattedSourceData);
        setCriticalReservations(critical);
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center bg-brand-950">
            <Spinner />
        </div>;
    }

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="p-6 space-y-6 bg-brand-950 min-h-full text-brand-50 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-brand-400 bg-clip-text text-transparent">
                        Panel de Resumen
                    </h1>
                    <p className="text-brand-400 mt-1">Vista general del desempeño y auditoría de ingresos</p>
                </div>
                <button 
                    onClick={loadData}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-800 hover:bg-brand-700 rounded-xl transition-all border border-brand-700 shadow-lg"
                >
                    <Calendar className="w-4 h-4 text-brand-400" />
                    <span>Actualizar Datos</span>
                </button>
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
                />
                <KPICard 
                    title="Tasa de Cancelación" 
                    value={`${stats.cancellationRate.toFixed(1)}%`} 
                    icon={<ArrowDownRight className="w-6 h-6 text-rose-400" />}
                    trend="+2%"
                    trendUp={false}
                    color="rose"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Revenue Chart */}
                <div className="lg:col-span-2 bg-brand-900/40 backdrop-blur-xl border border-brand-800 p-6 rounded-3xl shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <TrendingUp size={120} />
                    </div>
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        Tendencia de Ingresos (Últimos 15 días)
                    </h3>
                    <div className="h-[300px] w-full">
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
                <div className="bg-brand-900/40 backdrop-blur-xl border border-brand-800 p-6 rounded-3xl shadow-2xl">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Hotel className="w-5 h-5 text-blue-400" />
                        Ingresos por Fuente
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sourceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
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

            {/* Critical Reservations Table */}
            <div className="bg-brand-900/40 backdrop-blur-xl border border-brand-800 p-6 rounded-3xl shadow-2xl">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                    Saldos Pendientes Críticos
                </h3>
                <div className="overflow-x-auto">
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
                                        <button className="text-brand-400 hover:text-white transition-colors">Ver Detalles</button>
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

function KPICard({ title, value, icon, trend, trendUp, color }: any) {
    const colorClasses: any = {
        emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
        blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20',
        amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20',
        rose: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20'
    };

    return (
        <div className={`bg-brand-900/40 backdrop-blur-xl border border-brand-800 p-6 rounded-3xl shadow-xl group hover:border-brand-700 transition-all duration-300`}>
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

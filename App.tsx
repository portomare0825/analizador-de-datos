

import React, { useState } from 'react';
import { AuditPage } from './AuditPage';
import { ReportsPage } from './ReportsPage';
import { TaxAuditPage } from './TaxAuditPage';
import { TransactionsPage } from './TransactionsPage';
import { HomeIcon } from './components/icons/HomeIcon';
import { ChartBarIcon } from './components/icons/ChartBarIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from './components/icons/ChevronRightIcon';
import { ClipboardDocumentCheckIcon } from './components/icons/ClipboardDocumentCheckIcon';
import { BanknotesIcon } from './components/icons/BanknotesIcon';
import { DatabaseMetricsPage } from './DatabaseMetricsPage';
import { DashboardPage } from './DashboardPage';
import { CxCPagosPage } from './CxCPagosPage';
import { LayoutDashboard, Database as DatabaseIcon, CreditCard } from 'lucide-react';
import pkg from './package.json';
import { HotelProvider } from './contexts/HotelContext';
import { AutoUpdateBanner } from './components/AutoUpdateBanner';
import { useEffect } from 'react';
import { useHotel } from './contexts/HotelContext';


type View = 'dashboard' | 'audit' | 'tax-audit' | 'transactions' | 'reports' | 'metrics' | 'cxc';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { CustomModal } from './components/CustomModal';

export default function App() {
    return (
        <AuthProvider>
            <HotelProvider>
                <AppContent />
            </HotelProvider>
        </AuthProvider>
    );
}

function AppContent() {
    const { session, loading, signOut } = useAuth();
    const { hotel, setHotel } = useHotel();
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'none' | 'available' | 'downloading' | 'downloaded'>('none');
    const [downloadPercent, setDownloadPercent] = useState(0);

    useEffect(() => {
        // Listeners para actualizaciones automáticas de Electron
        const ipc = (window as any).ipcRenderer;
        if (!ipc) return;

        ipc.on('update_available', () => {
            setUpdateStatus('available');
        });

        ipc.on('download_progress', (_event: any, percent: number) => {
            setUpdateStatus('downloading');
            setDownloadPercent(percent);
        });

        ipc.on('update_downloaded', () => {
            setUpdateStatus('downloaded');
        });

        return () => {
            ipc.off('update_available', () => {});
            ipc.off('download_progress', () => {});
            ipc.off('update_downloaded', () => {});
        };
    }, []);

    const handleRestart = () => {
        (window as any).ipcRenderer.send('restart_app');
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-brand-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand-800 border-t-brand-400 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!session) {
        return <LoginPage />;
    }

    const menuItems = [
        { id: 'dashboard', label: 'Panel de Resumen', icon: LayoutDashboard },
        { id: 'audit', label: 'Auditoría General', icon: HomeIcon },
        { id: 'tax-audit', label: 'Auditoría de Tasas', icon: ClipboardDocumentCheckIcon },
        { id: 'transactions', label: 'Transacciones', icon: BanknotesIcon },
        { id: 'cxc', label: 'Pagos CxC', icon: CreditCard },
        { id: 'reports', label: 'Reportes Históricos', icon: ChartBarIcon },
        { id: 'metrics', label: 'Estado de la BD', icon: DatabaseIcon },
    ];

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return <DashboardPage />;
            case 'audit':
                return <AuditPage />;
            case 'tax-audit':
                return <TaxAuditPage />;
            case 'transactions':
                return <TransactionsPage />;
            case 'cxc':
                return <CxCPagosPage />;
            case 'reports':
                return <ReportsPage />;
            case 'metrics':
                return <DatabaseMetricsPage />;
            default:
                return <DashboardPage />;
        }
    };

    const appVersion = `v${pkg.version}`;

    return (
        <div className="flex flex-col h-screen bg-brand-950 text-brand-50 font-sans overflow-hidden relative">
            {/* Imagen de fondo contable con degradado (idéntico al del Login) */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-75 mix-blend-overlay pointer-events-none z-0"
                style={{ backgroundImage: "url('login-bg.png')" }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-transparent to-brand-950 pointer-events-none z-0"></div>

            {/* Círculos de fondo decorativos */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

            <div className="flex flex-col h-full w-full relative z-10 overflow-hidden">
                {/* Banner de Actualización Automática */}
                <AutoUpdateBanner 
                    status={updateStatus}
                    percent={downloadPercent}
                    onRestart={handleRestart}
                    onClose={() => setUpdateStatus('none')}
                />

                <div className="flex flex-1 overflow-hidden">

                {/* Sidebar Desktop - Más compacto y translúcido */}
                <aside
                    className={`hidden md:flex flex-col bg-brand-900/60 backdrop-blur-xl border-r border-brand-800 transition-all duration-300 ease-in-out z-20 ${isCollapsed ? 'w-16' : 'w-56'
                        }`}
                >
                    {/* Header Logo */}
                    <div className={`h-16 flex items-center border-b border-brand-800 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-2'}`}>
                        <div className="bg-brand-800 p-1.5 rounded-lg shrink-0 transition-transform duration-300 hover:scale-105">
                            <SparklesIcon className="w-5 h-5 text-brand-400" />
                        </div>
                        {!isCollapsed && (
                            <span className="font-bold text-base tracking-tight whitespace-nowrap overflow-hidden animate-fade-in">
                                LD' Analytics
                            </span>
                        )}
                    </div>

                    {/* Selector de Hotel */}
                    <div className={`px-2 py-4 border-b border-brand-800 ${isCollapsed ? 'flex justify-center' : ''}`}>
                        <div className={`bg-brand-950/50 rounded-xl p-1 flex w-full ${isCollapsed ? 'flex-col gap-1' : 'flex-row gap-1'}`}>
                            <button
                                onClick={() => setHotel('plus')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                                    hotel === 'plus' 
                                    ? 'bg-brand-800 text-white shadow-inner' 
                                    : 'text-brand-500 hover:text-brand-300'
                                }`}
                            >
                                {isCollapsed ? 'P+' : 'LD Plus'}
                            </button>
                            <button
                                onClick={() => setHotel('palm')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                                    hotel === 'palm' 
                                    ? 'bg-brand-800 text-white shadow-inner' 
                                    : 'text-brand-500 hover:text-brand-300'
                                }`}
                            >
                                {isCollapsed ? 'Pa' : 'LD Palm'}
                            </button>
                        </div>
                    </div>

                    {/* Navigation Items - Padding reducido */}
                    <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-brand-800">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentView(item.id as View)}
                                    title={isCollapsed ? item.label : ''}
                                    className={`w-full flex items-center transition-all duration-200 group relative rounded-lg
                            ${isCollapsed ? 'justify-center py-2 px-0' : 'gap-3 px-3 py-2'}
                            ${isActive
                                            ? 'bg-brand-800 text-white shadow-lg shadow-brand-900/50'
                                            : 'text-brand-300 hover:bg-brand-800/50 hover:text-brand-100'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 shrink-0 transition-colors duration-200 ${isActive ? 'text-brand-400' : 'text-brand-500 group-hover:text-brand-400'}`} />

                                    {!isCollapsed && (
                                        <span className="font-medium text-sm whitespace-nowrap overflow-hidden animate-fade-in text-left">
                                            {item.label}
                                        </span>
                                    )}

                                    {/* Indicador de activo en modo colapsado */}
                                    {isCollapsed && isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-brand-400 rounded-r-full" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Footer & Toggle - Más compacto */}
                    <div className="p-2 border-t border-brand-800 flex flex-col gap-2">
                        {/* Logout Button */}
                        <button
                            onClick={() => setShowLogoutModal(true)}
                            className={`flex items-center transition-all duration-200 rounded-lg text-red-500 hover:bg-red-500/10
                                ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'}
                            `}
                            title="Cerrar sesión"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                            </svg>
                            {!isCollapsed && <span className="text-sm font-medium">Cerrar Sesión</span>}
                        </button>

                        {/* Toggle Button */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`flex items-center justify-center p-1.5 rounded-lg text-brand-400 hover:bg-brand-800 hover:text-white transition-colors
                    ${isCollapsed ? 'w-full' : 'self-end'}
                `}
                            title={isCollapsed ? "Expandir menú" : "Contraer menú"}
                        >
                            {isCollapsed ? (
                                <ChevronRightIcon className="w-4 h-4" />
                            ) : (
                                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
                                    <span>Contraer</span>
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </div>
                            )}
                        </button>

                        {/* Copyright Text */}
                        {!isCollapsed && (
                            <div className="bg-brand-950/50 rounded-lg p-2 px-3 text-xs text-brand-400 animate-fade-in whitespace-nowrap overflow-hidden flex justify-between items-center">
                                <span>LD' Hoteles © {new Date().getFullYear()}</span>
                                <span className="opacity-70 font-mono text-[10px] bg-brand-900/30 border border-brand-800/40 px-1.5 py-0.5 rounded text-brand-300">
                                    {appVersion}
                                </span>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Mobile Header & Menu Overlay (Sin cambios mayores, solo diseño responsivo) */}
                <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-brand-900/60 backdrop-blur-xl border-b border-brand-800 z-30 flex items-center justify-between px-4 shadow-md">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-brand-400" />
                        <span className="font-bold text-lg">LD' Analytics</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 text-brand-300 hover:text-white focus:outline-none"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            {isSidebarOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div className="md:hidden fixed inset-0 z-20 bg-brand-950/75 backdrop-blur-xl pt-16 animate-fade-in">
                        <nav className="p-4 space-y-2">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentView === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setCurrentView(item.id as View);
                                            setIsSidebarOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-brand-800 text-white border border-brand-700'
                                            : 'text-brand-300 hover:bg-brand-800/50'
                                            }`}
                                    >
                                        <Icon className={`w-6 h-6 ${isActive ? 'text-brand-400' : 'text-brand-500'}`} />
                                        <span className="font-medium text-lg">{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                        <div className="absolute bottom-8 left-0 w-full text-center text-brand-500 text-sm">
                            LD' Hoteles © {new Date().getFullYear()}
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 relative overflow-y-auto pt-16 md:pt-0 scrollbar-thin scrollbar-thumb-brand-800 scrollbar-track-brand-950">
                    <div className="min-h-full flex flex-col">
                        <div className="flex-1">
                            {renderContent()}
                        </div>
                        <footer className="text-center py-6 text-brand-400 text-sm flex flex-col items-center gap-1 mt-auto bg-brand-950/50">
                             <p>&copy; {new Date().getFullYear()} Auditoria de Ingresos, LD' Hoteles. Todos los derechos reservados.</p>
                             <p className="text-xs opacity-60 font-mono">{appVersion}</p>
                         </footer>
                    </div>
                </main>
            </div>

            {/* Modal de Cierre de Sesión */}
            <CustomModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={signOut}
                title="Cerrar Sesión"
                message="¿Estás seguro de que deseas salir? Perderás el acceso al panel hasta que vuelvas a iniciar sesión."
                confirmLabel="Sí, Salir"
                cancelLabel="Cancelar"
            />
        </div>
    </div>
    );
}

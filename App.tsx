

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
import { DatabaseIcon } from './components/icons/DatabaseIcon';
import { DatabaseMetricsPage } from './DatabaseMetricsPage';
import pkg from './package.json';
import { HotelProvider } from './contexts/HotelContext';
import { AutoUpdateBanner } from './components/AutoUpdateBanner';
import { useEffect } from 'react';


type View = 'audit' | 'tax-audit' | 'transactions' | 'reports' | 'metrics';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { CustomModal } from './components/CustomModal';

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

function AppContent() {
    const { session, loading, signOut } = useAuth();
    const [currentView, setCurrentView] = useState<View>('audit');
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
        { id: 'audit', label: 'Auditoría General', icon: HomeIcon },
        { id: 'tax-audit', label: 'Auditoría de Tasas', icon: ClipboardDocumentCheckIcon },
        { id: 'transactions', label: 'Transacciones', icon: BanknotesIcon },
        { id: 'reports', label: 'Reportes Históricos', icon: ChartBarIcon },
        { id: 'metrics', label: 'Estado de la BD', icon: DatabaseIcon },
    ];

    const renderContent = () => {
        switch (currentView) {
            case 'audit':
                return <AuditPage />;
            case 'tax-audit':
                return <TaxAuditPage />;
            case 'transactions':
                return <TransactionsPage />;
            case 'reports':
                return <ReportsPage />;
            case 'metrics':
                return <DatabaseMetricsPage />;
            default:
                return <AuditPage />;
        }
    };

    const appVersion = `v${pkg.version}`;

    return (
        <HotelProvider>
            <div className="flex flex-col h-screen bg-brand-950 text-brand-50 font-sans overflow-hidden">
                
                {/* Banner de Actualización Automática */}
                <AutoUpdateBanner 
                    status={updateStatus}
                    percent={downloadPercent}
                    onRestart={handleRestart}
                    onClose={() => setUpdateStatus('none')}
                />

                <div className="flex flex-1 overflow-hidden">

                {/* Sidebar Desktop - Más compacto */}
                <aside
                    className={`hidden md:flex flex-col bg-brand-900 border-r border-brand-800 transition-all duration-300 ease-in-out z-20 ${isCollapsed ? 'w-16' : 'w-56'
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
                            <div className="bg-brand-950/50 rounded-lg p-2 text-[10px] text-brand-400 text-center animate-fade-in whitespace-nowrap overflow-hidden">
                                LD' Hoteles © {new Date().getFullYear()}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Mobile Header & Menu Overlay (Sin cambios mayores, solo diseño responsivo) */}
                <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-brand-900 border-b border-brand-800 z-30 flex items-center justify-between px-4 shadow-md">
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
                    <div className="md:hidden fixed inset-0 z-20 bg-brand-950/95 backdrop-blur-md pt-16 animate-fade-in">
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
        </HotelProvider>
    );
}

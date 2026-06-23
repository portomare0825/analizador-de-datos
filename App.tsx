

import React, { useState } from 'react';
import { AuditPage } from './AuditPage';
import { ReportsPage } from './ReportsPage';
import { TaxAuditPage } from './TaxAuditPage';
import { TransactionsPage } from './TransactionsPage';
import { HomeIcon } from './components/icons/HomeIcon';
import { ChartBarIcon } from './components/icons/ChartBarIcon';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from './components/icons/ChevronRightIcon';
import { ClipboardDocumentCheckIcon } from './components/icons/ClipboardDocumentCheckIcon';
import { BanknotesIcon } from './components/icons/BanknotesIcon';
import { DatabaseMetricsPage } from './DatabaseMetricsPage';
import { DashboardPage } from './DashboardPage';
import { CxCPagosPage } from './CxCPagosPage';
import { LayoutDashboard, Database as DatabaseIcon, CreditCard, Users as UsersIcon, Shield, ChevronDown, ChevronRight, UserPlus } from 'lucide-react';
import pkg from './package.json';
import { HotelProvider } from './contexts/HotelContext';
import { AutoUpdateBanner } from './components/AutoUpdateBanner';
import { useEffect } from 'react';
import { useHotel } from './contexts/HotelContext';


type View = 'dashboard' | 'audit' | 'tax-audit' | 'transactions' | 'reports' | 'metrics' | 'cxc' | 'profile' | 'users' | 'manage-users';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { ProfilePage } from './ProfilePage';
import { UserAdminPage } from './UserAdminPage';
import { ManageUsersPage } from './ManageUsersPage';
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
    const { session, loading, signOut, isRecovering, user, profile } = useAuth();
    const { hotel, setHotel } = useHotel();
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        if (currentView === 'users' || currentView === 'manage-users') {
            setIsAdminMenuOpen(true);
        }
    }, [currentView]);
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

    if (!session || isRecovering) {
        return <LoginPage />;
    }

    const baseMenuItems = [
        { id: 'dashboard', label: 'Panel de Resumen', icon: LayoutDashboard },
        { id: 'audit', label: 'Auditoría General', icon: HomeIcon },
        { id: 'tax-audit', label: 'Auditoría de Tasas', icon: ClipboardDocumentCheckIcon },
        { id: 'transactions', label: 'Transacciones', icon: BanknotesIcon },
        { id: 'cxc', label: 'Pagos CxC', icon: CreditCard },
        { id: 'reports', label: 'Reportes Históricos', icon: ChartBarIcon },
    ];

    const menuItems = profile?.role === 'admin'
        ? [...baseMenuItems, { id: 'metrics', label: 'Estado de la BD', icon: DatabaseIcon }]
        : baseMenuItems;

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
            case 'profile':
                return <ProfilePage />;
            case 'users':
                return <UserAdminPage />;
            case 'manage-users':
                return <ManageUsersPage />;
            default:
                return <DashboardPage />;
        }
    };

    const appVersion = `v${pkg.version}`;

    return (
        <div className="flex flex-col h-screen print:h-auto bg-brand-950 text-brand-50 font-sans overflow-hidden print:overflow-visible relative print:bg-white">
            {/* Imagen de fondo contable con degradado (idéntico al del Login) */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-75 mix-blend-overlay pointer-events-none z-0 print:hidden"
                style={{ backgroundImage: "url('login-bg.png')" }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-transparent to-brand-950 pointer-events-none z-0 print:hidden"></div>

            {/* Círculos de fondo decorativos */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none z-0 print:hidden"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0 print:hidden"></div>

            <div className="flex flex-col h-full print:h-auto w-full relative z-10 overflow-hidden print:overflow-visible">
                {/* Banner de Actualización Automática */}
                <AutoUpdateBanner 
                    status={updateStatus}
                    percent={downloadPercent}
                    onRestart={handleRestart}
                    onClose={() => setUpdateStatus('none')}
                />

                <div className="flex flex-1 overflow-hidden print:overflow-visible print:block">

                {/* Sidebar Desktop - Más compacto y translúcido */}
                <aside
                    className={`hidden md:flex print:hidden flex-col bg-brand-900/60 backdrop-blur-xl border-r border-brand-800 transition-all duration-300 ease-in-out z-20 ${isCollapsed ? 'w-16' : 'w-56'
                        }`}
                >
                    {/* Header Logo */}
                    <div className={`h-16 flex items-center border-b border-brand-800 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-2'}`}>
                        <div className="bg-brand-800 p-1 rounded-lg shrink-0 transition-transform duration-300 hover:scale-105">
                            <img src="icons/icon.png" alt="Logo" className="w-7 h-7 object-contain" />
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

                        {/* Menú de Administración exclusivo para Admins */}
                        {profile?.role === 'admin' && (
                            <div className="mt-4 border-t border-brand-800/40 pt-3 space-y-1">
                                <button
                                    onClick={() => {
                                        if (isCollapsed) {
                                            setIsCollapsed(false);
                                            setIsAdminMenuOpen(true);
                                        } else {
                                            setIsAdminMenuOpen(!isAdminMenuOpen);
                                        }
                                    }}
                                    className={`w-full flex items-center transition-all duration-200 group relative rounded-lg py-2
                                        ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'}
                                        ${(currentView === 'users' || currentView === 'manage-users') ? 'text-white bg-brand-800/30' : 'text-brand-300 hover:bg-brand-800/30 hover:text-brand-100'}
                                    `}
                                    title={isCollapsed ? 'Administración' : ''}
                                >
                                    <Shield className={`w-5 h-5 shrink-0 transition-colors duration-200 ${(currentView === 'users' || currentView === 'manage-users') ? 'text-brand-400' : 'text-brand-500'}`} />
                                    
                                    {!isCollapsed && (
                                        <>
                                            <span className="font-bold text-xs tracking-wider uppercase whitespace-nowrap overflow-hidden animate-fade-in text-left flex-1">
                                                Administración
                                            </span>
                                            {isAdminMenuOpen ? (
                                                <ChevronDown className="w-4 h-4 text-brand-500" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-brand-500" />
                                            )}
                                        </>
                                    )}

                                    {isCollapsed && (currentView === 'users' || currentView === 'manage-users') && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-brand-400 rounded-r-full" />
                                    )}
                                </button>

                                {(!isCollapsed && isAdminMenuOpen) && (
                                    <div className="pl-6 space-y-1 animate-fade-in">
                                        <button
                                            onClick={() => setCurrentView('users')}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-all duration-200
                                                ${currentView === 'users'
                                                    ? 'bg-brand-800 text-white shadow shadow-brand-900/50 font-bold'
                                                    : 'text-brand-300 hover:bg-brand-800/30 hover:text-brand-100'
                                                }`}
                                        >
                                            <UserPlus className="w-3.5 h-3.5 shrink-0 text-brand-400" />
                                            <span>Invitar Usuario</span>
                                        </button>
                                        <button
                                            onClick={() => setCurrentView('manage-users')}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-all duration-200
                                                ${currentView === 'manage-users'
                                                    ? 'bg-brand-800 text-white shadow shadow-brand-900/50 font-bold'
                                                    : 'text-brand-300 hover:bg-brand-800/30 hover:text-brand-100'
                                                }`}
                                        >
                                            <UsersIcon className="w-3.5 h-3.5 shrink-0 text-brand-400" />
                                            <span>Lista de Usuarios</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>

                    {/* Footer & Toggle - Más compacto */}
                    <div className="p-2 border-t border-brand-800 flex flex-col gap-2">
                        {/* Sección de Perfil de Usuario Logueado */}
                        <div 
                            onClick={() => setCurrentView('profile')}
                            className={`flex items-center gap-3 p-2 rounded-xl bg-brand-950/40 border border-brand-800/40 hover:bg-brand-800/40 transition-all cursor-pointer ${
                                currentView === 'profile' ? 'border-brand-500/50 bg-brand-800/30' : ''
                            } ${isCollapsed ? 'justify-center' : ''}`}
                            title="Ver mi perfil"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-emerald-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
                                {profile?.display_name 
                                    ? profile.display_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                    : user?.email?.substring(0, 2).toUpperCase() || 'US'}
                            </div>
                            {!isCollapsed && (
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">
                                        {profile?.display_name || user?.email?.split('@')[0]}
                                    </p>
                                    <p className="text-[10px] text-brand-400 truncate uppercase tracking-wider font-semibold">
                                        {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'user' ? 'Auditor' : 'Lector'}
                                    </p>
                                </div>
                            )}
                        </div>

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
                                <span className="opacity-70 font-mono text-xs bg-brand-900/30 border border-brand-800/40 px-1.5 py-0.5 rounded text-brand-300">
                                    {appVersion}
                                </span>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Mobile Header & Menu Overlay (Sin cambios mayores, solo diseño responsivo) */}
                <div className="md:hidden print:hidden fixed top-0 left-0 right-0 h-16 bg-brand-900/60 backdrop-blur-xl border-b border-brand-800 z-30 flex items-center justify-between px-4 shadow-md">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand-800 p-1 rounded-lg shrink-0">
                            <img src="icons/icon.png" alt="Logo" className="w-7 h-7 object-contain" />
                        </div>
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
                    <div className="md:hidden fixed inset-0 z-20 bg-brand-950/75 backdrop-blur-xl pt-16 animate-fade-in flex flex-col justify-between">
                        <nav className="p-4 space-y-2 overflow-y-auto">
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
                                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-brand-800 text-white border border-brand-700'
                                            : 'text-brand-300 hover:bg-brand-800/50'
                                            }`}
                                    >
                                        <Icon className={`w-6 h-6 ${isActive ? 'text-brand-400' : 'text-brand-500'}`} />
                                        <span className="font-medium text-base">{item.label}</span>
                                    </button>
                                );
                            })}

                            {/* Sección Móvil de Administración */}
                            {profile?.role === 'admin' && (
                                <div className="mt-4 border-t border-brand-800/40 pt-3 space-y-1">
                                    <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-500">
                                        Administración
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCurrentView('users');
                                            setIsSidebarOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                                            currentView === 'users'
                                                ? 'bg-brand-800 text-white border border-brand-700'
                                                : 'text-brand-300 hover:bg-brand-800/50'
                                        }`}
                                    >
                                        <UserPlus className="w-5 h-5 text-brand-400" />
                                        <span className="font-medium text-base">Invitar Usuario</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentView('manage-users');
                                            setIsSidebarOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                                            currentView === 'manage-users'
                                                ? 'bg-brand-800 text-white border border-brand-700'
                                                : 'text-brand-300 hover:bg-brand-800/50'
                                        }`}
                                    >
                                        <UsersIcon className="w-5 h-5 text-brand-400" />
                                        <span className="font-medium text-base">Lista de Usuarios</span>
                                    </button>
                                </div>
                            )}
                        </nav>
                        <div className="pb-8 w-full text-center text-brand-500 text-sm">
                            LD' Hoteles © {new Date().getFullYear()}
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 relative overflow-y-auto print:overflow-visible pt-16 md:pt-0 scrollbar-thin scrollbar-thumb-brand-800 scrollbar-track-brand-950">
                    <div className="min-h-full print:h-auto print:block flex flex-col">
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

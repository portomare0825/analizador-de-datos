import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './supabaseClient';

export function ProfilePage() {
    const { user, profile, signOut } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados para el cambio de contraseña
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.display_name || '');
            setPhone(profile.phone || '');
            setRole(profile.role || 'user');
        }
    }, [profile]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Actualizar tabla profiles
            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    display_name: displayName,
                    phone: phone,
                    updated_at: new Date().toISOString()
                });

            if (updateError) throw updateError;

            setSuccessMessage('Perfil actualizado correctamente. Recarga la aplicación si no se reflejan los cambios.');
            
            // Recargar página después de un momento
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err: any) {
            setError(err.message || 'Error al actualizar el perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(null);

        if (newPassword !== confirmNewPassword) {
            setPasswordError('Las contraseñas nuevas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setPasswordLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setPasswordSuccess('Contraseña actualizada con éxito. Por seguridad, se cerrará la sesión.');
            
            setTimeout(async () => {
                await signOut();
            }, 2500);

        } catch (err: any) {
            setPasswordError(err.message || 'Error al actualizar la contraseña');
        } finally {
            setPasswordLoading(false);
        }
    };

    const userInitials = displayName 
        ? displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : user?.email?.substring(0, 2).toUpperCase() || 'US';

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-800/60 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Mi Perfil</h1>
                    <p className="text-brand-400 text-sm mt-1">Gestiona tu información personal y la seguridad de tu cuenta.</p>
                </div>
                <div className="flex items-center gap-3 bg-brand-900/40 border border-brand-800/40 p-2.5 px-4 rounded-2xl backdrop-blur-md">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-500 to-emerald-500 flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0">
                        {userInitials}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white">{displayName || user?.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-brand-400 uppercase tracking-widest font-semibold mt-0.5">
                            {role === 'admin' ? 'Administrador' : role === 'user' ? 'Auditor' : 'Lector'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Formulario Perfil */}
                <div className="bg-brand-900/20 backdrop-blur-xl border border-brand-800/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-brand-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                            Información Personal
                        </h2>
                        
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1">
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    className="w-full bg-brand-950/30 border border-brand-800 text-brand-500 rounded-xl px-4 py-2.5 focus:outline-none cursor-not-allowed text-sm font-medium"
                                    disabled
                                    title="El correo no se puede cambiar"
                                />
                            </div>

                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="displayName">
                                    Nombre Completo
                                </label>
                                <input
                                    id="displayName"
                                    type="text"
                                    placeholder="Nombre Apellido"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="phone">
                                    Teléfono
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    placeholder="+58 412..."
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-medium">
                                    {error}
                                </div>
                            )}

                            {successMessage && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-xs font-medium">
                                    {successMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 bg-gradient-to-r from-brand-500 to-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-brand-500/15 hover:shadow-brand-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    'Guardar Cambios'
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Formulario Contraseña */}
                <div className="bg-brand-900/20 backdrop-blur-xl border border-brand-800/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-brand-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            Seguridad de la Cuenta
                        </h2>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="newPassword">
                                    Nueva Contraseña
                                </label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="confirmNewPassword">
                                    Confirmar Nueva Contraseña
                                </label>
                                <input
                                    id="confirmNewPassword"
                                    type="password"
                                    placeholder="Repite la contraseña"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                                    required
                                />
                            </div>

                            {passwordError && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-medium">
                                    {passwordError}
                                </div>
                            )}

                            {passwordSuccess && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-xs font-medium animate-fade-in">
                                    {passwordSuccess}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={passwordLoading}
                                className="w-full mt-4 bg-gradient-to-r from-brand-500 to-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-brand-500/15 hover:shadow-brand-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {passwordLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Actualizando...</span>
                                    </>
                                ) : (
                                    'Actualizar Contraseña'
                                )}
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
}

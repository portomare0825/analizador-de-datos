import React, { useState } from 'react';
import { supabaseAdmin } from './supabaseClient';
import { useAuth } from './contexts/AuthContext';

export function UserAdminPage() {
    const { profile } = useAuth();
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [selectedRole, setSelectedRole] = useState<'viewer' | 'user' | 'admin' | 'recepcionista'>('viewer');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Verificar si el usuario actual es admin
    const isAdmin = profile?.role === 'admin';

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        if (!supabaseAdmin) {
            setError('Error: El cliente administrativo no está configurado. Verifica la clave VITE_SUPABASE_SERVICE_ROLE_KEY.');
            setLoading(false);
            return;
        }

        try {
            // 1. Invitar al usuario por correo usando Supabase Admin API
            const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                redirectTo: `${window.location.origin}/`,
                data: {
                    display_name: displayName
                }
            });

            if (inviteError) throw inviteError;
            if (!data?.user) throw new Error('No se pudo generar el usuario invitado');

            // 2. Crear o actualizar el perfil público con el rol seleccionado
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    email: email,
                    display_name: displayName,
                    role: selectedRole,
                    updated_at: new Date().toISOString()
                });

            if (profileError) {
                console.warn('Error al registrar el perfil, pero la invitación fue enviada:', profileError);
            }

            setSuccessMessage(`¡Invitación enviada con éxito a ${email}! El usuario recibirá un correo para definir su contraseña.`);
            setEmail('');
            setDisplayName('');
            setSelectedRole('viewer');

        } catch (err: any) {
            setError(err.message || 'Error al enviar la invitación');
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-6 max-w-md mx-auto text-center space-y-4 animate-fade-in">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm font-semibold">
                    Acceso Denegado. Esta sección es exclusiva para administradores.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="border-b border-brand-800/60 pb-5">
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-brand-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                    </svg>
                    Administración de Usuarios
                </h1>
                <p className="text-brand-400 text-sm mt-1">Invita nuevos usuarios a unirse a la plataforma y asígnales un rol de acceso.</p>
            </div>

            {/* Form Card */}
            <div className="bg-brand-900/20 backdrop-blur-xl border border-brand-800/60 rounded-3xl p-6 shadow-xl max-w-lg mx-auto">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-brand-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.25a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.25A2.25 2.25 0 0 0 2 6.75m19.5 0-9 6.75-9-6.75" />
                    </svg>
                    Enviar Invitación
                </h2>

                <form onSubmit={handleInviteUser} className="space-y-4">
                    <div>
                        <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="inviteName">
                            Nombre Completo del Invitado
                        </label>
                        <input
                            id="inviteName"
                            type="text"
                            placeholder="Nombre Apellido"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="inviteEmail">
                            Correo Electrónico
                        </label>
                        <input
                            id="inviteEmail"
                            type="email"
                            placeholder="ejemplo@ldhoteles.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="inviteRole">
                            Rol del Usuario
                        </label>
                        <select
                            id="inviteRole"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as any)}
                            className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all text-sm font-medium"
                        >
                            <option value="viewer" className="bg-brand-950 text-white">Auditor (Vista de Lectura / Viewer)</option>
                            <option value="user" className="bg-brand-950 text-white">Auditor (Rol Completo / Auditor)</option>
                            <option value="recepcionista" className="bg-brand-950 text-white">Recepcionista</option>
                            <option value="admin" className="bg-brand-950 text-white">Administrador (Admin)</option>
                        </select>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-medium">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-xs font-medium animate-fade-in">
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
                                <span>Enviando Invitación...</span>
                            </>
                        ) : (
                            'Enviar Invitación de Correo'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

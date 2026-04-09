import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { SparklesIcon } from './components/icons/SparklesIcon';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-950 p-6 relative overflow-hidden">
            {/* Círculos de fondo decorativos */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md animate-fade-in-up">
                {/* Logo Container */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-brand-900/50 p-4 rounded-3xl border border-brand-800 backdrop-blur-xl mb-4 shadow-2xl shadow-brand-500/10">
                        <SparklesIcon className="w-12 h-12 text-brand-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">AUDITORI <span className="text-brand-400">LD</span></h1>
                    <p className="text-brand-400 font-medium text-sm mt-1 uppercase tracking-[0.2em]">Analytics & Intelligence</p>
                </div>

                {/* Form Card */}
                <div className="bg-brand-900/40 backdrop-blur-2xl border border-brand-800 rounded-[2.5rem] p-8 shadow-2xl relative">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-brand-300 text-xs font-bold uppercase tracking-widest mb-2 ml-1" htmlFor="email">
                                Correo Electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="admin@auditorild.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-brand-300 text-xs font-bold uppercase tracking-widest mb-2 ml-1" htmlFor="password">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 font-medium"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-brand-500 to-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Iniciando...</span>
                                </>
                            ) : (
                                'Ingresar al Panel'
                            )}
                        </button>
                    </form>

                    {/* Footer del login */}
                    <div className="mt-8 pt-6 border-t border-brand-800 text-center">
                        <p className="text-brand-500 text-xs">
                            Acceso restringido solo a personal autorizado.<br />
                            &copy; {new Date().getFullYear()} LD' Hoteles.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

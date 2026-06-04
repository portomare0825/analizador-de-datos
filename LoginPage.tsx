import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './contexts/AuthContext';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [mode, setMode] = useState<'login' | 'forgot-password' | 'verify-otp' | 'reset-password'>('login');
    const [otpCode, setOtpCode] = useState('');

    const { isRecovering, setIsRecovering, signOut } = useAuth();

    useEffect(() => {
        if (isRecovering) {
            setMode('reset-password');
        }
    }, [isRecovering]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

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


    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            // Ya no usamos redirectTo porque usaremos el código OTP.
            const { error } = await supabase.auth.resetPasswordForEmail(email);

            if (error) throw error;
            setMessage('Se ha enviado un código de seguridad a tu correo electrónico.');
            setMode('verify-otp');
        } catch (err: any) {
            setError(err.message || 'Error al enviar el correo de recuperación');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otpCode,
                type: 'recovery'
            });

            if (error) throw error;
            setMessage('Código verificado correctamente. Ahora puedes cambiar tu contraseña.');
            setMode('reset-password');
        } catch (err: any) {
            setError(err.message || 'El código es incorrecto o ha expirado.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;
            setMessage('Tu contraseña ha sido actualizada con éxito. Redirigiendo al inicio de sesión...');

            setTimeout(async () => {
                setIsRecovering(false);
                await signOut();
                switchMode('login');
                setMessage('Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.');
            }, 2500);
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (newMode: 'login' | 'forgot-password') => {
        setMode(newMode);
        setError(null);
        setMessage(null);
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-950 p-4 relative overflow-hidden">
            {/* Imagen de fondo contable con degradado */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-75 mix-blend-overlay"
                style={{ backgroundImage: "url('login-bg.png')" }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-transparent to-brand-950 pointer-events-none"></div>

            {/* Círculos de fondo decorativos */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-[24rem] animate-fade-in-up">
                {/* Logo Container */}
                <div className="flex flex-col items-center mb-5">
                    <div className="mb-3 shadow-2xl shadow-brand-500/10">
                        <img src="logo.png" alt="Logo Auditoria LD" className="w-16 h-16 object-contain rounded-2xl border border-brand-800" />
                    </div>
                    <h1 className="text-xl font-mono font-bold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">AUDITORIA LD HOTELES</h1>
                </div>

                {/* Form Card */}
                <div className="bg-brand-900/25 backdrop-blur-2xl border border-brand-800 rounded-3xl p-6 shadow-2xl relative">
                    
                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="email">
                                    Correo Electrónico
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="admin@auditorild.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5 px-1">
                                    <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest" htmlFor="password">
                                        Contraseña
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => switchMode('forgot-password')}
                                        className="text-brand-400 hover:text-brand-300 text-[10px] font-semibold tracking-wide transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-medium animate-shake">
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
                    )}

                    {mode === 'forgot-password' && (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div className="text-center pb-1">
                                <h2 className="text-white font-bold text-base">Recuperar Contraseña</h2>
                                <p className="text-brand-400 text-xs mt-1">Te enviaremos un enlace para restablecer tu contraseña.</p>
                            </div>

                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="email">
                                    Correo Electrónico
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="ejemplo@auditorild.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-medium animate-shake">
                                    {error}
                                </div>
                            )}

                            {message && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-xs font-medium animate-fade-in">
                                    {message}
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
                                        <span>Enviando...</span>
                                    </>
                                ) : (
                                    'Restablecer Contraseña'
                                )}
                            </button>

                            {/* Back to Login */}
                            <div className="text-center pt-1">
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className="text-brand-400 hover:text-brand-300 text-xs font-bold underline transition-colors"
                                >
                                    Volver al Inicio de Sesión
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === 'verify-otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="text-center pb-1">
                                <h2 className="text-white font-bold text-base">Verificar Código</h2>
                                <p className="text-brand-400 text-xs mt-1">Ingresa el código de 6 dígitos enviado a {email}</p>
                            </div>

                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="otpCode">
                                    Código de Seguridad
                                </label>
                                <input
                                    id="otpCode"
                                    type="text"
                                    placeholder="123456"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium text-center tracking-[0.5em]"
                                    required
                                    maxLength={6}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-medium animate-shake">
                                    {error}
                                </div>
                            )}

                            {message && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-xs font-medium animate-fade-in">
                                    {message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || otpCode.length < 6}
                                className="w-full bg-gradient-to-r from-brand-500 to-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Verificando...</span>
                                    </>
                                ) : (
                                    'Verificar Código'
                                )}
                            </button>

                            <div className="text-center pt-1">
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className="text-brand-400 hover:text-brand-300 text-xs font-bold underline transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === 'reset-password' && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="text-center pb-1">
                                <h2 className="text-white font-bold text-base">Nueva Contraseña</h2>
                                <p className="text-brand-400 text-xs mt-1">Escribe tu nueva contraseña de acceso.</p>
                            </div>

                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="reset-password">
                                    Nueva Contraseña
                                </label>
                                <input
                                    id="reset-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="confirm-reset-password">
                                    Confirmar Nueva Contraseña
                                </label>
                                <input
                                    id="confirm-reset-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm font-medium"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-medium animate-shake">
                                    {error}
                                </div>
                            )}

                            {message && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-xs font-medium animate-fade-in">
                                    {message}
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
                                        <span>Actualizando...</span>
                                    </>
                                ) : (
                                    'Establecer Contraseña'
                                )}
                            </button>

                            {/* Back to Login */}
                            <div className="text-center pt-1">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setIsRecovering(false);
                                        await signOut();
                                        switchMode('login');
                                    }}
                                    className="text-brand-400 hover:text-brand-300 text-xs font-bold underline transition-colors"
                                >
                                    Cancelar y Volver
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Footer del login */}
                    <div className="mt-6 pt-4 border-t border-brand-800 text-center">
                        <p className="text-brand-500 text-[10px]">
                            Acceso restringido solo a personal autorizado.<br />
                            &copy; {new Date().getFullYear()} LD' Hoteles.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

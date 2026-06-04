import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from './supabaseClient';
import { useAuth } from './contexts/AuthContext';
import { Shield, Search, UserCheck, Trash2, Edit3, X, Save } from 'lucide-react';

interface Profile {
    id: string;
    email: string;
    display_name: string | null;
    phone: string | null;
    role: 'viewer' | 'user' | 'admin' | 'recepcionista';
    updated_at: string | null;
}

export function ManageUsersPage() {
    const { profile: currentProfile } = useAuth();
    const [users, setUsers] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [dbRoles, setDbRoles] = useState<string[]>([]);

    // Estado para la edición
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editRole, setEditRole] = useState<'viewer' | 'user' | 'admin' | 'recepcionista'>('viewer');
    const [saving, setSaving] = useState(false);

    // Estado para la eliminación
    const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
    const [deleting, setDeleting] = useState(false);

    const isAdmin = currentProfile?.role === 'admin';

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    useEffect(() => {
        const fetchSchema = async () => {
            try {
                const res = await fetch(import.meta.env.VITE_SUPABASE_URL, {
                    headers: {
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                    }
                });
                const schema = await res.json();
                console.log('PostgREST Schema:', schema);
                
                const roleEnum = schema?.definitions?.profiles?.properties?.role?.enum;
                if (roleEnum && Array.isArray(roleEnum)) {
                    setDbRoles(roleEnum);
                } else {
                    const definitions = schema?.definitions || {};
                    for (const key of Object.keys(definitions)) {
                        const enumVal = definitions[key]?.properties?.role?.enum;
                        if (enumVal && Array.isArray(enumVal)) {
                            setDbRoles(enumVal);
                            break;
                        }
                    }
                }
            } catch (e) {
                console.error('Error fetching schema:', e);
            }
        };
        fetchSchema();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        if (!supabaseAdmin) {
            setError('Error: El cliente administrativo no está disponible.');
            setLoading(false);
            return;
        }

        try {
            const { data, error: fetchError } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .order('updated_at', { ascending: false });

            if (fetchError) throw fetchError;
            setUsers(data || []);
        } catch (err: any) {
            setError(err.message || 'Error al cargar la lista de usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleStartEdit = (user: Profile) => {
        setEditingUser(user);
        setEditName(user.display_name || '');
        setEditEmail(user.email || '');
        setEditPhone(user.phone || '');
        setEditRole(user.role || 'viewer');
        setError(null);
        setSuccessMessage(null);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser || !supabaseAdmin) return;

        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // 1. Si el email cambió, actualizar en Supabase Auth
            if (editEmail.trim().toLowerCase() !== editingUser.email.trim().toLowerCase()) {
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(editingUser.id, {
                    email: editEmail.trim(),
                    email_confirm: true // Confirmar automáticamente el email
                });
                if (authError) throw authError;
            }

            // 2. Actualizar en la tabla de profiles
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({
                    display_name: editName.trim(),
                    email: editEmail.trim(),
                    phone: editPhone.trim() || null,
                    role: editRole,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingUser.id);

            if (profileError) throw profileError;

            setSuccessMessage(`Usuario ${editName || editEmail} actualizado correctamente.`);
            setEditingUser(null);
            fetchUsers();
        } catch (err: any) {
            setError(err.message || 'Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!deletingUser || !supabaseAdmin) return;

        setDeleting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Evitar que el administrador actual se elimine a sí mismo
            if (deletingUser.id === currentProfile?.id) {
                throw new Error('No puedes eliminar tu propia cuenta de administrador.');
            }

            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(deletingUser.id);
            if (deleteError) throw deleteError;

            setSuccessMessage(`Usuario eliminado correctamente.`);
            setDeletingUser(null);
            fetchUsers();
        } catch (err: any) {
            setError(err.message || 'Error al eliminar el usuario');
        } finally {
            setDeleting(false);
        }
    };

    // Filtrar usuarios por búsqueda
    const filteredUsers = users.filter(user => {
        const term = searchQuery.toLowerCase();
        const name = (user.display_name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(term) || email.includes(term);
    });

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
        <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in relative z-10">
            {/* Header */}
            <div className="border-b border-brand-800/60 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <Shield className="w-6 h-6 text-brand-400" />
                        Lista de Usuarios
                    </h1>
                    <p className="text-brand-400 text-sm mt-1">
                        Visualiza, busca, edita roles, correos, nombres o elimina cuentas en la plataforma.
                    </p>
                    {dbRoles.length > 0 && (
                        <div className="mt-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-xl w-fit">
                            Roles válidos detectados en la BD: <strong>{dbRoles.join(', ')}</strong>
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative max-w-xs w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-brand-500" />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o correo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-brand-400 transition-all placeholder:text-brand-700 text-sm"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold animate-fade-in">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-semibold animate-fade-in">
                    {successMessage}
                </div>
            )}

            {/* Users Table */}
            <div className="bg-brand-900/20 backdrop-blur-xl border border-brand-800/60 rounded-3xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span className="text-brand-400 text-sm">Cargando usuarios...</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-brand-400 text-sm">
                        {searchQuery ? 'No se encontraron usuarios que coincidan con la búsqueda.' : 'No hay usuarios registrados.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-brand-800/50 text-[10px] font-bold uppercase tracking-widest text-brand-300 bg-brand-950/40">
                                    <th className="py-4 px-5">Nombre Completo</th>
                                    <th className="py-4 px-5">Correo Electrónico</th>
                                    <th className="py-4 px-5">Teléfono</th>
                                    <th className="py-4 px-5">Rol</th>
                                    <th className="py-4 px-5">Última Actualización</th>
                                    <th className="py-4 px-5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-800/30 text-sm text-brand-100">
                                {filteredUsers.map((user) => {
                                    // Determinar el color del badge del rol
                                    let roleBadgeClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                                    if (user.role === 'admin') {
                                        roleBadgeClass = 'bg-red-500/10 border-red-500/30 text-red-400';
                                    } else if (user.role === 'user') {
                                        roleBadgeClass = 'bg-blue-500/10 border-blue-500/30 text-blue-400';
                                    } else if (user.role === 'recepcionista') {
                                        roleBadgeClass = 'bg-purple-500/10 border-purple-500/30 text-purple-400';
                                    }

                                    return (
                                        <tr key={user.id} className="hover:bg-brand-800/10 transition-colors">
                                            <td className="py-3.5 px-5 font-medium text-white">
                                                {user.display_name || <span className="text-brand-600 italic">No especificado</span>}
                                            </td>
                                            <td className="py-3.5 px-5 font-mono text-xs">{user.email}</td>
                                            <td className="py-3.5 px-5 text-xs text-brand-300">
                                                {user.phone || <span className="text-brand-600 italic">-</span>}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass}`}>
                                                    {user.role === 'admin' ? 'Administrador' : user.role === 'user' ? 'Auditor' : user.role === 'recepcionista' ? 'Recepcionista' : 'Lector'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-xs text-brand-400">
                                                {user.updated_at ? new Date(user.updated_at).toLocaleString('es-ES', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : '-'}
                                            </td>
                                            <td className="py-3.5 px-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleStartEdit(user)}
                                                        className="p-1.5 rounded-lg text-brand-300 hover:bg-brand-800 hover:text-white transition-colors"
                                                        title="Editar Usuario"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingUser(user)}
                                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                                        title="Eliminar Usuario"
                                                        disabled={user.id === currentProfile?.id}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Edición de Usuario (Glassmorphism Modal) */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-brand-900/40 backdrop-blur-2xl border border-brand-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-fade-in-up">
                        <button
                            onClick={() => setEditingUser(null)}
                            className="absolute top-4 right-4 text-brand-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-brand-400" />
                            Editar Usuario
                        </h3>

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="editName">
                                    Nombre Completo
                                </label>
                                <input
                                    id="editName"
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all text-sm font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="editEmail">
                                    Correo Electrónico
                                </label>
                                <input
                                    id="editEmail"
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all text-sm font-medium font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="editPhone">
                                    Teléfono
                                </label>
                                <input
                                    id="editPhone"
                                    type="text"
                                    value={editPhone}
                                    placeholder="+58 ..."
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all text-sm font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-brand-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1" htmlFor="editRole">
                                    Rol en la Plataforma
                                </label>
                                <select
                                    id="editRole"
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value as any)}
                                    className="w-full bg-brand-950/50 border border-brand-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-400 transition-all text-sm font-medium"
                                >
                                    <option value="viewer" className="bg-brand-950 text-white">Auditor (Vista de Lectura / Viewer)</option>
                                    <option value="user" className="bg-brand-950 text-white">Auditor (Rol Completo / Auditor)</option>
                                    <option value="recepcionista" className="bg-brand-950 text-white">Recepcionista</option>
                                    <option value="admin" className="bg-brand-950 text-white">Administrador (Admin)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 bg-brand-950/60 border border-brand-800 hover:bg-brand-800/40 text-brand-300 py-3 rounded-xl transition-all font-semibold text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-gradient-to-r from-brand-500 to-emerald-600 hover:shadow-brand-500/20 text-white py-3 rounded-xl transition-all font-bold text-sm flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Guardar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {deletingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-brand-900/40 backdrop-blur-2xl border border-brand-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-fade-in-up">
                        <button
                            onClick={() => setDeletingUser(null)}
                            className="absolute top-4 right-4 text-brand-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center space-y-3 pt-2">
                            <div className="w-12 h-12 bg-red-500/10 border border-red-500/25 rounded-full flex items-center justify-center mx-auto text-red-500">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Eliminar Usuario</h3>
                            <p className="text-xs text-brand-400 leading-relaxed">
                                ¿Estás seguro de que deseas eliminar a <strong>{deletingUser.display_name || deletingUser.email}</strong>? Esta acción no se puede deshacer y revocará inmediatamente su acceso a la plataforma.
                            </p>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setDeletingUser(null)}
                                className="flex-1 bg-brand-950/60 border border-brand-800 hover:bg-brand-800/40 text-brand-300 py-3 rounded-xl transition-all font-semibold text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={deleting}
                                className="flex-1 bg-gradient-to-r from-red-500 to-red-700 hover:shadow-red-500/20 text-white py-3 rounded-xl transition-all font-bold text-sm flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    'Eliminar Cuenta'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

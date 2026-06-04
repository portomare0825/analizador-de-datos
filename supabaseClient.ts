import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL o Anon Key no encontradas en las variables de entorno.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export const supabaseAdmin = supabaseServiceKey 
    ? createClient(supabaseUrl || '', supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
      })
    : null;

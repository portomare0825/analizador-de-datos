import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mvgixuikuvlwbuuenlpq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xD8kkmUFdQbmz7zzkJyA6g_dweYhxIu';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12Z2l4dWlrdXZsd2J1dWVubHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk1Njc3NSwiZXhwIjoyMDc1NTMyNzc1fQ.FgxCaUDEIg8AJTV5gjbpEcM0i4nrSEB77K82-bEh9VA';

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


const { createClient } = require('@supabase/supabase-common');
const { syncCxCGuestNames } = require('./services/supabaseService');

// This won't work easily because of imports and environment variables in the TS file.
// I'll skip the automated sync check and just focus on the code correctness.

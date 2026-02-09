import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vunhyixxpeqdevoruaqe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_S3W1b_J1kvqrnpoRISlQZg_dB5w4XcK';

export const supabaseExternal = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

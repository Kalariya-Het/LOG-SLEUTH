import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your Supabase Project URL.
// You can find it in your Supabase project's dashboard under Settings > API.
const supabaseUrl = 'https://omdrfuooovgattayfpgm.supabase.co';
const supabaseAnonKey = 'sb_publishable_88PpGbOl17CqZVi0aHglSA_2x4yQ3H6';

if (supabaseUrl === 'https://omdrfuooovgattayfpgm.supabase.co') {
  // This message will appear in the browser console if the URL is not configured.
  console.error("Supabase URL is not configured. Please update it in 'services/supabaseClient.ts'");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

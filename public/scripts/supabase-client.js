import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = window.__SUPABASE_URL || '';
const supabaseAnonKey = window.__SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = () => Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = hasSupabaseConfig() ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function ensureUserProfile() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!existing) {
    const payload = {
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
      role: 'cliente_final',
      active: true,
    };
    await supabase.from('profiles').insert(payload);
    return payload;
  }
  return existing;
}

export async function getUserProfile() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data ?? null;
}

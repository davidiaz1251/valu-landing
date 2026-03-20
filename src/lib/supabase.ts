import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = () =>
  typeof supabaseUrl === 'string' &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 0;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'cliente_final' | 'profesional_reposteria' | 'admin';

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
};

export async function ensureUserProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    return payload as UserProfile;
  }

  return existing as UserProfile;
}

export async function getUserProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return (data as UserProfile) ?? null;
}

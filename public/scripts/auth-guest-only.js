import { hasSupabaseConfig, supabase, getUserProfile } from '/scripts/supabase-client.js';

async function redirectIfLoggedIn() {
  if (!hasSupabaseConfig() || !supabase) return;

  const { data, error } = await supabase.auth.getSession();
  if (error) return;

  const session = data?.session;
  if (!session?.user) return;

  const profile = await getUserProfile();
  const target = profile?.role === 'admin' ? '/admin/panel' : '/plantillas';

  if (window.location.pathname !== target) {
    window.location.replace(target);
  }
}

redirectIfLoggedIn();

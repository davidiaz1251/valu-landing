import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

async function redirectIfLoggedIn() {
  if (!hasSupabaseConfig() || !supabase) return;

  const { data, error } = await supabase.auth.getSession();
  if (error) return;

  const session = data?.session;
  if (!session?.user) return;

  if (window.location.pathname !== '/') {
    window.location.replace('/');
  }
}

redirectIfLoggedIn();

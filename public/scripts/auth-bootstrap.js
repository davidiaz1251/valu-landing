import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

async function bootstrapAuthFromHash() {
  if (!hasSupabaseConfig() || !supabase) return;
  const hash = window.location.hash || '';
  if (!hash.includes('access_token=')) return;

  try {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
    } else {
      await supabase.auth.getSession();
    }
  } catch (e) {
    console.error('Auth bootstrap failed', e);
  } finally {
    history.replaceState({}, document.title, window.location.pathname + window.location.search);
  }

  if (window.location.pathname !== '/plantillas') {
    window.location.replace('/plantillas');
  }
}

bootstrapAuthFromHash();

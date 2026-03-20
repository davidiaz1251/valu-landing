import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

async function bootstrapAuthFromHash() {
  if (!hasSupabaseConfig() || !supabase) return;

  // If OAuth returned tokens in URL hash (implicit flow), let Supabase parse/persist them.
  if (window.location.hash.includes('access_token=')) {
    try {
      await supabase.auth.getSession();
    } catch (e) {
      console.error('Auth bootstrap failed', e);
    }

    // Clean URL and send user to templates area.
    const target = '/plantillas';
    if (window.location.pathname !== target) {
      window.location.replace(target);
    } else {
      history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }
}

bootstrapAuthFromHash();

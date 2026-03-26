import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

const statusEl = document.getElementById('authCallbackStatus');

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

async function run() {
  try {
    if (!hasSupabaseConfig() || !supabase) {
      setStatus('Falta configuración de acceso.');
      return;
    }

    const url = new URL(window.location.href);
    const next = url.searchParams.get('next') || '/plantillas';

    if (url.searchParams.get('code')) {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) throw error;
    } else if (window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token) throw new Error('Tokens incompletos en callback hash');
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      history.replaceState({}, document.title, window.location.pathname + window.location.search);
    } else {
      await supabase.auth.getSession();
    }

    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user) throw new Error('No hay sesión activa tras callback');

    window.location.replace(next);
  } catch (error) {
    console.error('[auth-callback]', error);
    setStatus('No se pudo completar el acceso. Intenta de nuevo.');
  }
}

run();

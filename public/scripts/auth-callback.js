import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

const statusEl = document.getElementById('authCallbackStatus');

async function run() {
  try {
    if (!hasSupabaseConfig()) {
      if (statusEl) statusEl.textContent = 'Falta configuración de acceso.';
      return;
    }

    const url = new URL(window.location.href);
    const next = url.searchParams.get('next') || '/plantillas';

    // PKCE flow (code in query)
    if (url.searchParams.get('code')) {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) throw error;
    } else {
      // Implicit/hash flow fallback
      await supabase.auth.getSession();
    }

    window.location.replace(next);
  } catch (error) {
    console.error(error);
    if (statusEl) statusEl.textContent = 'No se pudo completar el acceso. Intenta de nuevo.';
  }
}

run();

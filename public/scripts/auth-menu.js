import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

const link = document.querySelector('[data-auth-menu]');
if (!link || !hasSupabaseConfig() || !supabase) {
  // keep default login link
} else {
  const apply = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session?.user) {
      link.textContent = 'Cerrar sesión';
      link.setAttribute('href', '#');
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '/';
      }, { once: true });
    } else {
      link.textContent = 'Iniciar sesión';
      link.setAttribute('href', '/login');
    }
  };
  apply();
}

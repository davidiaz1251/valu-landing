import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

const link = document.querySelector('[data-auth-menu]');
const avatar = document.getElementById('authAvatar');

if (link && hasSupabaseConfig() && supabase) {
  const apply = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session?.user) {
      link.textContent = 'Cerrar sesión';
      link.setAttribute('href', '#');

      const photo = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
      if (avatar && photo) {
        avatar.src = photo;
        avatar.hidden = false;
      }

      link.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '/';
      }, { once: true });
    } else {
      link.textContent = 'Iniciar sesión';
      link.setAttribute('href', '/login');
      if (avatar) avatar.hidden = true;
    }
  };
  apply();
}

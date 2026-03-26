import { hasSupabaseConfig, supabase, getUserProfile } from '/scripts/supabase-client.js';

const authItem = document.querySelector('.nav__auth-item');
const link = document.querySelector('[data-auth-menu]');
const avatar = document.getElementById('authAvatar');
const isMobile = window.matchMedia('(max-width: 900px)').matches;

if (avatar) {
  avatar.hidden = true;
  avatar.style.display = 'none';
}

if (authItem && link && hasSupabaseConfig() && supabase) {
  const apply = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;

    if (!session?.user) {
      link.textContent = 'Iniciar sesión';
      link.setAttribute('href', '/login');
      if (avatar) {
        avatar.hidden = true;
        avatar.style.display = 'none';
      }
      const old = authItem.querySelector('.nav__auth-dropdown');
      if (old) old.remove();
      return;
    }

    const profile = await getUserProfile();
    const isAdmin = profile?.role === 'admin';

    const photo = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
    const fallback = 'https://ui-avatars.com/api/?background=E8D7D1&color=5F4A54&name=' + encodeURIComponent((session.user.user_metadata?.full_name || session.user.email || 'VK').slice(0, 24));
    if (avatar) {
      avatar.src = photo || fallback;
      avatar.hidden = false;
      avatar.style.display = 'block';
    }

    if (isMobile) {
      if (isAdmin) {
        link.textContent = 'Panel admin';
        link.setAttribute('href', '/admin/panel');
      } else {
        link.textContent = 'Cerrar sesión';
        link.setAttribute('href', '#');
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          await supabase.auth.signOut();
          window.location.href = '/';
        });
      }
      return;
    }

    // Desktop: dropdown toggle
    link.textContent = 'Mi cuenta';
    link.setAttribute('href', '#');

    const menu = document.createElement('div');
    menu.className = 'nav__auth-dropdown';
    menu.hidden = true;

    menu.innerHTML =
      (isAdmin ? '<a href="/admin/panel" class="nav__auth-dropdown-link">Panel admin</a>' : '') +
      '<a href="/plantillas" class="nav__auth-dropdown-link">Mis plantillas</a>' +
      '<button type="button" class="nav__auth-dropdown-link" id="authLogoutBtn">Cerrar sesión</button>';

    authItem.appendChild(menu);

    const openMenu = () => {
      menu.hidden = false;
      menu.style.display = 'grid';
    };
    const closeMenu = () => {
      menu.hidden = true;
      menu.style.display = 'none';
    };

    link.addEventListener('click', (e) => {
      e.preventDefault();
      menu.hidden ? openMenu() : closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (!authItem.contains(e.target)) closeMenu();
    });

    document.getElementById('authLogoutBtn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = '/';
    });
  };

  apply();
}

import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

const authItem = document.querySelector('.nav__auth-item');
const link = document.querySelector('[data-auth-menu]');
const avatar = document.getElementById('authAvatar');

if (authItem && link && hasSupabaseConfig() && supabase) {
  const menu = document.createElement('div');
  menu.className = 'nav__auth-dropdown';
  menu.hidden = true;
  menu.innerHTML = `
    <a href="/plantillas" class="nav__auth-dropdown-link">Mis plantillas</a>
    <button type="button" class="nav__auth-dropdown-link" id="authLogoutBtn">Cerrar sesión</button>
  `;
  authItem.appendChild(menu);

  const openMenu = () => { menu.hidden = false; authItem.classList.add('is-open'); };
  const closeMenu = () => { menu.hidden = true; authItem.classList.remove('is-open'); };

  authItem.addEventListener('mouseenter', openMenu);
  authItem.addEventListener('mouseleave', closeMenu);
  authItem.addEventListener('click', (e) => {
    if (window.innerWidth > 900) return;
    e.preventDefault();
    menu.hidden ? openMenu() : closeMenu();
  });

  document.addEventListener('click', (e) => {
    if (!authItem.contains(e.target)) closeMenu();
  });

  const apply = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session?.user) {
      link.textContent = 'Mi cuenta';
      link.setAttribute('href', '#');

      const photo = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
      if (avatar && photo) {
        avatar.src = photo;
        avatar.hidden = false;
      }

      document.getElementById('authLogoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '/';
      });
    } else {
      link.textContent = 'Iniciar sesión';
      link.setAttribute('href', '/login');
      if (avatar) avatar.hidden = true;
      menu.remove();
    }
  };
  apply();
}

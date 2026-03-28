import { hasSupabaseConfig, supabase, getUserProfile } from '/scripts/supabase-client.js';

const authItem = document.querySelector('.lk-nav__actions .nav__auth-item');
const link = document.querySelector('[data-auth-menu]');
const avatar = document.getElementById('authAvatar');
const mobileLink = document.querySelector('[data-auth-menu-mobile]');
const mobileAvatar = document.getElementById('authAvatarMobile');

let desktopMenu = null;
let onDocClickBound = false;

const hideAvatar = (el) => {
  if (!el) return;
  el.hidden = true;
  el.style.display = 'none';
};
const showAvatar = (el, src) => {
  if (!el) return;
  el.src = src;
  el.hidden = false;
  el.style.display = 'block';
};

function closeDesktopMenu() {
  if (!desktopMenu) return;
  desktopMenu.classList.remove('is-open');
}

function clearDropdown() {
  const old = authItem?.querySelector('.nav__auth-dropdown');
  if (old) old.remove();
  desktopMenu = null;
}

async function performLogout() {
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = '/';
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
    alert('No se pudo cerrar sesión. Inténtalo de nuevo.');
  }
}

async function renderAuthMenu() {
  if (!hasSupabaseConfig() || !supabase) return;
  const isMobile = window.matchMedia('(max-width: 767px)').matches;

  clearDropdown();
  hideAvatar(avatar);
  hideAvatar(mobileAvatar);

  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (!session?.user) {
    document.getElementById('authLogoutMobile')?.remove();
    if (link) {
      link.textContent = 'Iniciar sesión';
      link.setAttribute('href', '/login');
      link.onclick = null;
    }
    if (mobileLink) {
      mobileLink.textContent = 'Iniciar sesión';
      mobileLink.setAttribute('href', '/login');
    }
    return;
  }

  const profile = await getUserProfile();
  const isAdmin = profile?.role === 'admin';
  const photo = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
  const fallback =
    'https://ui-avatars.com/api/?background=E8D7D1&color=5F4A54&name=' +
    encodeURIComponent((session.user.user_metadata?.full_name || session.user.email || 'VK').slice(0, 24));
  const avatarSrc = photo || fallback;

  showAvatar(avatar, avatarSrc);
  showAvatar(mobileAvatar, avatarSrc);

  if (isMobile) {
    if (mobileLink) {
      if (isAdmin) {
        mobileLink.textContent = 'Panel admin';
        mobileLink.setAttribute('href', '/admin/panel');
      } else {
        mobileLink.textContent = 'Mis plantillas';
        mobileLink.setAttribute('href', '/plantillas');
      }

      const logoutBtnMobile = document.getElementById('authLogoutMobile');
      if (!logoutBtnMobile && mobileLink?.parentElement) {
        const b = document.createElement('button');
        b.id = 'authLogoutMobile';
        b.type = 'button';
        b.className = 'lk-mobile__login';
        b.textContent = 'Cerrar sesión';
        b.style.marginLeft = '6px';
        b.addEventListener('click', async () => {
          await performLogout();
        });
        mobileLink.parentElement.appendChild(b);
      }
    }

    if (link) {
      link.textContent = 'Mi cuenta';
      link.setAttribute('href', isAdmin ? '/admin/panel' : '/plantillas');
      link.onclick = null;
    }
    return;
  }

  if (!authItem || !link) return;

  link.textContent = 'Mi cuenta';
  link.setAttribute('href', '#');

  const menu = document.createElement('div');
  menu.className = 'nav__auth-dropdown';
  menu.innerHTML =
    (isAdmin ? '<a href="/admin/panel" class="nav__auth-dropdown-link">Panel admin</a>' : '') +
    '<a href="/plantillas" class="nav__auth-dropdown-link">Mis plantillas</a>' +
    '<button type="button" class="nav__auth-dropdown-link" id="authLogoutBtn">Cerrar sesión</button>';

  authItem.appendChild(menu);
  desktopMenu = menu;

  link.onclick = (e) => {
    e.preventDefault();
    menu.classList.toggle('is-open');
  };

  document.getElementById('authLogoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await performLogout();
  });
}

if (hasSupabaseConfig() && supabase && (link || mobileLink)) {
  if (!onDocClickBound) {
    document.addEventListener('click', (e) => {
      if (!authItem) return;
      if (!authItem.contains(e.target)) closeDesktopMenu();
    });
    onDocClickBound = true;
  }

  renderAuthMenu();
  supabase.auth.onAuthStateChange(() => {
    renderAuthMenu();
  });
}

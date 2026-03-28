import { hasSupabaseConfig, supabase, getUserProfile } from '/scripts/supabase-client.js';

const LOG_PREFIX = '[auth-menu]';
const log = (...args) => console.log(LOG_PREFIX, ...args);
const warn = (...args) => console.warn(LOG_PREFIX, ...args);
const err = (...args) => console.error(LOG_PREFIX, ...args);

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
  log('desktop dropdown cerrado (click fuera)');
}

function clearDropdown() {
  const old = authItem?.querySelector('.nav__auth-dropdown');
  if (old) {
    old.remove();
    log('dropdown anterior eliminado');
  }
  desktopMenu = null;
}

async function performLogout(source = 'unknown') {
  if (!supabase) {
    warn('performLogout sin supabase');
    return;
  }

  log(`logout iniciado desde: ${source}`);

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      err('signOut devolvió error:', error);
      throw error;
    }

    log('signOut OK, redirigiendo a /');
    window.location.href = '/';
  } catch (e) {
    err('Excepción en logout:', e);
    alert(`No se pudo cerrar sesión. Revisa consola.\nDetalle: ${e?.message || 'sin mensaje'}`);
  }
}

async function renderAuthMenu() {
  if (!hasSupabaseConfig() || !supabase) {
    warn('renderAuthMenu abortado: falta config Supabase');
    return;
  }

  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  log('renderAuthMenu start', { isMobile, hasLink: !!link, hasMobileLink: !!mobileLink, hasAuthItem: !!authItem });

  clearDropdown();
  hideAvatar(avatar);
  hideAvatar(mobileAvatar);

  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    err('getSession error:', sessionError);
    return;
  }

  const session = data?.session;
  log('session detectada:', !!session?.user, session?.user?.email || null);

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
    log('modo invitado renderizado');
    return;
  }

  const profile = await getUserProfile();
  const isAdmin = profile?.role === 'admin';
  log('perfil cargado', { role: profile?.role || null, isAdmin });

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
          log('click logout mobile');
          await performLogout('mobile-button');
        });
        mobileLink.parentElement.appendChild(b);
        log('botón logout mobile creado');
      }
    }

    if (link) {
      link.textContent = 'Mi cuenta';
      link.setAttribute('href', isAdmin ? '/admin/panel' : '/plantillas');
      link.onclick = null;
    }

    log('render mobile finalizado');
    return;
  }

  if (!authItem || !link) {
    warn('desktop: falta authItem o link');
    return;
  }

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
  log('dropdown desktop creado');

  link.onclick = (e) => {
    e.preventDefault();
    const isOpen = menu.classList.toggle('is-open');
    log('click mi cuenta desktop, isOpen=', isOpen);
  };

  const logoutBtn = document.getElementById('authLogoutBtn');
  if (!logoutBtn) {
    warn('no se encontró #authLogoutBtn tras crear dropdown');
  } else {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      log('click logout desktop');
      await performLogout('desktop-dropdown');
    });
    log('listener logout desktop conectado');
  }
}

if (hasSupabaseConfig() && supabase && (link || mobileLink)) {
  log('init auth-menu OK');

  if (!onDocClickBound) {
    document.addEventListener('click', (e) => {
      if (!authItem) return;
      if (!authItem.contains(e.target)) closeDesktopMenu();
    });
    onDocClickBound = true;
    log('listener document click registrado');
  }

  renderAuthMenu();

  supabase.auth.onAuthStateChange((event) => {
    log('onAuthStateChange:', event);
    renderAuthMenu();
  });
} else {
  warn('auth-menu no inicializado (config/link faltante)');
}

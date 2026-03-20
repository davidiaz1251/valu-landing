import { hasSupabaseConfig, supabase, ensureUserProfile, getUserProfile } from '/scripts/supabase-client.js';

const sessionBox = document.getElementById('templatesSession');
const cards = Array.from(document.querySelectorAll('.template-card'));
const heroCopy = document.querySelector('.templates-hero__description');
const roleAllowed = (requiredRoles, role) => requiredRoles.includes(role) || role === 'admin';

function lockCards() {
  cards.forEach((card) => {
    const button = card.querySelector('[data-download-btn]');
    button.setAttribute('disabled', 'true');
    button.classList.add('is-disabled');
    button.textContent = 'Inicia sesión para descargar';
  });
}

function enableCardsForRole(role, userId) {
  cards.forEach((card) => {
    const button = card.querySelector('[data-download-btn]');
    const templateId = card.dataset.templateId;
    const storagePath = card.dataset.storagePath;
    const requiredRoles = (card.dataset.requiredRoles || '').split(',').filter(Boolean);
    const allowed = roleAllowed(requiredRoles, role);

    if (!allowed) {
      button.textContent = 'No disponible';
      button.setAttribute('disabled', 'true');
      button.classList.add('is-disabled');
      return;
    }

    button.removeAttribute('disabled');
    button.classList.remove('is-disabled');
    button.textContent = 'Descargar';
    button.addEventListener('click', async () => {
      const { data, error } = await supabase.storage.from('templates').createSignedUrl(storagePath, 60);
      if (error || !data?.signedUrl) return alert('No se pudo generar la descarga.');
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.click();
      await supabase.from('downloads').insert({ user_id: userId, template_id: templateId });
    });
  });
}

async function init() {
  try {
    if (!hasSupabaseConfig()) {
      sessionBox.textContent = 'Inicia sesión para continuar.';
      lockCards();
      return;
    }

    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) throw error;

    const session = sessionData?.session;
    if (!session?.user) {
      sessionBox.innerHTML = 'Inicia sesión para continuar. <a href="/login?next=/plantillas">Entrar</a>';
      if (heroCopy) heroCopy.textContent = 'Inicia sesión para descargar tus plantillas.';
      lockCards();
      return;
    }

    await ensureUserProfile();
    const profile = await getUserProfile();
    sessionBox.innerHTML = `Sesión activa · <a href="#" id="logoutLink">Cerrar sesión</a>`;
    if (heroCopy) heroCopy.textContent = 'Ya puedes descargar tus plantillas.';

    document.getElementById('logoutLink')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await supabase.auth.signOut();
      window.location.reload();
    });

    enableCardsForRole(profile?.role || 'cliente_final', session.user.id);
  } catch (e) {
    console.error(e);
    sessionBox.textContent = 'No se pudo validar la sesión.';
    lockCards();
  }
}

init();

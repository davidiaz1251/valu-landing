import { hasSupabaseConfig, supabase, ensureUserProfile, getUserProfile } from '/scripts/supabase-client.js';

const sessionBox = document.getElementById('templatesSession');
const cards = Array.from(document.querySelectorAll('.template-card'));
const roleLabels = { cliente_final: 'Cliente final', profesional_reposteria: 'Profesional repostería', admin: 'Admin' };
const roleAllowed = (requiredRoles, role) => requiredRoles.includes(role) || role === 'admin';

function lockCards() {
  cards.forEach((card) => {
    const button = card.querySelector('[data-download-btn]');
    const roleCopy = card.querySelector('[data-role-copy]');
    const roles = (card.dataset.requiredRoles || '').split(',').filter(Boolean);
    roleCopy.textContent = `Acceso: ${roles.map((role) => roleLabels[role] || role).join(', ')}`;
    button.setAttribute('disabled', 'true');
  });
}

function enableCardsForRole(role, userId) {
  cards.forEach((card) => {
    const button = card.querySelector('[data-download-btn]');
    const roleCopy = card.querySelector('[data-role-copy]');
    const templateId = card.dataset.templateId;
    const storagePath = card.dataset.storagePath;
    const requiredRoles = (card.dataset.requiredRoles || '').split(',').filter(Boolean);
    const allowed = roleAllowed(requiredRoles, role);
    roleCopy.textContent = `Acceso: ${requiredRoles.map((r) => roleLabels[r] || r).join(', ')}`;
    if (!allowed) {
      button.textContent = 'No disponible para tu cuenta';
      button.setAttribute('disabled', 'true');
      return;
    }
    button.removeAttribute('disabled');
    button.addEventListener('click', async () => {
      const { data, error } = await supabase.storage.from('templates').createSignedUrl(storagePath, 60);
      if (error || !data?.signedUrl) return alert('No se pudo generar la descarga. Revisa permisos en Supabase.');
      const link = document.createElement('a');
      link.href = data.signedUrl; link.target = '_blank'; link.rel = 'noopener'; link.click();
      await supabase.from('downloads').insert({ user_id: userId, template_id: templateId });
    });
  });
}

async function init() {
  try {
    if (!hasSupabaseConfig()) { sessionBox.textContent = 'Configura Supabase para activar login y descargas.'; lockCards(); return; }
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) throw error;
    const session = sessionData?.session;
    if (!session?.user) {
      sessionBox.innerHTML = 'Necesitas iniciar sesión para descargar. <a href="/login?next=/plantillas">Ir a login</a>';
      lockCards(); return;
    }
    await ensureUserProfile();
    const profile = await getUserProfile();
    const role = profile?.role || 'cliente_final';
    sessionBox.innerHTML = `Sesión activa: <strong>${profile?.full_name || session.user.email}</strong> · Rol: <strong>${roleLabels[role] || role}</strong> · <a href="#" id="logoutLink">Cerrar sesión</a>`;
    document.getElementById('logoutLink')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await supabase.auth.signOut();
      window.location.reload();
    });
    enableCardsForRole(role, session.user.id);
  } catch (e) {
    console.error(e);
    sessionBox.textContent = 'No se pudo validar la sesión. Recarga o vuelve a iniciar sesión.';
    lockCards();
  }
}

init();

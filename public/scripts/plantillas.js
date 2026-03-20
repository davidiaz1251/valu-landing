import { hasSupabaseConfig, supabase, ensureUserProfile, getUserProfile } from '/scripts/supabase-client.js';

const sessionBox = document.getElementById('templatesSession');
const heroCopy = document.querySelector('.templates-hero__description');
const grid = document.querySelector('.templates__grid');

const roleAllowed = (requiredRoles, role) => requiredRoles.includes(role) || role === 'admin';

function templateCardHtml(item, enabled) {
  return `
    <article class="template-card" data-template-id="${item.id}" data-storage-path="${item.storage_path}" data-required-roles="${(item.required_roles || []).join(',')}">
      <div class="template-card__media">${item.image_path ? `<img src="https://wshszoghxaserycscvka.supabase.co/storage/v1/object/public/templates/${item.image_path}" alt="${item.title || 'Plantilla'}" />` : ""}</div>
      <div class="template-card__meta"><span class="template-card__format">${item.format || ''}</span></div>
      <h2 class="template-card__title">${item.title || 'Plantilla'}</h2>
      <p class="template-card__description">${item.description || ''}</p>
      <button class="btn btn--secondary template-card__cta ${enabled ? '' : 'is-disabled'}" data-download-btn type="button" ${enabled ? '' : 'disabled'}>
        ${enabled ? 'Descargar' : 'Inicia sesión para descargar'}
      </button>
    </article>
  `;
}

async function loadCatalog() {
  const { data, error } = await supabase
    .from('templates_catalog')
    .select('id,title,description,format,storage_path,image_path,required_roles,active,sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function renderTemplates(role, userId, loggedIn) {
  if (!grid) return;

  const catalog = await loadCatalog();
  if (!catalog.length) {
    grid.innerHTML = '<div class="templates-empty"><h2>Ahora mismo no hay plantillas disponibles</h2><p>Estamos preparando nuevas descargas.</p></div>';
    return;
  }

  const visible = [];

  for (const item of catalog) {
    const requiredRoles = item.required_roles || [];

    // Sin sesión: mostrar catálogo completo, solo bloquear descarga
    if (!loggedIn) {
      visible.push({ item, allowed: false });
      continue;
    }

    // Con sesión: comprobamos que exista archivo y permisos
    const { data: probe, error: probeError } = await supabase.storage.from('templates').createSignedUrl(item.storage_path, 30);
    const exists = !probeError && !!probe?.signedUrl;
    if (!exists) continue;

    const allowed = roleAllowed(requiredRoles, role);
    visible.push({ item, allowed });
  }

  if (!visible.length) {
    grid.innerHTML = '<div class="templates-empty"><h2>Ahora mismo no hay plantillas disponibles</h2><p>Estamos preparando nuevas descargas.</p></div>';
    return;
  }

  grid.innerHTML = visible.map(({ item, allowed }) => templateCardHtml(item, allowed)).join('');

  grid.querySelectorAll('[data-download-btn]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('.template-card');
      const templateId = card.getAttribute('data-template-id');
      const storagePath = card.getAttribute('data-storage-path');

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
      return;
    }

    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) throw error;

    const session = sessionData?.session;
    if (!session?.user) {
      sessionBox.innerHTML = 'Inicia sesión para continuar. <a href="/login?next=/plantillas">Entrar</a>';
      if (heroCopy) heroCopy.textContent = 'Inicia sesión para descargar tus plantillas.';
      await renderTemplates('cliente_final', '', false);
      return;
    }

    await ensureUserProfile();
    const profile = await getUserProfile();
    const role = profile?.role || 'cliente_final';

    sessionBox.innerHTML = `Sesión activa · <a href="#" id="logoutLink">Cerrar sesión</a>`;
    if (heroCopy) heroCopy.textContent = 'Ya puedes descargar tus plantillas.';

    document.getElementById('logoutLink')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await supabase.auth.signOut();
      window.location.reload();
    });

    await renderTemplates(role, session.user.id, true);
  } catch (e) {
    console.error(e);
    sessionBox.textContent = 'No se pudo validar la sesión.';
  }
}

init();

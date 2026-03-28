import { hasSupabaseConfig, supabase, ensureUserProfile, getUserProfile } from '/scripts/supabase-client.js';

const sessionBox = document.getElementById('templatesSession');
const heroCopy = document.getElementById('templatesHeroCopy');
const loader = document.getElementById('templatesLoader');
const filtersWrap = document.getElementById('templatesFilters');
const grid = document.getElementById('templatesGrid');
const emptyState = document.getElementById('templatesEmpty');

const FORMAT_SYMBOL = {
  PDF: '📄',
  PNG: '🖼️',
  JPG: '🖼️',
  JPEG: '🖼️',
  ZIP: '🗜️',
};

const CAT_CLASS = {
  toppers: 'tpl-cat--toppers',
  invitaciones: 'tpl-cat--invitaciones',
  'cajas y packaging': 'tpl-cat--cajas',
  'regalos personalizados': 'tpl-cat--regalos',
};

let catalogState = [];
let selectedCategory = 'Todas';

const normalize = (s = '') => s.toString().trim().toLowerCase();

const roleAllowed = (requiredRoles, role) => requiredRoles.includes(role) || role === 'admin';

function setLoading(isLoading) {
  loader.hidden = !isLoading;
}

function showEmpty(title, message, withContact = false) {
  grid.hidden = true;
  filtersWrap.hidden = true;
  emptyState.hidden = false;
  emptyState.innerHTML = `
    <div class="tpl__empty-icon">🔒</div>
    <h3>${title}</h3>
    <p>${message}</p>
    ${withContact ? '<a href="https://wa.me/34600000000" target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a>' : ''}
  `;
}

function hideEmpty() {
  emptyState.hidden = true;
  emptyState.innerHTML = '';
}

function cardHtml(item, enabled, imageUrl) {
  const fmt = (item.format || 'FILE').toUpperCase();
  const icon = FORMAT_SYMBOL[fmt] || '📦';
  const category = item.categoria || '';
  const catClass = CAT_CLASS[normalize(category)] || 'tpl-cat--default';
  const title = item.title || 'Plantilla';
  const desc = item.description || 'Plantilla lista para descargar.';

  return `
    <article class="tpl-card" data-template-id="${item.id}" data-storage-path="${item.storage_path}">
      <div class="tpl-card__media">
        ${imageUrl ? `<img src="${imageUrl}" alt="${title}" loading="lazy" />` : `<span class="tpl-card__file-icon">${icon}</span>`}
        <span class="tpl-card__format">${fmt}</span>
      </div>

      <div class="tpl-card__body">
        ${category ? `<span class="tpl-card__cat ${catClass}">${category}</span>` : ''}
        <h3 class="tpl-card__title">${title}</h3>
        <p class="tpl-card__desc">${desc}</p>

        <button class="tpl-card__btn" data-download-btn type="button" ${enabled ? '' : 'disabled'}>
          ${enabled ? 'Descargar plantilla' : 'Inicia sesión para descargar'}
        </button>
      </div>
    </article>
  `;
}

async function loadCatalog() {
  const { data, error } = await supabase
    .from('templates_catalog')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function signedImage(path) {
  if (!path) return '';
  const { data, error } = await supabase.storage.from('templates').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}

function getCategories(items) {
  const set = new Set();
  items.forEach((it) => {
    const c = it.item.categoria;
    if (c) set.add(c);
  });
  return ['Todas', ...Array.from(set)];
}

function renderFilters() {
  const categories = getCategories(catalogState);
  if (categories.length <= 2) {
    filtersWrap.hidden = true;
    return;
  }

  filtersWrap.hidden = false;
  filtersWrap.innerHTML = categories
    .map((cat) => `<button class="tpl-filter-btn ${selectedCategory === cat ? 'is-active' : ''}" data-filter="${cat}">${cat}</button>`)
    .join('');

  filtersWrap.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.getAttribute('data-filter') || 'Todas';
      renderCards();
      renderFilters();
    });
  });
}

function renderCards() {
  hideEmpty();

  const filtered = selectedCategory === 'Todas'
    ? catalogState
    : catalogState.filter((x) => (x.item.categoria) === selectedCategory);

  if (!filtered.length) {
    showEmpty('No hay plantillas en esta categoría', 'Prueba cambiando el filtro.');
    return;
  }

  grid.hidden = false;
  grid.innerHTML = filtered.map(({ item, allowed, imageUrl }) => cardHtml(item, allowed, imageUrl)).join('');

  grid.querySelectorAll('[data-download-btn]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('.tpl-card');
      if (!card) return;

      const templateId = card.getAttribute('data-template-id');
      const storagePath = card.getAttribute('data-storage-path');
      if (!storagePath) return;

      button.disabled = true;
      const oldText = button.textContent;
      button.textContent = 'Descargando...';

      try {
        const { data, error } = await supabase.storage.from('templates').createSignedUrl(storagePath, 60);
        if (error || !data?.signedUrl) throw new Error('No se pudo generar la descarga.');

        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        link.click();

        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData?.session?.user?.id;
        if (uid && templateId) {
          await supabase.from('downloads').insert({ user_id: uid, template_id: templateId });
        }
      } catch (e) {
        alert(e?.message || 'No se pudo completar la descarga.');
      } finally {
        button.disabled = false;
        button.textContent = oldText;
      }
    });
  });
}

async function buildCatalog(loggedIn, role) {
  const catalog = await loadCatalog();
  if (!catalog.length) {
    showEmpty('Aún no tienes plantillas disponibles', 'Cuando tu pedido esté listo, tus plantillas aparecerán aquí.', true);
    return;
  }

  const rows = [];

  for (const item of catalog) {
    const requiredRoles = item.required_roles || [];

    if (!loggedIn) {
      rows.push({ item, allowed: false, imageUrl: '' });
      continue;
    }

    const { data: probe, error: probeError } = await supabase.storage.from('templates').createSignedUrl(item.storage_path, 30);
    const exists = !probeError && !!probe?.signedUrl;
    if (!exists) continue;

    const allowed = roleAllowed(requiredRoles, role);
    const imageUrl = await signedImage(item.image_path);
    rows.push({ item, allowed, imageUrl });
  }

  if (!rows.length) {
    showEmpty('Aún no tienes plantillas disponibles', 'Cuando tu pedido esté listo, tus plantillas aparecerán aquí.', true);
    return;
  }

  catalogState = rows;
  renderFilters();
  renderCards();
}

async function init() {
  try {
    setLoading(true);

    if (!hasSupabaseConfig()) {
      sessionBox.innerHTML = 'Inicia sesión para continuar. <a href="/login?next=/plantillas">Entrar</a>';
      heroCopy.textContent = 'Inicia sesión para descargar tus plantillas.';
      await buildCatalog(false, 'cliente_final');
      return;
    }

    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) throw error;

    const session = sessionData?.session;
    if (!session?.user) {
      sessionBox.innerHTML = 'Inicia sesión para continuar. <a href="/login?next=/plantillas">Entrar</a>';
      heroCopy.textContent = 'Inicia sesión para descargar tus plantillas.';
      await buildCatalog(false, 'cliente_final');
      return;
    }

    await ensureUserProfile();
    const profile = await getUserProfile();
    const role = profile?.role || 'cliente_final';

    sessionBox.innerHTML = 'Sesión activa · <a href="#" id="logoutLink">Cerrar sesión</a>';
    heroCopy.textContent = 'Ya puedes descargar tus plantillas.';

    document.getElementById('logoutLink')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await supabase.auth.signOut();
      window.location.reload();
    });

    await buildCatalog(true, role);
  } catch (e) {
    console.error(e);
    sessionBox.textContent = 'No se pudo cargar tu sesión.';
    showEmpty('Hubo un problema cargando las plantillas', 'Inténtalo de nuevo en unos minutos.');
  } finally {
    setLoading(false);
  }
}

init();

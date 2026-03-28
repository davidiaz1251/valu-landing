import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

const WHATSAPP_NUMBER = '34600000000';

const statusEl = document.getElementById('catalogStatus');
const filtersEl = document.getElementById('catalogFilters');
const gridEl = document.getElementById('catalogGrid');
const emptyEl = document.getElementById('catalogEmpty');
const ctaEl = document.getElementById('catalogCta');

let allProducts = [];
let activeFilter = 'Todos';

function safe(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slugNorm(v = '') {
  return String(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function categoryStyle(title = '') {
  const t = slugNorm(title);
  if (t.includes('topper')) return 'cat-toppers';
  if (t.includes('invit')) return 'cat-invitaciones';
  if (t.includes('caja') || t.includes('packaging')) return 'cat-cajas';
  if (t.includes('regalo')) return 'cat-regalos';
  return 'cat-default';
}

async function signedImage(path) {
  if (!path) return '';
  const { data, error } = await supabase.storage.from('templates').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}

function getCategories(products) {
  const categories = ['Todos'];
  for (const p of products) {
    const c = p.category_title || '';
    if (c && !categories.includes(c)) categories.push(c);
  }
  return categories;
}

function renderFilters() {
  const cats = getCategories(allProducts);
  filtersEl.hidden = false;
  filtersEl.innerHTML = cats
    .map((c) => `<button class="catalog-filter-btn ${activeFilter === c ? 'is-active' : ''}" data-filter="${safe(c)}">${safe(c)}</button>`)
    .join('');

  filtersEl.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.getAttribute('data-filter') || 'Todos';
      renderFilters();
      renderGrid();
    });
  });
}

function productCardHtml(p) {
  const waText = encodeURIComponent(`Hola, quiero info de ${p.name}. ¿Me puedes indicar opciones de personalización y tiempo de entrega?`);
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
  const detailsLink = `/producto?id=${encodeURIComponent(p.id)}`;

  const categoryClass = categoryStyle(p.category_title);
  const tag = p.tag || '';
  const subtitle = p.subtitle || p.category_title || '';
  const desc = p.description || 'Producto personalizado hecho a mano.';
  const delivery = p.delivery_time || '3–7 días';
  const rating = p.reviews_count ?? p.rating ?? 0;

  return `
    <article class="catalog-card">
      <div class="catalog-card__media">
        ${p.image ? `<img src="${safe(p.image)}" alt="${safe(p.name)}" loading="lazy" />` : ''}
        ${tag ? `<span class="catalog-card__tag">✦ ${safe(tag)}</span>` : ''}
        ${p.category_title ? `<span class="catalog-card__cat ${categoryClass}">${safe(p.category_title)}</span>` : ''}
      </div>

      <div class="catalog-card__body">
        <p class="catalog-card__subtitle">${safe(subtitle)}</p>
        <h3 class="catalog-card__title">${safe(p.name)}</h3>
        <p class="catalog-card__desc">${safe(desc)}</p>

        <div class="catalog-card__meta">
          <span class="catalog-card__rating">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="catalog-icon catalog-icon--star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>
            <strong>${safe(rating)}</strong>
            <span>reseñas</span>
          </span>
          <span>🕐 ${safe(delivery)}</span>
        </div>

        <div class="catalog-card__actions">
          <a class="catalog-card__btn catalog-card__btn--ghost" href="${detailsLink}">
            Ver detalles
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="catalog-icon"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </a>
          <a class="catalog-card__btn catalog-card__btn--primary" href="${waLink}" target="_blank" rel="noopener noreferrer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="catalog-icon"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg>
            Pedir
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderGrid() {
  const filtered = activeFilter === 'Todos'
    ? allProducts
    : allProducts.filter((p) => p.category_title === activeFilter);

  if (!filtered.length) {
    gridEl.hidden = true;
    emptyEl.hidden = false;
    emptyEl.innerHTML = '<h3>No hay productos en esta categoría</h3><p>Prueba cambiando el filtro.</p>';
    return;
  }

  emptyEl.hidden = true;
  gridEl.hidden = false;
  gridEl.innerHTML = filtered.map((p) => productCardHtml(p)).join('');
}

async function init() {
  try {
    if (!hasSupabaseConfig() || !supabase) throw new Error('No hay conexión con Supabase.');

    const { data, error } = await supabase
      .from('products_catalog')
      .select('id,name,description,image_path,image_url,category_id,sort_order,is_active,products_categories:category_id(id,title)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];

    const hydrated = [];
    for (const row of rows) {
      const direct = row.image_url || '';
      const signed = direct ? '' : await signedImage(row.image_path || '');
      hydrated.push({
        ...row,
        image: direct || signed || '',
        category_title: row.products_categories?.title || '',
      });
    }

    allProducts = hydrated;

    statusEl.hidden = true;

    if (!allProducts.length) {
      filtersEl.hidden = true;
      gridEl.hidden = true;
      emptyEl.hidden = false;
      emptyEl.innerHTML = '<h3>Aún no hay productos disponibles</h3><p>Estamos preparando nuevas piezas para el catálogo.</p>';
      ctaEl.hidden = false;
      return;
    }

    renderFilters();
    renderGrid();
    ctaEl.hidden = false;
  } catch (e) {
    console.error(e);
    statusEl.hidden = false;
    statusEl.textContent = `No se pudo cargar el catálogo: ${e?.message || 'error desconocido'}`;
    filtersEl.hidden = true;
    gridEl.hidden = true;
    emptyEl.hidden = true;
    ctaEl.hidden = true;
  }
}

init();

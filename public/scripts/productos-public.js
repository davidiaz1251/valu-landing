import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

const WHATSAPP_NUMBER = '34600000000';
const INSTAGRAM_USERNAME = 'valu_kraft';

const statusEl = document.getElementById('catalog-status');
const tabsEl = document.getElementById('category-tabs');
const rootEl = document.getElementById('catalog-root');

init();

async function init() {
  try {
    if (!hasSupabaseConfig() || !supabase) {
      throw new Error('No hay conexión con Supabase.');
    }

    const [catRes, prodRes] = await Promise.all([
      supabase.from('products_categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('products_catalog').select('*').eq('is_active', true).order('sort_order', { ascending: true })
    ]);

    if (catRes.error) throw new Error(catRes.error.message);
    if (prodRes.error) throw new Error(prodRes.error.message);

    const categories = Array.isArray(catRes.data) ? catRes.data : [];
    const products = Array.isArray(prodRes.data) ? prodRes.data : [];

    render(categories, products);
    statusEl.textContent = categories.length ? '' : 'No hay categorías activas todavía.';
  } catch (err) {
    statusEl.textContent = `No se pudo cargar el catálogo: ${err?.message || 'error desconocido'}`;
    tabsEl.innerHTML = '';
    rootEl.innerHTML = '';
  }
}

function render(categories, products) {
  const grouped = new Map();
  for (const p of products) {
    if (!grouped.has(p.category_id)) grouped.set(p.category_id, []);
    grouped.get(p.category_id).push(p);
  }

  const visibleCategories = categories
    .map((c) => ({ ...c, products: grouped.get(c.id) || [] }))
    .filter((c) => c.products.length > 0);

  tabsEl.innerHTML = visibleCategories
    .map((c) => `<a href="#${safe(c.id)}" class="tab-link">${safe(c.title)}</a>`)
    .join('');

  rootEl.innerHTML = visibleCategories
    .map((category) => {
      const cards = category.products.map((product) => {
        const message = encodeURIComponent(`Hola, quiero info de ${product.name}. ¿Me puedes indicar opciones de personalización y tiempo de entrega?`);
        const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
        const igLink = `https://instagram.com/${INSTAGRAM_USERNAME}`;

        return `
          <article class="product-card">
            <div class="product-card__media">
              <div class="product-card__placeholder">${safe(category.icon || 'Valu Kraft')}</div>
            </div>
            <div class="product-card__body">
              <h3>${safe(product.name)}</h3>
              <p>${safe(product.description || '')}</p>
              <span class="product-badge">Personalizable</span>
              <div class="product-card__actions">
                <a href="${waLink}" class="btn btn--primary" target="_blank" rel="noopener noreferrer">Pedir por WhatsApp</a>
                <a href="${igLink}" class="btn btn--secondary" target="_blank" rel="noopener noreferrer">Pedir por Instagram</a>
              </div>
            </div>
          </article>
        `;
      }).join('');

      return `
        <section class="section" id="${safe(category.id)}">
          <div class="container">
            <h2>${safe(category.title)}</h2>
            <p class="section__description">${safe(category.description || '')}</p>
            <div class="product-grid">${cards}</div>
          </div>
        </section>
      `;
    }).join('');
}

function safe(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

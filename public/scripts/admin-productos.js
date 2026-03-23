import { hasSupabaseConfig, supabase, getUserProfile } from '/scripts/supabase-client.js';

const statusEl = document.getElementById('adminProductsStatus');
const appEl = document.getElementById('adminProductsApp');

const categoryList = document.getElementById('category-list');
const productList = document.getElementById('product-list');

const categoryModal = document.getElementById('categoryModal');
const categoryForm = document.getElementById('category-form');
const categoryModalTitle = document.getElementById('category-modal-title');

const productModal = document.getElementById('productModal');
const productForm = document.getElementById('product-form');
const productModalTitle = document.getElementById('product-modal-title');
const productCategorySelect = document.getElementById('product-category-select');
const productImageFile = document.getElementById('product-image-file');

const newCategoryBtn = document.getElementById('new-category-btn');
const newProductBtn = document.getElementById('new-product-btn');
const tabLinks = Array.from(document.querySelectorAll('[data-admin-tab-link]'));
const tabPanels = Array.from(document.querySelectorAll('[data-admin-tab]'));

let categories = [];
let products = [];

init();

async function init() {
  try {
    if (!hasSupabaseConfig() || !supabase) throw new Error('Supabase no está configurado.');

    const profile = await getUserProfile();
    if (!profile || profile.role !== 'admin') throw new Error('Acceso restringido: solo admin.');

    await refreshData();
    statusEl.textContent = 'Acceso admin validado.';
    appEl.hidden = false;
    bindEvents();
  } catch (err) {
    statusEl.textContent = err?.message || 'Error al cargar panel.';
    appEl.hidden = true;
  }
}

function bindEvents() {
  newCategoryBtn?.addEventListener('click', () => openCategoryModal('create'));
  newProductBtn?.addEventListener('click', () => openProductModal('create'));

  categoryForm?.addEventListener('submit', onCategorySubmit);
  productForm?.addEventListener('submit', onProductSubmit);

  categoryList?.addEventListener('click', onCategoryActions);
  productList?.addEventListener('click', onProductActions);

  categoryModal?.addEventListener('click', (e) => {
    const target = e.target;
    if (target instanceof HTMLElement && target.hasAttribute('data-close-category-modal')) closeCategoryModal();
  });

  productModal?.addEventListener('click', (e) => {
    const target = e.target;
    if (target instanceof HTMLElement && target.hasAttribute('data-close-product-modal')) closeProductModal();
  });

  tabLinks.forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.getAttribute('data-admin-tab-link') || 'categorias'));
  });

  const initial = (window.location.hash || '').replace('#', '');
  if (initial === 'productos' || initial === 'categorias') setTab(initial);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!categoryModal.hidden) closeCategoryModal();
      if (!productModal.hidden) closeProductModal();
    }
  });
}

function setTab(tab) {
  tabLinks.forEach((btn) => btn.classList.toggle('is-active', btn.getAttribute('data-admin-tab-link') === tab));
  tabPanels.forEach((panel) => panel.classList.toggle('is-active', panel.getAttribute('data-admin-tab') === tab));
  if (window.location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
}

async function refreshData() {
  const [catRes, prodRes] = await Promise.all([
    supabase.from('products_categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('products_catalog').select('*').order('sort_order', { ascending: true })
  ]);

  if (catRes.error) throw new Error(`Error categorías: ${catRes.error.message}`);
  if (prodRes.error) throw new Error(`Error productos: ${prodRes.error.message}`);

  categories = Array.isArray(catRes.data) ? catRes.data : [];
  products = Array.isArray(prodRes.data) ? prodRes.data : [];

  renderCategoryOptions();
  renderCategories();
  await renderProducts();
}

function safe(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slugify(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

async function signedImage(path) {
  if (!path) return '';
  const { data, error } = await supabase.storage.from('templates').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}

async function uploadProductImage(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('templates').upload(path, file, { upsert: true });
  if (error) throw new Error(`No se pudo subir imagen: ${error.message}`);
  return path;
}

function renderCategoryOptions() {
  if (!productCategorySelect) return;
  productCategorySelect.innerHTML = categories
    .filter((c) => c.is_active !== false)
    .map((c) => `<option value="${safe(c.id)}">${safe(c.title)}</option>`)
    .join('');
}

function renderCategories() {
  categoryList.innerHTML = categories.length
    ? categories.map((c) => {
      const count = products.filter((p) => p.category_id === c.id).length;
      return `<div class="admin-file">        <div style="display:flex; gap:10px; align-items:center;">          <div class="admin-file__thumb" style="display:grid;place-items:center;font-size:24px;background:#fff7f4;">${safe(c.icon || '📁')}</div>          <div>            <div class="admin-file__name">${safe(c.title)}</div>            <span class="admin-file__path">ID: ${safe(c.id)} · Orden: ${safe(c.sort_order)} · ${c.is_active ? 'Activa' : 'Inactiva'} · ${count} producto(s)</span>          </div>        </div>        <div class="admin-actions">          <button class="btn-mini" type="button" data-edit-category="${safe(c.id)}">Editar</button>          <button class="btn-mini" type="button" data-toggle-category="${safe(c.id)}">${c.is_active ? 'Desactivar' : 'Activar'}</button>          <button class="btn-mini danger" type="button" data-delete-category="${safe(c.id)}">Eliminar</button>        </div>      </div>`;
    }).join('')
    : '<p>No hay categorías creadas.</p>';
}

async function renderProducts() {
  if (!products.length) {
    productList.innerHTML = '<p>No hay productos creados.</p>';
    return;
  }

  const rows = await Promise.all(products.map(async (p) => {
    const category = categories.find((c) => c.id === p.category_id);
    const preview = await signedImage(p.image_path || '');
    return { p, category, preview };
  }));

  productList.innerHTML = rows.map(({ p, category, preview }) =>     `<div class="admin-file">      <div style="display:flex; gap:10px; align-items:center;">        <img src="${safe(preview)}" class="admin-file__thumb" ${preview ? '' : 'style="display:none"'} alt="preview" />        <div>          <div class="admin-file__name">${safe(p.name)}</div>          <span class="admin-file__path">Categoría: ${safe(category?.title || p.category_id)} · Orden: ${safe(p.sort_order)} · ${p.is_active ? 'Activo' : 'Oculto'}</span>        </div>      </div>      <div class="admin-actions">        <button class="btn-mini" type="button" data-edit-product="${safe(p.id)}">Editar</button>        <button class="btn-mini" type="button" data-toggle-product="${safe(p.id)}">${p.is_active ? 'Ocultar' : 'Activar'}</button>        <button class="btn-mini danger" type="button" data-delete-product="${safe(p.id)}">Eliminar</button>      </div>    </div>`
  ).join('');
}

function openCategoryModal(mode, category = null) {
  if (mode === 'create') {
    categoryModalTitle.textContent = 'Nueva categoría';
    categoryForm.reset();
    categoryForm.id.value = '';
    categoryForm.is_active.checked = true;
  } else if (category) {
    categoryModalTitle.textContent = `Editar: ${category.title}`;
    categoryForm.id.value = category.id;
    categoryForm.slug.value = category.id;
    categoryForm.title.value = category.title || '';
    categoryForm.description.value = category.description || '';
    categoryForm.icon.value = category.icon || '';
    categoryForm.sort_order.value = String(category.sort_order ?? 100);
    categoryForm.is_active.checked = category.is_active !== false;
  }
  categoryModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeCategoryModal() { categoryModal.hidden = true; document.body.style.overflow = ''; }

function openProductModal(mode, product = null) {
  if (categories.filter((c) => c.is_active !== false).length === 0) return alert('Primero crea una categoría activa.');

  if (mode === 'create') {
    productModalTitle.textContent = 'Nuevo producto';
    productForm.reset();
    productForm.id.value = '';
    productForm.is_active.checked = true;
    if (productImageFile) productImageFile.value = '';
    productCategorySelect.value = categories.find((c) => c.is_active !== false)?.id || '';
  } else if (product) {
    productModalTitle.textContent = `Editar: ${product.name}`;
    productForm.id.value = product.id;
    productForm.name.value = product.name || '';
    productForm.category_id.value = product.category_id || '';
    productForm.description.value = product.description || '';
    if (productImageFile) productImageFile.value = '';
    productForm.sort_order.value = String(product.sort_order ?? 100);
    productForm.is_active.checked = product.is_active !== false;
  }

  productModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeProductModal() { productModal.hidden = true; document.body.style.overflow = ''; }

async function onCategorySubmit(e) {
  e.preventDefault();
  const data = new FormData(categoryForm);
  const existingId = String(data.get('id') || '').trim();
  const title = String(data.get('title') || '').trim();
  const slugInput = String(data.get('slug') || '').trim();
  const id = existingId || slugify(slugInput || title);
  if (!id) return alert('Debes indicar título o ID válido.');

  const payload = {
    id,
    title,
    description: String(data.get('description') || '').trim() || null,
    icon: String(data.get('icon') || '').trim() || '✨',
    sort_order: Number(data.get('sort_order') || 100),
    is_active: categoryForm.is_active.checked
  };

  const { error } = existingId
    ? await supabase.from('products_categories').update(payload).eq('id', existingId)
    : await supabase.from('products_categories').insert(payload);

  if (error) return alert(`No se pudo guardar categoría: ${error.message}`);
  closeCategoryModal();
  await refreshData();
}

async function onProductSubmit(e) {
  e.preventDefault();
  const data = new FormData(productForm);
  const existingId = String(data.get('id') || '').trim();

  let imagePath = null;
  if (productImageFile?.files?.[0]) {
    try {
      imagePath = await uploadProductImage(productImageFile.files[0]);
    } catch (err) {
      return alert(err.message || 'No se pudo subir imagen');
    }
  }

  const current = existingId ? products.find((p) => p.id === existingId) : null;
  const payload = {
    category_id: String(data.get('category_id') || '').trim(),
    name: String(data.get('name') || '').trim(),
    description: String(data.get('description') || '').trim() || null,
    image_path: imagePath || current?.image_path || null,
    image_url: null,
    sort_order: Number(data.get('sort_order') || 100),
    is_active: productForm.is_active.checked
  };

  const { error } = existingId
    ? await supabase.from('products_catalog').update(payload).eq('id', existingId)
    : await supabase.from('products_catalog').insert(payload);

  if (error && /image_url|image_path/i.test(error.message || '')) {
    return alert("Falta columna image_path/image_url en products_catalog. SQL: alter table public.products_catalog add column if not exists image_path text;");
  }
  if (error) return alert(`No se pudo guardar producto: ${error.message}`);

  closeProductModal();
  await refreshData();
}

async function onCategoryActions(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const editId = target.getAttribute('data-edit-category');
  if (editId) {
    const category = categories.find((c) => c.id === editId);
    if (category) openCategoryModal('edit', category);
    return;
  }

  const toggleId = target.getAttribute('data-toggle-category');
  if (toggleId) {
    const category = categories.find((c) => c.id === toggleId);
    if (!category) return;
    const { error } = await supabase.from('products_categories').update({ is_active: !category.is_active }).eq('id', toggleId);
    if (error) return alert(`No se pudo actualizar estado: ${error.message}`);
    await refreshData();
    return;
  }

  const delId = target.getAttribute('data-delete-category');
  if (delId) {
    if (!confirm('¿Eliminar categoría? También eliminará sus productos asociados.')) return;
    const { error } = await supabase.from('products_categories').delete().eq('id', delId);
    if (error) return alert(`No se pudo eliminar categoría: ${error.message}`);
    await refreshData();
  }
}

async function onProductActions(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const editId = target.getAttribute('data-edit-product');
  if (editId) {
    const product = products.find((p) => p.id === editId);
    if (product) openProductModal('edit', product);
    return;
  }

  const toggleId = target.getAttribute('data-toggle-product');
  if (toggleId) {
    const product = products.find((p) => p.id === toggleId);
    if (!product) return;
    const { error } = await supabase.from('products_catalog').update({ is_active: !product.is_active }).eq('id', toggleId);
    if (error) return alert(`No se pudo actualizar estado: ${error.message}`);
    await refreshData();
    return;
  }

  const delId = target.getAttribute('data-delete-product');
  if (delId) {
    if (!confirm('¿Eliminar producto?')) return;
    const { error } = await supabase.from('products_catalog').delete().eq('id', delId);
    if (error) return alert(`No se pudo eliminar producto: ${error.message}`);
    await refreshData();
  }
}

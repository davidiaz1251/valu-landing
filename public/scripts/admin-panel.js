import { hasSupabaseConfig, supabase, ensureUserProfile, getUserProfile } from '/scripts/supabase-client.js';

const statusEl = document.getElementById('adminPanelStatus');
const appEl = document.getElementById('adminPanelApp');

const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const imageInput = document.getElementById('imageInput');
const titleInput = document.getElementById('titleInput');
const descriptionInput = document.getElementById('descriptionInput');
const filesList = document.getElementById('filesList');
const usersList = document.getElementById('usersList');

const editModal = document.getElementById('templateEditModal');
const editForm = document.getElementById('templateEditForm');
const modalTemplateId = document.getElementById('modalTemplateId');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalCategory = document.getElementById('modalCategory');
const modalOrder = document.getElementById('modalOrder');
const modalPathLabel = document.getElementById('modalPathLabel');
const modalImageFile = document.getElementById('modalImageFile');
const toastEl = document.getElementById('adminToast');

const ROLES = ['cliente_final', 'profesional_reposteria', 'admin'];
let templateCategories = []; // [{id,title}]

function setStatus(text) { if (statusEl) statusEl.textContent = text; }
function showToast(msg, type = 'ok') {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className = `toast ${type === 'err' ? 'err' : 'ok'}`;
  toastEl.hidden = false;
  setTimeout(() => { toastEl.hidden = true; }, 1600);
}
function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
}
function roleOptions(current) {
  return ROLES.map((r) => `<option value="${r}" ${r===current?'selected':''}>${r}</option>`).join('');
}

function renderTemplateCategoryOptions(selected = '') {
  const selects = [folderInput, modalCategory].filter(Boolean);
  const options = ['<option value="">Selecciona categoría</option>']
    .concat(templateCategories.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.title)}</option>`));

  selects.forEach((sel) => {
    sel.innerHTML = options.join('');
    if (selected && templateCategories.some((c) => c.id === selected)) sel.value = selected;
  });
}

async function loadTemplateCategories() {
  const { data, error } = await supabase
    .from('products_categories')
    .select('title,is_active,sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    console.warn('No se pudieron cargar categorías de productos:', error.message);
    templateCategories = [];
  } else {
    templateCategories = (data || [])
      .map((r) => ({ id: String(r.id || '').trim(), title: String(r.title || '').trim() }))
      .filter((r) => r.id && r.title);
    if (!templateCategories.length) {
      templateCategories = [];
    }
  }

  renderTemplateCategoryOptions();

  if (!templateCategories.length) {
    setStatus('No hay categorías activas en Admin > Categorías. Crea o activa al menos una para subir plantillas.');
  }
}


function openModal() { editModal.hidden = false; }
function closeModal() { editModal.hidden = true; }
document.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', closeModal));

async function getSignedPreview(path) {
  if (!path) return '';
  const { data, error } = await supabase.storage.from('templates').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}

async function loadFiles() {
  filesList.textContent = 'Cargando archivos…';
  const { data, error } = await supabase
    .from('templates_catalog')
    .select('id,title,description,format,storage_path,image_path,required_roles,active,sort_order,categoria_id,products_categories:categoria_id(id,title)')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) return (filesList.textContent = `Error al listar: ${error.message}`);
  if (!data?.length) return (filesList.textContent = 'No hay plantillas aún.');

  const withPreview = await Promise.all(data.map(async (f) => ({
    ...f,
    previewUrl: await getSignedPreview(f.image_path),
  })));

  filesList.innerHTML = withPreview.map((f) => `
    <div class="admin-file" data-id="${escapeHtml(f.id)}" data-path="${escapeHtml(f.storage_path)}" data-image="${escapeHtml(f.image_path || '')}" data-title="${escapeHtml(f.title || '')}" data-description="${escapeHtml(f.description || '')}" data-order="${Number(f.sort_order || 100)}" data-categoria="${escapeHtml(f.categoria_id || '')}">
      <div style="display:flex; gap:10px; align-items:center;">
        <img src="${escapeHtml(f.previewUrl || '')}" class="admin-file__thumb" ${f.previewUrl ? '' : 'style="display:none"'} alt="preview" />
        <div>
          <div class="admin-file__name">${escapeHtml(f.title || f.storage_path)}</div>
          <span class="admin-file__path">storagePath: ${escapeHtml(f.storage_path)}</span>
        </div>
      </div>
      <div class="admin-actions">
        <button class="btn-mini" data-edit>Editar</button>
        <button class="btn-mini danger" data-delete-id="${escapeHtml(f.id)}" data-delete-path="${escapeHtml(f.storage_path)}">Eliminar</button>
      </div>
    </div>
  `).join('');

  filesList.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.admin-file');
      modalTemplateId.value = row.dataset.id;
      modalTitle.value = row.dataset.title || '';
      modalDescription.value = row.dataset.description || '';
      renderTemplateCategoryOptions(row.dataset.categoria || '');
      modalOrder.value = row.dataset.order || 100;
      if (modalImageFile) modalImageFile.value = '';
      modalPathLabel.textContent = `Ruta: ${row.dataset.path}`;
      openModal();
    });
  });

  filesList.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-id');
      const path = btn.getAttribute('data-delete-path');
      if (!confirm('Eliminar plantilla y archivo?')) return;

      const { error: storageErr } = await supabase.storage.from('templates').remove([path]);
      if (storageErr) { showToast('No se pudo eliminar archivo', 'err'); return; }

      const { error: rowErr } = await supabase.from('templates_catalog').delete().eq('id', id);
      if (rowErr) { showToast('No se pudo eliminar registro', 'err'); return; }

      showToast('Plantilla eliminada');
      loadFiles();
    });
  });
}

editForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = modalTemplateId.value;
  const title = modalTitle.value.trim();
  const description = modalDescription.value.trim();
  const sort_order = Number(modalOrder.value || 100);
  const categoria_id = (modalCategory?.value || '').trim();

  const payload = { title, description, categoria_id, sort_order };

  if (modalImageFile?.files?.[0]) {
    const img = modalImageFile.files[0];
    const ext = (img.name.split('.').pop() || 'jpg').toLowerCase();
    const imgPath = `previews/${Date.now()}-preview.${ext}`;
    const { error: imgErr } = await supabase.storage.from('templates').upload(imgPath, img, { upsert: true });
    if (imgErr) { showToast('No se pudo subir imagen', 'err'); return; }
    payload.image_path = imgPath;
  }

  const { error } = await supabase.from('templates_catalog').update(payload).eq('id', id);
  if (error) { showToast('No se pudo guardar', 'err'); return; }

  closeModal();
  showToast('Cambios guardados');
  await loadFiles();
});

async function loadUsers() {
  usersList.textContent = 'Cargando usuarios…';
  const { data, error } = await supabase.from('profiles').select('id,email,full_name,role').order('full_name', { ascending: true });
  if (error) return (usersList.textContent = `Error: ${error.message}`);
  if (!data?.length) return (usersList.textContent = 'No hay usuarios aún.');

  usersList.innerHTML = data.map((u) => `
    <div class="user-row" data-id="${u.id}">
      <div class="user-meta"><strong>${escapeHtml(u.full_name || 'Sin nombre')}</strong><small>${escapeHtml(u.email || 'sin email')}</small></div>
      <select class="user-role" data-role>${roleOptions(u.role || 'cliente_final')}</select>
      <button class="btn-mini" data-save>Guardar</button>
    </div>
  `).join('');

  usersList.querySelectorAll('[data-save]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.user-row');
      const id = row.getAttribute('data-id');
      const role = row.querySelector('[data-role]').value;
      btn.textContent = 'Guardando…';
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) {
        showToast('No se pudo actualizar', 'err');
        btn.textContent = 'Guardar';
        return;
      }
      btn.textContent = 'Guardado';
      btn.classList.add('is-ok');
      setTimeout(() => { btn.textContent = 'Guardar'; btn.classList.remove('is-ok'); }, 1200);
    });
  });
}

async function init() {
  if (!hasSupabaseConfig()) return setStatus('Falta configuración.');
  const { data } = await supabase.auth.getSession();
  if (!data?.session?.user) return setStatus('Necesitas iniciar sesión para entrar al panel.');

  await ensureUserProfile();
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'admin') return setStatus('No tienes permisos para este panel.');

  await loadTemplateCategories();

  statusEl.hidden = true;
  appEl.hidden = false;
  await Promise.all([loadFiles(), loadUsers()]);

  uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) return;

    if (!templateCategories.length) return setStatus('No hay categorías activas. Ve a Admin > Categorías.');

    const categoria_id = (folderInput.value || '').trim();
    if (!categoria_id) return setStatus('Selecciona categoría.');
    if (!templateCategories.some((c) => c.id === categoria_id)) return setStatus('Categoría inválida. Recarga la página y vuelve a seleccionar.');

    const categoryTitle = templateCategories.find((c) => c.id === categoria_id)?.title || categoria_id;
    const categorySlug = categoryTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const safeName = file.name.replace(/\s+/g, '-');
    const path = `${categorySlug}/${safeName}`;

    let image_path = '';
    if (imageInput?.files?.[0]) {
      const img = imageInput.files[0];
      const ext = (img.name.split('.').pop() || 'jpg').toLowerCase();
      const imgPath = `previews/${Date.now()}-preview.${ext}`;
      const { error: imgErr } = await supabase.storage.from('templates').upload(imgPath, img, { upsert: true });
      if (imgErr) return setStatus(`Error al subir imagen: ${imgErr.message}`);
      image_path = imgPath;
    }

    setStatus('Subiendo archivo…');
    const { error } = await supabase.storage.from('templates').upload(path, file, { upsert: true });
    if (error) return setStatus(`Error al subir: ${error.message}`);

    const title = file.name.replace(/\.[^/.]+$/, '');
    const format = (file.name.split('.').pop() || '').toUpperCase();

    const { error: insErr } = await supabase.from('templates_catalog').insert({
      title,
      description: 'Plantilla disponible para descarga.',
      categoria_id,
      format,
      storage_path: path,
      image_path,
      required_roles: ['cliente_final', 'profesional_reposteria', 'admin'],
      active: true,
      sort_order: 100,
    });

    if (insErr) { setStatus('Archivo subido pero falló registro'); showToast('Error al registrar plantilla','err'); return; }

    setStatus('Plantilla creada correctamente.');
    showToast('Plantilla subida');
    uploadForm.reset();
    await loadFiles();
  });
}

init();

const tabLinks = document.querySelectorAll('[data-tab-link]');
const tabs = document.querySelectorAll('[data-tab]');
function setTab(name){
  tabLinks.forEach((b)=>b.classList.toggle('is-active', b.getAttribute('data-tab-link')===name));
  tabs.forEach((t)=>t.classList.toggle('is-active', t.getAttribute('data-tab')===name));
}
tabLinks.forEach((btn)=>btn.addEventListener('click',()=>setTab(btn.getAttribute('data-tab-link'))));

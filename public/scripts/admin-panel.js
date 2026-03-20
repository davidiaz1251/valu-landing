import { hasSupabaseConfig, supabase, ensureUserProfile, getUserProfile } from '/scripts/supabase-client.js';

const statusEl = document.getElementById('adminPanelStatus');
const appEl = document.getElementById('adminPanelApp');

const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const filesList = document.getElementById('filesList');
const usersList = document.getElementById('usersList');

const ROLES = ['cliente_final', 'profesional_reposteria', 'admin'];

function setStatus(text) { if (statusEl) statusEl.textContent = text; }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
function roleOptions(current) { return ROLES.map((r) => `<option value="${r}" ${r===current?'selected':''}>${r}</option>`).join(''); }

async function loadFiles() {
  filesList.textContent = 'Cargando archivos…';
  const { data, error } = await supabase
    .from('templates_catalog')
    .select('id,title,description,format,storage_path,required_roles,active,sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) return (filesList.textContent = `Error al listar: ${error.message}`);
  if (!data?.length) return (filesList.textContent = 'No hay plantillas aún.');

  filesList.innerHTML = data.map((f) => `
    
    <div class="admin-file" data-id="${escapeHtml(f.id)}" data-path="${escapeHtml(f.storage_path)}">
      <div class="admin-file__form">
        <label class="admin-field">
          <span class="admin-field__label">Título visible</span>
          <input data-title value="${escapeHtml(f.title || "")}" placeholder="Ej: Pack cumpleaños Stitch" class="user-role" style="min-width:unset;" />
        </label>

        <label class="admin-field">
          <span class="admin-field__label">Descripción corta</span>
          <input data-description value="${escapeHtml(f.description || "")}" placeholder="Ej: Plantilla editable para topper" class="user-role" style="min-width:unset;" />
        </label>

        <div class="admin-file__meta-row">
          <span class="admin-file__path" title="Ruta interna en Supabase Storage">storagePath: ${escapeHtml(f.storage_path)}</span>

          <label class="admin-field admin-field--order">
            <span class="admin-field__label">Orden</span>
            <input data-order type="number" value="${Number(f.sort_order || 100)}" class="user-role" style="width:110px; min-width:110px;" />
          </label>
        </div>
      </div>

      <div class="admin-actions">
        <button class="btn-mini" data-copy="${escapeHtml(f.storage_path)}">Copiar ruta</button>
        <button class="btn-mini" data-save="${escapeHtml(f.id)}">Guardar cambios</button>
        <button class="btn-mini danger" data-delete-id="${escapeHtml(f.id)}" data-delete-path="${escapeHtml(f.storage_path)}">Eliminar</button>
      </div>
    </div>
      <div class="admin-actions">
        <button class="btn-mini" data-copy="${escapeHtml(f.storage_path)}">Copiar ruta</button>
        <button class="btn-mini" data-save="${escapeHtml(f.id)}">Guardar</button>
        <button class="btn-mini danger" data-delete-id="${escapeHtml(f.id)}" data-delete-path="${escapeHtml(f.storage_path)}">Eliminar</button>
      </div>
    </div>
  `).join('');

  filesList.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(btn.getAttribute('data-copy'));
      btn.textContent = 'Copiado';
      setTimeout(() => (btn.textContent = 'Copiar ruta'), 1200);
    });
  });

  filesList.querySelectorAll('[data-save]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.admin-file');
      const id = btn.getAttribute('data-save');
      const title = row.querySelector('[data-title]').value.trim();
      const description = row.querySelector('[data-description]').value.trim();
      const sort_order = Number(row.querySelector('[data-order]').value || 100);
      btn.textContent = 'Guardando…';

      const { error } = await supabase
        .from('templates_catalog')
        .update({ title, description, sort_order })
        .eq('id', id);

      if (error) {
        alert(`No se pudo guardar: ${error.message}`);
        btn.textContent = 'Guardar';
        return;
      }
      btn.textContent = 'Guardado';
      btn.classList.add('is-ok');
      setTimeout(() => { btn.textContent = 'Guardar'; btn.classList.remove('is-ok'); }, 1200);
    });
  });

  filesList.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-id');
      const path = btn.getAttribute('data-delete-path');
      if (!confirm('Eliminar plantilla y archivo?')) return;

      const { error: storageErr } = await supabase.storage.from('templates').remove([path]);
      if (storageErr) return alert(`No se pudo eliminar archivo: ${storageErr.message}`);

      const { error: rowErr } = await supabase.from('templates_catalog').delete().eq('id', id);
      if (rowErr) return alert(`No se pudo eliminar registro: ${rowErr.message}`);

      loadFiles();
    });
  });
}

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
        alert(`No se pudo actualizar: ${error.message}`);
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

  setStatus('Acceso admin OK');
  appEl.hidden = false;
  await Promise.all([loadFiles(), loadUsers()]);

  uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) return;
    const folder = (folderInput.value || '').trim().replace(/^\/+|\/+$/g, '');
    const safeName = file.name.replace(/\s+/g, '-');
    const path = folder ? `${folder}/${safeName}` : safeName;

    setStatus('Subiendo archivo…');
    const { error } = await supabase.storage.from('templates').upload(path, file, { upsert: true });
    if (error) return setStatus(`Error al subir: ${error.message}`);

    const title = file.name.replace(/\.[^/.]+$/, '');
    const format = (file.name.split('.').pop() || '').toUpperCase();

    const { error: insErr } = await supabase.from('templates_catalog').insert({
      title,
      description: 'Plantilla disponible para descarga.',
      format,
      storage_path: path,
      required_roles: ['cliente_final', 'profesional_reposteria', 'admin'],
      active: true,
      sort_order: 100,
    });

    if (insErr) return setStatus(`Archivo subido, pero no se pudo crear registro: ${insErr.message}`);

    setStatus('Plantilla creada correctamente.');
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

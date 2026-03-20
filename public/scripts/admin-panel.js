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
function escapeHtml(v) { return String(v).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
function roleOptions(current) { return ROLES.map((r) => `<option value="${r}" ${r===current?'selected':''}>${r}</option>`).join(''); }

async function loadFiles() {
  filesList.textContent = 'Cargando archivos…';
  const { data, error } = await supabase.storage.from('templates').list('', { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
  if (error) return (filesList.textContent = `Error al listar: ${error.message}`);
  if (!data?.length) return (filesList.textContent = 'No hay archivos aún.');

  filesList.innerHTML = data.filter((f) => f.name).map((f) => `
    <div class="admin-file">
      <div><strong>${escapeHtml(f.name)}</strong><br/><code>storagePath: ${escapeHtml(f.name)}</code></div>
      <div class="admin-actions">
        <button class="btn-mini" data-copy="${escapeHtml(f.name)}">Copiar ruta</button>
        <button class="btn-mini danger" data-delete="${escapeHtml(f.name)}">Eliminar</button>
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

  filesList.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const path = btn.getAttribute('data-delete');
      if (!confirm(`Eliminar ${path}?`)) return;
      const { error } = await supabase.storage.from('templates').remove([path]);
      if (error) return alert(`No se pudo eliminar: ${error.message}`);
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
      setTimeout(() => (btn.textContent = 'Guardar'), 1200);
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

    setStatus('Archivo subido.');
    uploadForm.reset();
    await loadFiles();
  });
}

init();


// Sidebar dashboard tabs
const tabLinks = document.querySelectorAll('[data-tab-link]');
const tabs = document.querySelectorAll('[data-tab]');
function setTab(name){
  tabLinks.forEach((b)=>b.classList.toggle('is-active', b.getAttribute('data-tab-link')===name));
  tabs.forEach((t)=>t.classList.toggle('is-active', t.getAttribute('data-tab')===name));
}
tabLinks.forEach((btn)=>btn.addEventListener('click',()=>setTab(btn.getAttribute('data-tab-link'))));

import { hasSupabaseConfig, supabase, ensureUserProfile, getUserProfile } from '/scripts/supabase-client.js';

const statusEl = document.getElementById('adminStatus');
const appEl = document.getElementById('adminApp');
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const filesList = document.getElementById('filesList');

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function escapeHtml(v) {
  return v.replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
}

async function loadFiles() {
  filesList.textContent = 'Cargando archivos…';
  const { data, error } = await supabase.storage.from('templates').list('', { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
  if (error) {
    filesList.textContent = `Error al listar: ${error.message}`;
    return;
  }
  if (!data || data.length === 0) {
    filesList.textContent = 'No hay archivos aún.';
    return;
  }

  filesList.innerHTML = data
    .filter((f) => f.name)
    .map((f) => `
      <div class="admin-file" data-path="${escapeHtml(f.name)}">
        <div>
          <strong>${escapeHtml(f.name)}</strong><br/>
          <code>storagePath: ${escapeHtml(f.name)}</code>
        </div>
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
      if (error) {
        alert(`No se pudo eliminar: ${error.message}`);
        return;
      }
      loadFiles();
    });
  });
}

async function init() {
  if (!hasSupabaseConfig()) {
    setStatus('Falta configuración.');
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (!data?.session?.user) {
    setStatus('Necesitas iniciar sesión para entrar al panel.');
    return;
  }

  await ensureUserProfile();
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'admin') {
    setStatus('No tienes permisos para este panel.');
    return;
  }

  setStatus('Acceso admin OK');
  appEl.hidden = false;
  await loadFiles();

  uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) return;

    const folder = (folderInput.value || '').trim().replace(/^\/+|\/+$/g, '');
    const safeName = file.name.replace(/\s+/g, '-');
    const path = folder ? `${folder}/${safeName}` : safeName;

    setStatus('Subiendo archivo…');
    const { error } = await supabase.storage.from('templates').upload(path, file, { upsert: true });
    if (error) {
      setStatus(`Error al subir: ${error.message}`);
      return;
    }

    setStatus('Archivo subido.');
    uploadForm.reset();
    await loadFiles();
  });
}

init();

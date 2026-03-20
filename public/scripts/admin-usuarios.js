import { hasSupabaseConfig, supabase, ensureUserProfile, getUserProfile } from '/scripts/supabase-client.js';

const statusEl = document.getElementById('adminUsersStatus');
const appEl = document.getElementById('adminUsersApp');
const usersList = document.getElementById('usersList');

const ROLES = ['cliente_final', 'profesional_reposteria', 'admin'];

function setStatus(t) { if (statusEl) statusEl.textContent = t; }

function roleOptions(current) {
  return ROLES.map((r) => `<option value="${r}" ${r===current?'selected':''}>${r}</option>`).join('');
}

async function loadUsers() {
  usersList.textContent = 'Cargando usuarios…';
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,active')
    .order('full_name', { ascending: true });

  if (error) {
    usersList.textContent = `Error: ${error.message}`;
    return;
  }

  if (!data?.length) {
    usersList.textContent = 'No hay usuarios aún.';
    return;
  }

  usersList.innerHTML = data.map((u) => `
    <div class="user-row" data-id="${u.id}">
      <div class="user-meta">
        <strong>${u.full_name || 'Sin nombre'}</strong>
        <small>${u.email || 'sin email'}</small>
      </div>
      <select class="user-role" data-role>
        ${roleOptions(u.role || 'cliente_final')}
      </select>
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
  await loadUsers();
}

init();

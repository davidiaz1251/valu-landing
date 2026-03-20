import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

const alertBox = document.getElementById('authAlert');
const successBox = document.getElementById('authSuccess');
const resetForm = document.getElementById('resetForm');

const showError = (text) => {
  if (alertBox) { alertBox.textContent = text; alertBox.hidden = false; }
  if (successBox) successBox.hidden = true;
};
const showSuccess = (text) => {
  if (successBox) { successBox.textContent = text; successBox.hidden = false; }
  if (alertBox) alertBox.hidden = true;
};
if (!hasSupabaseConfig()) showError('Falta configurar Supabase en variables de entorno.');

resetForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(resetForm);
  const { error } = await supabase.auth.resetPasswordForEmail(String(formData.get('email')), {
    redirectTo: `${window.location.origin}/login`,
  });
  if (error) return showError('No se pudo enviar el enlace de recuperación.');
  showSuccess('Listo. Si el correo existe, recibirás un enlace de recuperación en unos minutos.');
});

import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

const alertBox = document.getElementById('authAlert');
const registerForm = document.getElementById('registerForm');
const showError = (text) => { if(alertBox){alertBox.textContent=text;alertBox.hidden=false;} };
if (!hasSupabaseConfig()) showError('Falta configurar Supabase en variables de entorno.');

registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const { error } = await supabase.auth.signUp({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
    options: { data: { full_name: String(formData.get('name')) } },
  });
  if (error) return showError('No se pudo crear la cuenta.');
  window.location.href = '/plantillas';
});

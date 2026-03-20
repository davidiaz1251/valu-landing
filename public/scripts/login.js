import { hasSupabaseConfig, supabase } from '/scripts/supabase-client.js';

const alertBox = document.getElementById('authAlert');
const loginForm = document.getElementById('loginForm');
const googleBtn = document.getElementById('googleLogin');
const nextUrl = new URL(window.location.href).searchParams.get('next') || '/plantillas';

const showError = (text) => {
  if (!alertBox) return;
  alertBox.textContent = text;
  alertBox.hidden = false;
};

if (!hasSupabaseConfig()) showError('Falta configurar Supabase en variables de entorno.');

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  });
  if (error) return showError('No se pudo iniciar sesión. Revisa tus datos.');
  window.location.href = nextUrl;
});

googleBtn?.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/plantillas` },
  });
  if (error) showError('No se pudo iniciar sesión con Google.');
});

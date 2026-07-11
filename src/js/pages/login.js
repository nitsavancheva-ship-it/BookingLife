import '../theme.js';
import { renderNavbar } from '../components/navbar.js';
import { supabase } from '../supabaseClient.js';
import { isValidEmail } from '../utils/validators.js';

renderNavbar();

const form = document.getElementById('login-form');
const errorBox = document.getElementById('form-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('d-none');
  form.classList.remove('was-validated');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!isValidEmail(email) || password.length < 6) {
    form.classList.add('was-validated');
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove('d-none');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  const target = redirect ? decodeURIComponent(redirect) : '/index.html';
  // Only follow same-origin relative paths — never external URLs.
  window.location.href = target.startsWith('/') && !target.startsWith('//') && !target.includes('\\') ? target : '/index.html';
});

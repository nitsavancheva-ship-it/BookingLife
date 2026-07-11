import '../theme.js';
import { renderNavbar } from '../components/navbar.js';
import { supabase } from '../supabaseClient.js';
import { isValidEmail, isNonEmpty } from '../utils/validators.js';

renderNavbar();

const form = document.getElementById('register-form');
const errorBox = document.getElementById('form-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('d-none');
  form.classList.remove('was-validated');

  const displayName = document.getElementById('display-name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!isNonEmpty(displayName) || !isValidEmail(email) || password.length < 6) {
    form.classList.add('was-validated');
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove('d-none');
    return;
  }

  window.location.href = '/index.html';
});

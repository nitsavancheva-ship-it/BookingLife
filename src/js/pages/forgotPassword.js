import '../theme.js';
import { renderNavbar } from '../components/navbar.js';
import { supabase } from '../supabaseClient.js';
import { isValidEmail } from '../utils/validators.js';

renderNavbar();

const form = document.getElementById('forgot-form');
const errorBox = document.getElementById('form-error');
const successBox = document.getElementById('form-success');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('d-none');
  form.classList.remove('was-validated');

  const email = document.getElementById('email').value.trim();

  if (!isValidEmail(email)) {
    form.classList.add('was-validated');
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password.html',
  });

  // Don't reveal whether an account exists — treat "not found" as success.
  if (error && !/not.?found/i.test(error.message)) {
    errorBox.textContent = error.message;
    errorBox.classList.remove('d-none');
    return;
  }

  form.classList.add('d-none');
  successBox.classList.remove('d-none');
});

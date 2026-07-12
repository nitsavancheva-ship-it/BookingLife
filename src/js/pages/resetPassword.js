import '../theme.js';
import { renderNavbar } from '../components/navbar.js';
import { supabase } from '../supabaseClient.js';
import { showToast } from '../utils/toast.js';

renderNavbar();

const form = document.getElementById('reset-form');
const errorBox = document.getElementById('form-error');
const invalidLinkBox = document.getElementById('invalid-link');
const submitButton = form.querySelector('button[type="submit"]');

let hasRecoverySession = false;

function enableForm() {
  hasRecoverySession = true;
  submitButton.disabled = false;
}

// supabase-js exchanges the recovery token from the email link automatically
// (detectSessionInUrl). Enable the form once the session is in place.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' || session) enableForm();
});

// Fallback: the token may already have been exchanged before the listener
// was attached. If there is still no session after a short wait, the link
// is invalid or expired.
setTimeout(async () => {
  if (hasRecoverySession) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    enableForm();
    return;
  }
  form.classList.add('d-none');
  invalidLinkBox.classList.remove('d-none');
}, 2000);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.add('d-none');
  form.classList.remove('was-validated');

  const password = document.getElementById('password').value;

  if (password.length < 6) {
    form.classList.add('was-validated');
    return;
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove('d-none');
    return;
  }

  // Sign out so the user re-authenticates with the new password.
  await supabase.auth.signOut();
  showToast('Password updated. Please log in.');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1500);
});

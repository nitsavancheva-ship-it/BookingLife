import '../theme.js';
import { renderNavbar } from '../components/navbar.js';
import { requireAuth, getCurrentRole } from '../auth.js';
import { getProfile, updateProfile, uploadAvatar } from '../services/profiles.js';
import { supabase } from '../supabaseClient.js';
import { showToast } from '../utils/toast.js';

renderNavbar();

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const profile = await getProfile(user.id);
  const role = await getCurrentRole();

  document.getElementById('display-name').value = profile.display_name || '';
  document.getElementById('bio').value = profile.bio || '';
  document.getElementById('role-badge').textContent = role;
  if (profile.avatar_url) {
    document.getElementById('avatar-preview').src = profile.avatar_url;
  }

  document.getElementById('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const updated = await uploadAvatar(user.id, file);
    document.getElementById('avatar-preview').src = updated.avatar_url;
    showToast('Avatar updated.');
  });

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateProfile(user.id, {
      display_name: document.getElementById('display-name').value.trim(),
      bio: document.getElementById('bio').value.trim(),
    });
    showToast('Profile saved.');
  });

  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showToast('Could not update password: ' + error.message, 'error');
      return;
    }
    showToast('Password updated.');
    document.getElementById('password-form').reset();
  });
}

init();

import '../theme.js';
import { renderNavbar } from '../components/navbar.js';
import { requireRole } from '../auth.js';
import { listAllProfiles, setActive } from '../services/profiles.js';
import { setRole } from '../services/roles.js';
import { listProperties, deleteProperty } from '../services/properties.js';
import { listAllBookings, cancelBooking } from '../services/bookings.js';
import { formatDate } from '../utils/dates.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/escape.js';

renderNavbar();

function loadStats(profiles, properties, bookings) {
  document.getElementById('stat-users').textContent = profiles.length;
  document.getElementById('stat-properties').textContent = properties.length;
  document.getElementById('stat-bookings').textContent = bookings.length;
  const reviewCount = properties.reduce((acc, p) => acc + (p.reviews?.length || 0), 0);
  document.getElementById('stat-reviews').textContent = reviewCount;
}

function renderUsers(profiles) {
  const body = document.getElementById('users-table-body');
  body.innerHTML = profiles
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.display_name || '(no name)')}</td>
        <td>
          <select class="form-select form-select-sm role-select" data-user-id="${p.id}">
            <option value="user" ${p.user_roles?.[0]?.role === 'user' ? 'selected' : ''}>user</option>
            <option value="host" ${p.user_roles?.[0]?.role === 'host' ? 'selected' : ''}>host</option>
            <option value="admin" ${p.user_roles?.[0]?.role === 'admin' ? 'selected' : ''}>admin</option>
          </select>
        </td>
        <td>
          <button class="btn btn-sm ${p.is_active ? 'btn-outline-danger' : 'btn-outline-success'} toggle-active-btn" data-user-id="${p.id}" data-active="${p.is_active}">
            ${p.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
        <td></td>
      </tr>`
    )
    .join('');

  body.querySelectorAll('.role-select').forEach((select) => {
    select.addEventListener('change', async () => {
      await setRole(select.dataset.userId, select.value);
      showToast('Role updated.');
    });
  });

  body.querySelectorAll('.toggle-active-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nowActive = btn.dataset.active !== 'true';
      await setActive(btn.dataset.userId, nowActive);
      showToast(nowActive ? 'User activated.' : 'User deactivated.');
      init();
    });
  });
}

function renderProperties(properties) {
  const body = document.getElementById('properties-table-body');
  body.innerHTML = properties
    .map(
      (p) => `
      <tr>
        <td><a href="/property.html?id=${p.id}">${escapeHtml(p.title)}</a></td>
        <td>${escapeHtml(p.city)}</td>
        <td>$${p.price_per_night}</td>
        <td><button class="btn btn-sm btn-outline-danger delete-property-btn" data-id="${p.id}"><i class="bi bi-trash"></i></button></td>
      </tr>`
    )
    .join('');

  body.querySelectorAll('.delete-property-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this property?')) return;
      await deleteProperty(btn.dataset.id);
      showToast('Property deleted.');
      init();
    });
  });
}

function renderBookings(bookings) {
  const body = document.getElementById('bookings-table-body');
  body.innerHTML = bookings
    .map(
      (b) => `
      <tr>
        <td>${escapeHtml(b.properties?.title || '')}</td>
        <td>${escapeHtml(b.profiles?.display_name || '')}</td>
        <td>${formatDate(b.check_in)} &rarr; ${formatDate(b.check_out)}</td>
        <td><span class="badge text-bg-${b.status === 'confirmed' ? 'success' : 'secondary'}">${b.status}</span></td>
        <td>${
          b.status === 'confirmed'
            ? `<button class="btn btn-sm btn-outline-danger cancel-booking-btn" data-id="${b.id}">Cancel</button>`
            : ''
        }</td>
      </tr>`
    )
    .join('');

  body.querySelectorAll('.cancel-booking-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancel this booking?')) return;
      await cancelBooking(btn.dataset.id);
      showToast('Booking cancelled.');
      init();
    });
  });
}

async function init() {
  const user = await requireRole('admin');
  if (!user) return;

  const [profiles, properties, bookings] = await Promise.all([
    listAllProfiles(),
    listProperties(),
    listAllBookings(),
  ]);

  loadStats(profiles, properties, bookings);
  renderUsers(profiles);
  renderProperties(properties);
  renderBookings(bookings);
}

init();

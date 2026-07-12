import '../theme.js';
import { renderNavbar } from '../components/navbar.js';
import { requireRole } from '../auth.js';
import { listPropertiesByOwner, deleteProperty } from '../services/properties.js';
import { listBookingsForProperty } from '../services/bookings.js';
import { getPhotoUrl } from '../services/photos.js';
import { formatDate } from '../utils/dates.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/escape.js';

renderNavbar();

async function renderBookingsAccordion(property) {
  const bookings = await listBookingsForProperty(property.id);
  if (bookings.length === 0) {
    return '<p class="text-muted small mb-0">No bookings yet.</p>';
  }
  return `
    <ul class="list-group list-group-flush">
      ${bookings
        .map(
          (b) => `
        <li class="list-group-item d-flex justify-content-between">
          <span>${escapeHtml(b.profiles?.display_name || 'Guest')} &middot; ${formatDate(b.check_in)} &rarr; ${formatDate(b.check_out)}</span>
          <span class="badge text-bg-${b.status === 'confirmed' ? 'success' : 'secondary'}">${b.status}</span>
        </li>`
        )
        .join('')}
    </ul>`;
}

async function init() {
  const user = await requireRole('host');
  if (!user) return;

  const properties = await listPropertiesByOwner(user.id);
  document.getElementById('loading').classList.add('d-none');

  if (properties.length === 0) {
    document.getElementById('empty-state').classList.remove('d-none');
    return;
  }

  const container = document.getElementById('properties-list');

  for (const property of properties) {
    const cover = property.property_photos?.find((p) => p.is_cover) || property.property_photos?.[0];
    const imageUrl = cover ? getPhotoUrl(cover.storage_path) : 'https://placehold.co/150x150?text=No+Photo';
    const bookingsHtml = await renderBookingsAccordion(property);

    container.insertAdjacentHTML(
      'beforeend',
      `
      <div class="card mb-3">
        <div class="row g-0">
          <div class="col-md-2">
            <img src="${escapeHtml(imageUrl)}" class="img-fluid rounded-start h-100" style="object-fit:cover;" />
          </div>
          <div class="col-md-10">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h5 class="card-title">${escapeHtml(property.title)}</h5>
                  <p class="card-text text-muted mb-1"><i class="bi bi-geo-alt"></i> ${escapeHtml(property.city)} &middot; $${property.price_per_night}/night</p>
                </div>
                <div class="d-flex gap-2">
                  <a href="/property-edit.html?id=${property.id}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></a>
                  <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${property.id}"><i class="bi bi-trash"></i></button>
                </div>
              </div>
              <details class="mt-2">
                <summary class="text-primary" style="cursor:pointer;">Bookings received</summary>
                ${bookingsHtml}
              </details>
            </div>
          </div>
        </div>
      </div>`
    );
  }

  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this property? This cannot be undone.')) return;
      await deleteProperty(btn.dataset.id);
      showToast('Property deleted.');
      btn.closest('.card').remove();
    });
  });
}

init();

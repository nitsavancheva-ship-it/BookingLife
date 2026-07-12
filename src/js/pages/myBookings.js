import '../theme.js';
import { Modal } from 'bootstrap';
import { renderNavbar } from '../components/navbar.js';
import { requireAuth } from '../auth.js';
import { listMyBookings, cancelBooking } from '../services/bookings.js';
import { createReview } from '../services/reviews.js';
import { getPhotoUrl } from '../services/photos.js';
import { formatDate, todayISO } from '../utils/dates.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/escape.js';

renderNavbar();

let reviewModal;
let activeBookingId = null;
let activePropertyId = null;

function renderBookingCard(booking) {
  const property = booking.properties;
  const cover = property?.property_photos?.find((p) => p.is_cover) || property?.property_photos?.[0];
  const imageUrl = cover ? getPhotoUrl(cover.storage_path) : 'https://placehold.co/300x200?text=No+Photo';
  const isPast = booking.check_out < todayISO();
  // reviews.booking_id is unique, so PostgREST embeds this as a single
  // object (or null), not an array.
  const hasReview = Array.isArray(booking.reviews)
    ? booking.reviews.length > 0
    : Boolean(booking.reviews);

  return `
    <div class="col-md-6">
      <div class="card h-100">
        <div class="row g-0">
          <div class="col-4">
            <img src="${escapeHtml(imageUrl)}" class="img-fluid rounded-start h-100" style="object-fit:cover;" />
          </div>
          <div class="col-8">
            <div class="card-body">
              <h5 class="card-title">${escapeHtml(property?.title || 'Property')}</h5>
              <p class="card-text mb-1">${formatDate(booking.check_in)} &rarr; ${formatDate(booking.check_out)}</p>
              <p class="card-text mb-2">$${booking.total_price} <span class="badge text-bg-${booking.status === 'confirmed' ? 'success' : 'secondary'}">${booking.status}</span></p>
              <div class="d-flex gap-2">
                ${
                  booking.status === 'confirmed' && !isPast
                    ? `<button class="btn btn-sm btn-outline-danger cancel-btn" data-id="${booking.id}">Cancel</button>`
                    : ''
                }
                ${
                  booking.status === 'confirmed' && isPast && !hasReview
                    ? `<button class="btn btn-sm btn-outline-primary review-btn" data-id="${booking.id}" data-property-id="${property.id}">Leave a review</button>`
                    : ''
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

async function loadBookings(user) {
  const bookings = await listMyBookings(user.id);
  const list = document.getElementById('bookings-list');
  document.getElementById('loading').classList.add('d-none');
  list.innerHTML = '';

  if (bookings.length === 0) {
    document.getElementById('empty-state').classList.remove('d-none');
    return;
  }

  document.getElementById('empty-state').classList.add('d-none');
  bookings.forEach((booking) => list.insertAdjacentHTML('beforeend', renderBookingCard(booking)));

  list.querySelectorAll('.cancel-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancel this booking?')) return;
      await cancelBooking(btn.dataset.id);
      showToast('Booking cancelled.');
      loadBookings(user);
    });
  });

  list.querySelectorAll('.review-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeBookingId = btn.dataset.id;
      activePropertyId = btn.dataset.propertyId;
      reviewModal.show();
    });
  });
}

async function init() {
  const user = await requireAuth();
  if (!user) return;

  reviewModal = new Modal(document.getElementById('review-modal'));

  document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await createReview({
        property_id: activePropertyId,
        guest_id: user.id,
        booking_id: activeBookingId,
        rating: Number(document.getElementById('review-rating').value),
        comment: document.getElementById('review-comment').value.trim(),
      });
      reviewModal.hide();
      showToast('Review submitted. Thank you!');
      loadBookings(user);
    } catch (error) {
      showToast('Could not submit review: ' + error.message, 'error');
    }
  });

  loadBookings(user);
}

init();

import '../theme.js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../leafletIcon.js';
import { renderNavbar } from '../components/navbar.js';
import { getCurrentUser, getCurrentRole } from '../auth.js';
import { getPropertyById } from '../services/properties.js';
import { getPhotoUrl } from '../services/photos.js';
import { listReviewsForProperty } from '../services/reviews.js';
import { createBooking } from '../services/bookings.js';
import { nightsBetween, calculateTotalPrice, todayISO, formatDate } from '../utils/dates.js';
import { isValidDateRange } from '../utils/validators.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/escape.js';

renderNavbar();

const params = new URLSearchParams(window.location.search);
const propertyId = params.get('id');

if (!propertyId) {
  window.location.href = '/index.html';
}

function renderAmenities(amenities) {
  const container = document.getElementById('property-amenities');
  (amenities || []).forEach((amenity) => {
    container.insertAdjacentHTML('beforeend', `<span class="badge text-bg-light border"><i class="bi bi-check2"></i> ${escapeHtml(amenity)}</span>`);
  });
}

function renderCarousel(photos) {
  const inner = document.getElementById('carousel-inner');
  if (!photos || photos.length === 0) {
    inner.innerHTML = `<div class="carousel-item active"><img src="https://placehold.co/800x400?text=No+Photo" class="d-block w-100" style="max-height:400px;object-fit:cover;" /></div>`;
    return;
  }
  const sorted = [...photos].sort((a, b) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0));
  inner.innerHTML = sorted
    .map(
      (photo, index) => `
      <div class="carousel-item ${index === 0 ? 'active' : ''}">
        <img src="${escapeHtml(getPhotoUrl(photo.storage_path))}" class="d-block w-100" style="max-height:400px;object-fit:cover;" />
      </div>`
    )
    .join('');
}

function renderReviews(reviews) {
  const list = document.getElementById('reviews-list');
  if (reviews.length === 0) {
    list.innerHTML = '<p class="text-muted">No reviews yet.</p>';
    return;
  }
  list.innerHTML = reviews
    .map(
      (review) => `
      <div class="border-bottom py-3">
        <div class="d-flex justify-content-between">
          <strong>${escapeHtml(review.profiles?.display_name || 'Guest')}</strong>
          <span class="text-warning">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
        </div>
        <p class="mb-0 text-muted small">${formatDate(review.created_at)}</p>
        <p class="mb-0">${escapeHtml(review.comment || '')}</p>
      </div>`
    )
    .join('');

  const ratingHeader = document.getElementById('property-rating');
  const avg = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
  ratingHeader.innerHTML = `<i class="bi bi-star-fill text-warning"></i> ${avg} &middot; ${reviews.length} review${reviews.length === 1 ? '' : 's'}`;
}

function updatePriceSummary(pricePerNight) {
  const checkIn = document.getElementById('check-in').value;
  const checkOut = document.getElementById('check-out').value;
  const summary = document.getElementById('price-summary');

  if (!isValidDateRange(checkIn, checkOut)) {
    summary.classList.add('d-none');
    return;
  }

  const nights = nightsBetween(checkIn, checkOut);
  const total = calculateTotalPrice(pricePerNight, checkIn, checkOut);
  document.getElementById('nights-count').textContent = nights;
  document.getElementById('nightly-rate').textContent = pricePerNight;
  document.getElementById('total-price').textContent = total.toFixed(2);
  summary.classList.remove('d-none');
}

async function init() {
  let property;
  try {
    property = await getPropertyById(propertyId);
  } catch {
    document.getElementById('loading').innerHTML =
      '<p class="text-muted"><i class="bi bi-house-x"></i> Property not found.</p>';
    return;
  }
  const reviews = await listReviewsForProperty(propertyId);
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole() : null;

  document.getElementById('loading').classList.add('d-none');
  document.getElementById('property-content').classList.remove('d-none');

  document.title = `BookingLife — ${property.title}`;
  document.getElementById('property-title').textContent = property.title;
  document.getElementById('property-address').textContent = `${property.address ? property.address + ', ' : ''}${property.city}`;
  document.getElementById('property-guests').textContent = property.max_guests;
  document.getElementById('property-bedrooms').textContent = property.bedrooms;
  document.getElementById('property-bathrooms').textContent = property.bathrooms;
  document.getElementById('property-description').textContent = property.description || '';
  document.getElementById('host-name').textContent = property.profiles?.display_name || 'Host';
  document.getElementById('price-per-night').textContent = property.price_per_night;

  renderAmenities(property.amenities);
  renderCarousel(property.property_photos);
  renderReviews(reviews);

  const map = L.map('map', { scrollWheelZoom: false }).setView([property.latitude, property.longitude], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  L.marker([property.latitude, property.longitude]).addTo(map);

  const checkInInput = document.getElementById('check-in');
  const checkOutInput = document.getElementById('check-out');
  checkInInput.min = todayISO();
  checkOutInput.min = todayISO();
  checkInInput.addEventListener('change', () => updatePriceSummary(property.price_per_night));
  checkOutInput.addEventListener('change', () => updatePriceSummary(property.price_per_night));

  if (!user) {
    document.getElementById('booking-widget').classList.add('d-none');
    document.getElementById('login-prompt').classList.remove('d-none');
    document.getElementById('login-prompt-link').href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  } else if (user.id === property.owner_id) {
    document.getElementById('booking-widget').classList.add('d-none');
    document.getElementById('owner-notice').classList.remove('d-none');
  } else if (role !== 'user') {
    // Hosts and admins don't book; only guest accounts can.
    const widget = document.getElementById('booking-widget');
    widget.classList.add('d-none');
    widget.insertAdjacentHTML('afterend', '<p class="text-muted text-center mb-0">Booking is available to guest accounts.</p>');
  } else {
    document.getElementById('booking-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = document.getElementById('booking-error');
      errorBox.classList.add('d-none');

      const checkIn = checkInInput.value;
      const checkOut = checkOutInput.value;

      if (!isValidDateRange(checkIn, checkOut)) {
        errorBox.textContent = 'Check-out must be after check-in.';
        errorBox.classList.remove('d-none');
        return;
      }

      try {
        await createBooking({
          property_id: property.id,
          guest_id: user.id,
          check_in: checkIn,
          check_out: checkOut,
          total_price: calculateTotalPrice(property.price_per_night, checkIn, checkOut),
        });
        showToast('Booking confirmed! You pay at the property on arrival.');
        window.location.href = '/my-bookings.html';
      } catch (error) {
        if (error.code === '23P01') {
          errorBox.textContent = 'Those dates were just booked by someone else. Please pick different dates.';
        } else {
          errorBox.textContent = error.message;
        }
        errorBox.classList.remove('d-none');
      }
    });
  }
}

init();

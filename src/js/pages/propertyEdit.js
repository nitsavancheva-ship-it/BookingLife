import '../theme.js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../leafletIcon.js';
import { renderNavbar } from '../components/navbar.js';
import { requireAuth, getCurrentRole } from '../auth.js';
import { getPropertyById, createProperty, updateProperty } from '../services/properties.js';
import { uploadPropertyPhoto, getPhotoUrl, setCoverPhoto, deletePropertyPhoto } from '../services/photos.js';
import { isNonEmpty, isPositiveNumber } from '../utils/validators.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/escape.js';

renderNavbar();

const AMENITIES = ['WiFi', 'Kitchen', 'Free Parking', 'Pool', 'Air Conditioning', 'Washer', 'TV', 'Pet Friendly'];

const params = new URLSearchParams(window.location.search);
const propertyId = params.get('id');

let marker = null;
let map = null;
let selectedLat = null;
let selectedLng = null;

function renderAmenityCheckboxes(selected = []) {
  const container = document.getElementById('amenities-checkboxes');
  container.innerHTML = AMENITIES.map(
    (amenity) => `
    <div class="form-check">
      <input class="form-check-input amenity-checkbox" type="checkbox" value="${amenity}" id="amenity-${amenity}" ${selected.includes(amenity) ? 'checked' : ''} />
      <label class="form-check-label" for="amenity-${amenity}">${amenity}</label>
    </div>`
  ).join('');
}

function getSelectedAmenities() {
  return [...document.querySelectorAll('.amenity-checkbox:checked')].map((el) => el.value);
}

function initMap(lat = 42.6977, lng = 23.3219, hasPin = false) {
  map = L.map('map').setView([lat, lng], hasPin ? 13 : 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  if (hasPin) {
    marker = L.marker([lat, lng]).addTo(map);
    selectedLat = lat;
    selectedLng = lng;
    document.getElementById('location-hint').textContent = `Selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  map.on('click', (e) => {
    selectedLat = e.latlng.lat;
    selectedLng = e.latlng.lng;
    if (marker) {
      marker.setLatLng(e.latlng);
    } else {
      marker = L.marker(e.latlng).addTo(map);
    }
    document.getElementById('location-hint').textContent = `Selected: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;
  });
}

function renderPhotoGallery(photos) {
  const gallery = document.getElementById('photo-gallery');
  gallery.innerHTML = (photos || [])
    .map(
      (photo) => `
      <div class="position-relative" data-photo-id="${photo.id}">
        <img src="${escapeHtml(getPhotoUrl(photo.storage_path))}" style="width:100px;height:100px;object-fit:cover;border-radius:6px;" class="${photo.is_cover ? 'border border-3 border-primary' : ''}" />
        <div class="d-flex gap-1 mt-1">
          <button type="button" class="btn btn-sm btn-outline-primary set-cover-btn" data-photo-id="${photo.id}">Cover</button>
          <button type="button" class="btn btn-sm btn-outline-danger delete-photo-btn" data-photo-id="${photo.id}" data-storage-path="${escapeHtml(photo.storage_path)}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>`
    )
    .join('');

  gallery.querySelectorAll('.set-cover-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await setCoverPhoto(propertyId, btn.dataset.photoId);
      const property = await getPropertyById(propertyId);
      renderPhotoGallery(property.property_photos);
      showToast('Cover photo updated.');
    });
  });

  gallery.querySelectorAll('.delete-photo-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deletePropertyPhoto(btn.dataset.photoId, btn.dataset.storagePath);
      const property = await getPropertyById(propertyId);
      renderPhotoGallery(property.property_photos);
      showToast('Photo deleted.');
    });
  });
}

async function loadExisting(user) {
  const property = await getPropertyById(propertyId);
  const role = await getCurrentRole();

  if (property.owner_id !== user.id && role !== 'admin') {
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('page-title').innerHTML = '<i class="bi bi-pencil-square"></i> Edit property';
  document.getElementById('title').value = property.title;
  document.getElementById('city').value = property.city;
  document.getElementById('address').value = property.address || '';
  document.getElementById('description').value = property.description || '';
  document.getElementById('price').value = property.price_per_night;
  document.getElementById('max-guests').value = property.max_guests;
  document.getElementById('bedrooms').value = property.bedrooms;
  document.getElementById('bathrooms').value = property.bathrooms;

  renderAmenityCheckboxes(property.amenities || []);
  initMap(property.latitude, property.longitude, true);
  renderPhotoGallery(property.property_photos);

  document.getElementById('photo-input').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      await uploadPropertyPhoto(propertyId, file);
    }
    const updated = await getPropertyById(propertyId);
    renderPhotoGallery(updated.property_photos);
    showToast('Photos uploaded.');
    e.target.value = '';
  });
}

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const role = await getCurrentRole();
  if (role !== 'host' && role !== 'admin') {
    window.location.href = '/index.html';
    return;
  }

  if (propertyId) {
    await loadExisting(user);
  } else {
    renderAmenityCheckboxes();
    initMap();
    document.getElementById('photo-input').disabled = true;
    document.getElementById('photo-input').title = 'Save the property first, then add photos.';
  }

  document.getElementById('property-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('form-error');
    errorBox.classList.add('d-none');

    const title = document.getElementById('title').value.trim();
    const city = document.getElementById('city').value.trim();
    const price = document.getElementById('price').value;
    const maxGuests = document.getElementById('max-guests').value;

    if (!isNonEmpty(title) || !isNonEmpty(city) || !isPositiveNumber(price) || !isPositiveNumber(maxGuests)) {
      errorBox.textContent = 'Please fill in title, city, a positive price, and a positive guest count.';
      errorBox.classList.remove('d-none');
      return;
    }

    if (selectedLat === null || selectedLng === null) {
      errorBox.textContent = 'Please click the map to set the property location.';
      errorBox.classList.remove('d-none');
      return;
    }

    const payload = {
      title,
      city,
      address: document.getElementById('address').value.trim(),
      description: document.getElementById('description').value.trim(),
      price_per_night: Number(price),
      max_guests: Number(maxGuests),
      bedrooms: Number(document.getElementById('bedrooms').value || 0),
      bathrooms: Number(document.getElementById('bathrooms').value || 0),
      amenities: getSelectedAmenities(),
      latitude: selectedLat,
      longitude: selectedLng,
    };

    try {
      if (propertyId) {
        await updateProperty(propertyId, payload);
        showToast('Property updated.');
        window.location.href = `/property.html?id=${propertyId}`;
      } else {
        payload.owner_id = user.id;
        const created = await createProperty(payload);
        showToast('Property created. Now add some photos!');
        window.location.href = `/property-edit.html?id=${created.id}`;
      }
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove('d-none');
    }
  });
}

init();

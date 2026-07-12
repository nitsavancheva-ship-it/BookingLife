import '../theme.js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../leafletIcon.js';
import { renderNavbar } from '../components/navbar.js';
import { listProperties, listCities } from '../services/properties.js';
import { renderPropertyCard } from '../components/propertyCard.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/escape.js';

renderNavbar();

let map;
let markers = [];

function initMap() {
  map = L.map('map').setView([42.6977, 23.3219], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
}

function clearMarkers() {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
}

function plotProperties(properties) {
  clearMarkers();
  properties.forEach((property) => {
    const marker = L.marker([property.latitude, property.longitude]).addTo(map);
    marker.bindPopup(`<a href="/property.html?id=${property.id}">${escapeHtml(property.title)}</a>`);
    markers.push(marker);
  });
}

async function loadCities() {
  const citySelect = document.getElementById('filter-city');
  const cities = await listCities();
  cities.forEach((city) => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });
}

async function loadProperties(filters = {}) {
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const list = document.getElementById('property-list');

  loading.classList.remove('d-none');
  emptyState.classList.add('d-none');
  list.innerHTML = '';

  try {
    const properties = await listProperties(filters);
    loading.classList.add('d-none');

    if (properties.length === 0) {
      emptyState.classList.remove('d-none');
      clearMarkers();
      return;
    }

    properties.forEach((property) => {
      list.insertAdjacentHTML('beforeend', renderPropertyCard(property));
    });
    plotProperties(properties);
  } catch (error) {
    loading.classList.add('d-none');
    showToast('Could not load properties: ' + error.message, 'error');
  }
}

document.getElementById('filter-form').addEventListener('submit', (e) => {
  e.preventDefault();
  loadProperties({
    city: document.getElementById('filter-city').value || undefined,
    minPrice: document.getElementById('filter-min-price').value || undefined,
    maxPrice: document.getElementById('filter-max-price').value || undefined,
    minGuests: document.getElementById('filter-guests').value || undefined,
  });
});

initMap();
loadCities();
loadProperties();

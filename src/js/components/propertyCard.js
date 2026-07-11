import { getPhotoUrl } from '../services/photos.js';

function averageRating(reviews) {
  if (!reviews || reviews.length === 0) return null;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return (sum / reviews.length).toFixed(1);
}

export function renderPropertyCard(property) {
  const cover = property.property_photos?.find((p) => p.is_cover) || property.property_photos?.[0];
  const imageUrl = cover ? getPhotoUrl(cover.storage_path) : 'https://placehold.co/400x300?text=No+Photo';
  const rating = averageRating(property.reviews);

  return `
    <div class="col-md-6">
      <a href="/property.html?id=${property.id}" class="text-decoration-none text-body">
        <div class="card h-100 property-card shadow-sm">
          <img src="${imageUrl}" class="card-img-top" style="height: 180px; object-fit: cover;" alt="${property.title}" />
          <div class="card-body">
            <h5 class="card-title">${property.title}</h5>
            <p class="card-text text-muted mb-1"><i class="bi bi-geo-alt"></i> ${property.city}</p>
            <p class="card-text fw-bold mb-1">$${property.price_per_night} <span class="fw-normal text-muted">/ night</span></p>
            ${rating ? `<p class="card-text"><i class="bi bi-star-fill text-warning"></i> ${rating}</p>` : '<p class="card-text text-muted small">No reviews yet</p>'}
          </div>
        </div>
      </a>
    </div>
  `;
}

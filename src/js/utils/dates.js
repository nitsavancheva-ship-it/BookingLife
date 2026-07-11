export function nightsBetween(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const msPerNight = 1000 * 60 * 60 * 24;
  return Math.round((end - start) / msPerNight);
}

export function calculateTotalPrice(pricePerNight, checkIn, checkOut) {
  const nights = nightsBetween(checkIn, checkOut);
  return Math.round(pricePerNight * nights * 100) / 100;
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

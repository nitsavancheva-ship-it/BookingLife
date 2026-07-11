export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value) {
  const n = Number(value);
  return !Number.isNaN(n) && n > 0;
}

export function isValidDateRange(checkIn, checkOut) {
  if (!checkIn || !checkOut) return false;
  return new Date(checkOut) > new Date(checkIn);
}

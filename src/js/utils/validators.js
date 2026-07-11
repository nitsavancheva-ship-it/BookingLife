export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

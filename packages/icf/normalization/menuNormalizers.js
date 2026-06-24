function normalizeMenuPrice(value) {
  const price = Number(value || 0);
  return Number.isNaN(price) ? 0 : price;
}

export { normalizeMenuPrice };

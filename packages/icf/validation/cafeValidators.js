function validateCafeName(value) {
  return String(value || "").trim().length > 0;
}

export { validateCafeName };

function validateQrCafeId(value) {
  return String(value || "").trim().length > 0;
}

export { validateQrCafeId };

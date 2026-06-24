function validateMenuItemName(value) {
  return String(value || "").trim().length > 0;
}

function validateMenuItemPrice(value) {
  const price = Number(value);
  return !Number.isNaN(price) && price >= 0;
}

export { validateMenuItemName, validateMenuItemPrice };

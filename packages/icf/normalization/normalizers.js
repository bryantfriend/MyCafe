function normalizeEmptyIntent(payload) {
  return payload || {};
}

function normalizeRoleName(role) {
  const value = String(role || "guest").trim();

  if (value === "cafeOwner") {
    return "owner";
  }

  if (value === "circleHost") {
    return "host";
  }

  if (value === "admin" || value === "owner" || value === "host" || value === "user") {
    return value;
  }

  return "guest";
}

export { normalizeEmptyIntent, normalizeRoleName };

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCreateCircleIntent(payload) {
  var normalized = Object.assign({}, payload || {});
  normalized.title = normalizeText(normalized.title);
  normalized.description = normalizeText(normalized.description);
  normalized.hostId = normalizeText(normalized.hostId);
  normalized.hostName = normalizeText(normalized.hostName);
  normalized.status = normalizeText(normalized.status || "upcoming");
  return normalized;
}

function normalizeCircleRsvpIntent(payload) {
  var rsvp = payload.rsvp || {};
  return {
    circleId: normalizeText(payload.circleId),
    rsvp: Object.assign({}, rsvp, {
      name: normalizeText(rsvp.name),
      email: normalizeText(rsvp.email),
      seats: Math.max(1, Number(rsvp.seats || 1)),
      status: normalizeText(rsvp.status || "confirmed")
    })
  };
}

export { normalizeCircleRsvpIntent, normalizeCreateCircleIntent };

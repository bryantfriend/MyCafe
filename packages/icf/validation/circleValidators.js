import { createIntentError } from "../shared/intentErrors.js";

function validateCreateCircleIntent(payload) {
  var errors = [];

  if (!payload || !String(payload.title || "").trim()) {
    errors.push(createIntentError("missing-circle-title", "title", "Circle title is required."));
  }

  if (!payload || !payload.date) {
    errors.push(createIntentError("missing-circle-date", "date", "Circle date is required."));
  }

  return errors;
}

function validateCircleRsvpIntent(payload) {
  var errors = [];
  var rsvp = payload && payload.rsvp ? payload.rsvp : {};

  if (!payload || !payload.circleId) {
    errors.push(createIntentError("missing-circle-id", "circleId", "A Circle id is required."));
  }

  if (!String(rsvp.name || "").trim()) {
    errors.push(createIntentError("missing-rsvp-name", "rsvp.name", "RSVP name is required."));
  }

  if (Number(rsvp.seats || 0) < 1) {
    errors.push(createIntentError("invalid-rsvp-seats", "rsvp.seats", "RSVP seats must be at least 1."));
  }

  return errors;
}

export { validateCircleRsvpIntent, validateCreateCircleIntent };

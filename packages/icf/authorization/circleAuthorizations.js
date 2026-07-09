import { getSeatSummary } from "../../domain/circles/circleMarketplace.js";
import { createIntentError } from "../shared/intentErrors.js";

function authorizeCreateCircle() {
  return [];
}

function authorizeCircleRsvp(payload) {
  var context = payload && payload.context ? payload.context : {};
  var circle = context.circle;
  var seats = Number(payload && payload.rsvp ? payload.rsvp.seats || 1 : 1);
  var seatSummary = circle ? getSeatSummary(circle) : null;

  if (!circle) {
    return [createIntentError("circle-not-found", "circleId", "Circle was not found.")];
  }

  if (seatSummary && seatSummary.seatsLeft !== null && seats > seatSummary.seatsLeft) {
    return [createIntentError("not-enough-seats", "rsvp.seats", "Not enough seats are available for this RSVP.")];
  }

  return [];
}

export { authorizeCircleRsvp, authorizeCreateCircle };

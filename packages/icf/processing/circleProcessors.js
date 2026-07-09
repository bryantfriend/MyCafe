import { addCircleRsvp, createCircle } from "../../domain/circles/circleRepository.js";
import { createProcessResult } from "./processors.js";

async function processCreateCircleIntent(payload) {
  var circleId = await createCircle(payload);
  return createProcessResult("Circle created.", { circleId: circleId });
}

async function processCircleRsvpIntent(payload) {
  var circle = payload.context && payload.context.circle ? payload.context.circle : {};
  var currentCount = Number(circle.rsvpCount || (Array.isArray(circle.rsvp) ? circle.rsvp.length : 0));
  var seats = Number(payload.rsvp && payload.rsvp.seats ? payload.rsvp.seats : 1);
  var rsvpCount = currentCount + seats;

  await addCircleRsvp(payload.circleId, payload.rsvp, rsvpCount);
  return createProcessResult("RSVP saved and synced.", {
    circleId: payload.circleId,
    rsvp: payload.rsvp,
    rsvpCount: rsvpCount
  });
}

const circleProcessors = {
  processCircleRsvpIntent: processCircleRsvpIntent,
  processCreateCircleIntent: processCreateCircleIntent
};

export { circleProcessors, processCircleRsvpIntent, processCreateCircleIntent };

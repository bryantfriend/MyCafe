import { emitIntentResult } from "../emit/emitResult.js";
import { authorizeCircleRsvp, authorizeCreateCircle } from "../authorization/circleAuthorizations.js";
import { addCircleRsvpContext, addCreateCircleContext } from "../context/contexts.js";
import { normalizeCircleRsvpIntent, normalizeCreateCircleIntent } from "../normalization/circleNormalizers.js";
import { processCircleRsvpIntent, processCreateCircleIntent } from "../processing/circleProcessors.js";
import { validateCircleRsvpIntent, validateCreateCircleIntent } from "../validation/circleValidators.js";

const CreateCircleIntent = {
  name: "CreateCircleIntent",
  validate: validateCreateCircleIntent,
  normalize: normalizeCreateCircleIntent,
  addContext: addCreateCircleContext,
  authorize: authorizeCreateCircle,
  process: processCreateCircleIntent,
  emit: emitIntentResult
};

const CircleRsvpIntent = {
  name: "CircleRsvpIntent",
  validate: validateCircleRsvpIntent,
  normalize: normalizeCircleRsvpIntent,
  addContext: addCircleRsvpContext,
  authorize: authorizeCircleRsvp,
  process: processCircleRsvpIntent,
  emit: emitIntentResult
};

const circleIntents = {
  CircleRsvpIntent: CircleRsvpIntent,
  CreateCircleIntent: CreateCircleIntent
};

export { CircleRsvpIntent, CreateCircleIntent, circleIntents };

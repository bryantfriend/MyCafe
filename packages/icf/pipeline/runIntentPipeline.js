import { intentRegistry } from "../intents/intentRegistry.js";
import { emitIntentError } from "../emit/emitError.js";

async function runIntentPipeline(intentName, payload) {
  let intent = null;
  let validatedPayload = payload || {};
  let normalizedPayload = null;
  let contextPayload = null;
  let processResult = null;
  let validationErrors = null;
  let authorizationErrors = null;

  console.log("[ICF] Start", intentName);

  try {
    intent = intentRegistry[intentName];

    if (!intent) {
      return emitIntentError(intentName, "Unknown intent.", [
        {
          code: "unknown-intent",
          field: "intentName",
          message: "No intent is registered for " + intentName + "."
        }
      ]);
    }

    console.log("[ICF] Validate", intentName);
    validationErrors = await intent.validate(validatedPayload);
    if (validationErrors && validationErrors.length) {
      return emitIntentError(intentName, "Validation failed.", validationErrors);
    }

    console.log("[ICF] Normalize", intentName);
    normalizedPayload = await intent.normalize(validatedPayload);

    console.log("[ICF] Add Context", intentName);
    contextPayload = await intent.addContext(normalizedPayload);

    console.log("[ICF] Authorize", intentName);
    authorizationErrors = await intent.authorize(contextPayload);
    if (authorizationErrors && authorizationErrors.length) {
      return emitIntentError(intentName, "Authorization failed.", authorizationErrors);
    }

    console.log("[ICF] Process", intentName);
    processResult = await intent.process(contextPayload);

    console.log("[ICF] Emit Result", intentName);
    return await intent.emit(intentName, processResult);
  } catch (error) {
    console.log("[ICF] Error", intentName, error);
    return emitIntentError(intentName, "Unable to complete " + intentName + ".", [error]);
  }
}

export { runIntentPipeline };

import { intentRegistry } from "../intents/intentRegistry.js";
import { emitIntentError } from "../emit/emitError.js";

const requiredStages = ["validate", "normalize", "addContext", "authorize", "process", "emit"];

function getMissingStages(intent) {
  var missingStages = [];
  var i = 0;

  for (i = 0; i < requiredStages.length; i += 1) {
    var stageName = requiredStages[i];
    if (!intent || typeof intent[stageName] !== "function") {
      missingStages.push(stageName);
    }
  }

  return missingStages;
}

function createArchitectureErrors(missingStages) {
  var errors = [];
  var i = 0;

  for (i = 0; i < missingStages.length; i += 1) {
    errors.push({
      code: "missing-icf-stage",
      field: missingStages[i],
      message: "Intent is missing required ICF stage: " + missingStages[i] + "."
    });
  }

  return errors;
}

async function runIntentPipeline(intentName, payload) {
  var intent = null;
  var validatedPayload = payload || {};
  var normalizedPayload = null;
  var contextPayload = null;
  var processResult = null;
  var validationErrors = null;
  var authorizationErrors = null;
  var missingStages = [];

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

    missingStages = getMissingStages(intent);
    if (missingStages.length) {
      return emitIntentError(intentName, "Intent is not ICF compliant.", createArchitectureErrors(missingStages));
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

export { getMissingStages, runIntentPipeline };

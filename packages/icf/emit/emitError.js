import { createIntentErrorResult } from "../shared/intentResult.js";
import { normalizeIntentError } from "../shared/intentErrors.js";

function emitIntentError(intentName, message, errors) {
  const normalizedErrors = [];
  let i = 0;

  if (errors && errors.length) {
    for (i = 0; i < errors.length; i += 1) {
      normalizedErrors.push(normalizeIntentError(errors[i]));
    }
  }

  if (!normalizedErrors.length) {
    normalizedErrors.push(normalizeIntentError({ message: message }));
  }

  return createIntentErrorResult(intentName, message, normalizedErrors);
}

export { emitIntentError };

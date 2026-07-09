import { createIntentResult } from "../shared/intentResult.js";

function emitIntentResult(intentName, processResult) {
  const result = processResult || {};
  return createIntentResult(
    intentName,
    result.message || "Intent completed.",
    result.data || {}
  );
}

export { emitIntentResult };

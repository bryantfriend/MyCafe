function createIntentResult(intentName, message, data) {
  return {
    ok: true,
    intentName: intentName,
    message: message || "Intent completed.",
    data: data || {},
    errors: []
  };
}

function createIntentErrorResult(intentName, message, errors) {
  return {
    ok: false,
    intentName: intentName,
    message: message || "Unable to complete intent.",
    data: null,
    errors: errors || []
  };
}

export { createIntentResult, createIntentErrorResult };

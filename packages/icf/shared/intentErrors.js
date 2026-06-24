function createIntentError(code, field, message) {
  return {
    code: code,
    field: field || "",
    message: message || "The request could not be completed."
  };
}

function normalizeIntentError(error) {
  if (error && error.code && error.message) {
    return createIntentError(error.code, error.field, error.message);
  }

  return createIntentError(
    "unexpected-error",
    "",
    error && error.message ? error.message : "Unexpected error."
  );
}

export { createIntentError, normalizeIntentError };

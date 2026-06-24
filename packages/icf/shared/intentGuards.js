import { createIntentError } from "./intentErrors.js";

function requireField(payload, field, message) {
  if (!payload || payload[field] === undefined || payload[field] === null || payload[field] === "") {
    return createIntentError("validation-required", field, message);
  }

  return null;
}

function compactErrors(errors) {
  const compacted = [];
  let i = 0;

  for (i = 0; i < errors.length; i += 1) {
    if (errors[i]) {
      compacted.push(errors[i]);
    }
  }

  return compacted;
}

export { requireField, compactErrors };

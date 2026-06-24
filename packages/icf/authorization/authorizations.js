import { createIntentError } from "../shared/intentErrors.js";

function authorizeAuthenticated(payload) {
  const context = payload && payload.context ? payload.context : {};

  if (!context.currentUserId) {
    return [
      createIntentError(
        "auth-required",
        "currentUser",
        "You must sign in before using this feature."
      )
    ];
  }

  return [];
}

export { authorizeAuthenticated };

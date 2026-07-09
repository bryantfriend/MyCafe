import { createIntentError } from "../shared/intentErrors.js";

function authorizeUserIntent(payload) {
  var context = payload && payload.context ? payload.context : {};

  if (!context.currentUserId) {
    return [
      createIntentError("auth-required", "currentUser", "You must sign in before updating this account.")
    ];
  }

  if (context.isAdmin) {
    return [];
  }

  if (context.currentUserId === context.targetUserId) {
    return [];
  }

  return [
    createIntentError("wrong-user", "userId", "You can only update your own account.")
  ];
}

export { authorizeUserIntent };

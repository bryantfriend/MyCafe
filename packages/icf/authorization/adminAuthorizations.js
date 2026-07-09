import { createIntentError } from "../shared/intentErrors.js";

function authorizeAdminIntent(payload) {
  var context = payload && payload.context ? payload.context : {};

  if (!context.currentUserId) {
    return [createIntentError("auth-required", "currentUser", "Sign in before using admin tools.")];
  }

  if (!context.isAdmin) {
    return [createIntentError("permission-denied", "role", "Only admins can perform this action.")];
  }

  return [];
}

function authorizeLoadAdminDashboardIntent(payload) {
  var context = payload && payload.context ? payload.context : {};

  if (!context.currentUserId) {
    return [
      createIntentError(
        "auth-required",
        "currentUser",
        "Sign in to open the admin panel."
      )
    ];
  }

  if (!context.isAdmin) {
    return [
      createIntentError(
        "permission-denied",
        "role",
        "Only admins can load the admin dashboard."
      )
    ];
  }

  return [];
}

export { authorizeAdminIntent, authorizeLoadAdminDashboardIntent };

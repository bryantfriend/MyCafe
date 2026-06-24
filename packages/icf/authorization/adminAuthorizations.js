import { createIntentError } from "../shared/intentErrors.js";

function authorizeLoadAdminDashboardIntent(payload) {
  const context = payload && payload.context ? payload.context : {};

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

export { authorizeLoadAdminDashboardIntent };

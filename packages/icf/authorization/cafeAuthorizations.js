import { createIntentError } from "../shared/intentErrors.js";

function cafeHasExtraAdmin(cafe, userId) {
  var admins = cafe && Array.isArray(cafe.extraAdmins) ? cafe.extraAdmins : [];
  return admins.indexOf(userId) >= 0;
}

function authorizeCafeOwner(payload) {
  var context = payload && payload.context ? payload.context : {};
  var cafe = context.cafe;
  var userId = context.currentUserId || "";

  if (!cafe) {
    return [
      createIntentError("cafe-not-found", "cafeId", "Cafe was not found.")
    ];
  }

  if (!userId) {
    return [
      createIntentError("auth-required", "currentUser", "You must sign in before editing this cafe.")
    ];
  }

  if (context.isAdmin) {
    return [];
  }

  if (cafe.ownerId === userId || cafeHasExtraAdmin(cafe, userId)) {
    return [];
  }

  return [
    createIntentError("not-cafe-owner", "currentUser", "Only this cafe owner or an admin can make this change.")
  ];
}

export { authorizeCafeOwner };

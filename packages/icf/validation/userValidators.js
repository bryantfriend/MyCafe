import { createIntentError } from "../shared/intentErrors.js";

function validateUserNickname(value) {
  return String(value || "").trim().length > 0;
}

function validateRequiredUserId(payload) {
  var errors = [];

  if (!payload || !payload.userId) {
    errors.push(createIntentError("missing-user-id", "userId", "A user id is required."));
  }

  return errors;
}

function validateUpdateUserProfileIntent(payload) {
  var errors = validateRequiredUserId(payload);
  var profile = payload && payload.profile ? payload.profile : {};

  if (!validateUserNickname(profile.nickname)) {
    errors.push(createIntentError("missing-nickname", "profile.nickname", "Nickname is required."));
  }

  return errors;
}

function validateRegisterUserProfileIntent(payload) {
  var errors = validateRequiredUserId(payload);
  var profile = payload && payload.profile ? payload.profile : {};

  if (!validateUserNickname(profile.nickname)) {
    errors.push(createIntentError("missing-nickname", "profile.nickname", "Nickname is required."));
  }

  if (!String(profile.email || "").trim()) {
    errors.push(createIntentError("missing-email", "profile.email", "Email is required."));
  }

  return errors;
}

function validateUpdateUserFavoritesIntent(payload) {
  var errors = validateRequiredUserId(payload);

  if (!payload || !Array.isArray(payload.favorites)) {
    errors.push(createIntentError("invalid-favorites", "favorites", "Favorites must be an array."));
  }

  return errors;
}

function validateSyncUserLoyaltyIntent(payload) {
  var errors = validateRequiredUserId(payload);

  if (!payload || !payload.loyaltyPatch || typeof payload.loyaltyPatch !== "object") {
    errors.push(createIntentError("invalid-loyalty-patch", "loyaltyPatch", "A loyalty patch is required."));
  }

  return errors;
}

export {
  validateRegisterUserProfileIntent,
  validateSyncUserLoyaltyIntent,
  validateUpdateUserFavoritesIntent,
  validateUpdateUserProfileIntent,
  validateUserNickname
};

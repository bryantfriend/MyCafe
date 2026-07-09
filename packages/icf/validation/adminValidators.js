import { validateMenuOrderLinks } from "./cafeValidators.js";
import { createIntentError } from "../shared/intentErrors.js";

function validateLoadAdminDashboardIntent() {
  return [];
}

function validateAdminUpdateCafeIntent(payload) {
  var errors = [];
  if (!payload || !payload.cafeId) {
    errors.push(createIntentError("missing-cafe-id", "cafeId", "A cafe id is required."));
  }
  if (!payload || !payload.cafePatch || typeof payload.cafePatch !== "object") {
    errors.push(createIntentError("invalid-cafe-patch", "cafePatch", "A cafe patch is required."));
    return errors;
  }
  if (Array.isArray(payload.cafePatch.menu)) {
    validateMenuOrderLinks(errors, payload.cafePatch.menu);
  }
  return errors;
}

function validateAdminUpdateCircleIntent(payload) {
  var errors = [];
  if (!payload || !payload.circleId) {
    errors.push(createIntentError("missing-circle-id", "circleId", "A Circle id is required."));
  }
  if (!payload || !payload.circlePatch || typeof payload.circlePatch !== "object") {
    errors.push(createIntentError("invalid-circle-patch", "circlePatch", "A Circle patch is required."));
  }
  return errors;
}

function validateAdminUpdateReviewIntent(payload) {
  var errors = [];
  if (!payload || !payload.reviewId) {
    errors.push(createIntentError("missing-review-id", "reviewId", "A review id is required."));
  }
  if (!payload || !payload.reviewPatch || typeof payload.reviewPatch !== "object") {
    errors.push(createIntentError("invalid-review-patch", "reviewPatch", "A review patch is required."));
  }
  return errors;
}

function validateAdminDeleteReviewIntent(payload) {
  var errors = [];
  if (!payload || !payload.reviewId) {
    errors.push(createIntentError("missing-review-id", "reviewId", "A review id is required."));
  }
  return errors;
}

function validateAdminSaveUserIntent(payload) {
  var errors = [];
  if (!payload || !payload.userData || typeof payload.userData !== "object") {
    errors.push(createIntentError("invalid-user-data", "userData", "User data is required."));
  }
  if (payload && payload.mode !== "add" && payload.mode !== "edit") {
    errors.push(createIntentError("invalid-user-mode", "mode", "User save mode must be add or edit."));
  }
  if (payload && payload.mode === "edit" && !payload.userId) {
    errors.push(createIntentError("missing-user-id", "userId", "A user id is required when editing."));
  }
  return errors;
}

function validateAdminDeleteUserIntent(payload) {
  var errors = [];
  if (!payload || !payload.userId) {
    errors.push(createIntentError("missing-user-id", "userId", "A user id is required."));
  }
  return errors;
}

export {
  validateAdminDeleteReviewIntent,
  validateAdminDeleteUserIntent,
  validateAdminSaveUserIntent,
  validateAdminUpdateCafeIntent,
  validateAdminUpdateCircleIntent,
  validateAdminUpdateReviewIntent,
  validateLoadAdminDashboardIntent
};

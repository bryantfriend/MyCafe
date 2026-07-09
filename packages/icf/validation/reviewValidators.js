import { createIntentError } from "../shared/intentErrors.js";

function validateReviewRating(value) {
  var rating = Number(value);
  return rating >= 1 && rating <= 5;
}

function validateSubmitCafeReviewIntent(payload) {
  var errors = [];

  if (!payload || !payload.cafeId) {
    errors.push(createIntentError("missing-cafe-id", "cafeId", "A cafe id is required."));
  }

  if (!validateReviewRating(payload ? payload.rating : 0)) {
    errors.push(createIntentError("invalid-rating", "rating", "Review rating must be from 1 to 5."));
  }

  if (!payload || !String(payload.text || "").trim()) {
    errors.push(createIntentError("missing-review-text", "text", "Review text is required."));
  }

  return errors;
}

function validateUpdateReviewOwnerResponseIntent(payload) {
  var errors = [];

  if (!payload || !payload.reviewId) {
    errors.push(createIntentError("missing-review-id", "reviewId", "A review id is required."));
  }

  if (!payload || payload.action !== "reply" && payload.action !== "flag") {
    errors.push(createIntentError("invalid-review-action", "action", "Review owner action must be reply or flag."));
  }

  return errors;
}

function validateEditReviewWithTokenIntent(payload) {
  var errors = [];

  if (!payload || !payload.reviewId) {
    errors.push(createIntentError("missing-review-id", "reviewId", "A review id is required."));
  }

  if (!payload || !payload.editToken) {
    errors.push(createIntentError("missing-edit-token", "editToken", "An edit token is required."));
  }

  if (!validateReviewRating(payload ? payload.rating : 0)) {
    errors.push(createIntentError("invalid-rating", "rating", "Review rating must be from 1 to 5."));
  }

  if (!payload || !String(payload.text || "").trim()) {
    errors.push(createIntentError("missing-review-text", "text", "Review text is required."));
  }

  return errors;
}

export {
  validateEditReviewWithTokenIntent,
  validateReviewRating,
  validateSubmitCafeReviewIntent,
  validateUpdateReviewOwnerResponseIntent
};

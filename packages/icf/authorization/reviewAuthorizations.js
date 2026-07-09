import { authorizeCafeOwner } from "./cafeAuthorizations.js";
import { createIntentError } from "../shared/intentErrors.js";

function authorizeSubmitCafeReview(payload) {
  var context = payload && payload.context ? payload.context : {};

  if (!context.cafe) {
    return [
      createIntentError("cafe-not-found", "cafeId", "Cafe was not found.")
    ];
  }

  if (context.currentUserStatus === "banned") {
    return [
      createIntentError("reviewer-banned", "currentUser", "This account cannot submit reviews.")
    ];
  }

  return [];
}

function authorizeUpdateReviewOwnerResponse(payload) {
  var context = payload && payload.context ? payload.context : {};

  if (!context.review) {
    return [
      createIntentError("review-not-found", "reviewId", "Review was not found.")
    ];
  }

  return authorizeCafeOwner(payload);
}

function authorizeEditReviewWithToken(payload) {
  var context = payload && payload.context ? payload.context : {};
  var review = context.review;

  if (!review) {
    return [createIntentError("review-not-found", "reviewId", "Review was not found.")];
  }

  if (review.editToken !== payload.editToken) {
    return [createIntentError("invalid-edit-token", "editToken", "This edit link is not valid for that review.")];
  }

  return [];
}

export {
  authorizeEditReviewWithToken,
  authorizeSubmitCafeReview,
  authorizeUpdateReviewOwnerResponse
};

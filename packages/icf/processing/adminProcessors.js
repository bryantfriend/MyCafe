import { updateCafe } from "../../domain/cafes/cafeRepository.js";
import { updateCircle } from "../../domain/circles/circleRepository.js";
import { getReviewAlertSummary } from "../../domain/reviews/reviewService.js";
import { deleteReview, updateReview } from "../../domain/reviews/reviewRepository.js";
import {
  createUserProfile,
  deleteUserProfile,
  incrementUserReviewTrust,
  updateUserProfile
} from "../../domain/users/userRepository.js";
import { createProcessResult } from "./processors.js";

async function processLoadAdminDashboardIntent(payload) {
  var reviewAlerts = await getReviewAlertSummary();
  var context = payload && payload.context ? payload.context : {};

  return {
    message: "Admin dashboard loaded.",
    data: {
      currentUser: context.currentUserSummary,
      reviewAlerts: reviewAlerts
    }
  };
}

async function processAdminUpdateCafeIntent(payload) {
  await updateCafe(payload.cafeId, payload.cafePatch);
  return createProcessResult("Cafe saved.", { cafeId: payload.cafeId });
}

async function processAdminUpdateCircleIntent(payload) {
  await updateCircle(payload.circleId, payload.circlePatch);
  return createProcessResult("Circle saved.", { circleId: payload.circleId });
}

async function processAdminUpdateReviewIntent(payload) {
  await updateReview(payload.reviewId, payload.reviewPatch);
  if (payload.awardTrust && payload.reviewUserId) {
    await incrementUserReviewTrust(payload.reviewUserId);
  }
  return createProcessResult("Review saved.", { reviewId: payload.reviewId });
}

async function processAdminDeleteReviewIntent(payload) {
  await deleteReview(payload.reviewId);
  return createProcessResult("Review deleted.", { reviewId: payload.reviewId });
}

async function processAdminSaveUserIntent(payload) {
  var userId = payload.userId;
  if (payload.mode === "add") {
    userId = await createUserProfile(payload.userData);
  } else {
    await updateUserProfile(userId, payload.userData);
  }
  return createProcessResult("User saved.", { userId: userId });
}

async function processAdminDeleteUserIntent(payload) {
  await deleteUserProfile(payload.userId);
  return createProcessResult("User deleted.", { userId: payload.userId });
}

export {
  processAdminDeleteReviewIntent,
  processAdminDeleteUserIntent,
  processAdminSaveUserIntent,
  processAdminUpdateCafeIntent,
  processAdminUpdateCircleIntent,
  processAdminUpdateReviewIntent,
  processLoadAdminDashboardIntent
};

import { createReviewEditToken, evaluateReviewTrust } from "../../domain/reviews/reviewTrust.js";
import { createReview, updateReview } from "../../domain/reviews/reviewRepository.js";
import { createProcessResult } from "./processors.js";

async function processSubmitCafeReviewIntent(payload) {
  var context = payload.context || {};
  var editToken = createReviewEditToken();
  var review = {
    cafeId: payload.cafeId,
    cafeName: payload.cafeName || (context.cafe ? context.cafe.name : ""),
    userId: context.currentUserId || payload.userId || "",
    name: payload.name,
    email: payload.email,
    rating: payload.rating,
    imageUrl: payload.imageUrl,
    text: payload.text,
    language: payload.language,
    approved: false,
    flagged: false,
    editToken: editToken,
    createdAt: new Date()
  };
  var trustResult = evaluateReviewTrust(review, context.currentUserProfile, payload.recentReviewContext || {});
  var reviewId = "";

  Object.assign(review, trustResult);
  reviewId = await createReview(review);

  return createProcessResult(review.approved ? "Review published automatically." : "Review sent for approval.", {
    reviewId: reviewId,
    editToken: editToken,
    approved: review.approved,
    rating: review.rating,
    hasPhoto: Boolean(review.imageUrl),
    review: review
  });
}

async function processUpdateReviewOwnerResponseIntent(payload) {
  var update = {};

  if (payload.action === "reply") {
    update.ownerReply = payload.ownerReply;
    update.ownerReplyUpdatedAt = new Date();
  }

  if (payload.action === "flag") {
    update.flagged = true;
    update.flagReason = "Flagged by cafe owner";
    update.ownerFlaggedForAdmin = true;
  }

  await updateReview(payload.reviewId, update);
  return createProcessResult(payload.action === "reply" ? "Owner reply saved." : "Review flagged for admin.", {
    reviewId: payload.reviewId,
    action: payload.action
  });
}

async function processEditReviewWithTokenIntent(payload) {
  await updateReview(payload.reviewId, {
    name: payload.name,
    rating: payload.rating,
    imageUrl: payload.imageUrl,
    text: payload.text,
    approved: false,
    flagged: false,
    moderationStatus: "pending-edit",
    editedAt: new Date()
  });

  return createProcessResult("Review changes saved and sent for moderation.", {
    reviewId: payload.reviewId
  });
}

const reviewProcessors = {
  processEditReviewWithTokenIntent: processEditReviewWithTokenIntent,
  processSubmitCafeReviewIntent: processSubmitCafeReviewIntent,
  processUpdateReviewOwnerResponseIntent: processUpdateReviewOwnerResponseIntent
};

export {
  processEditReviewWithTokenIntent,
  processSubmitCafeReviewIntent,
  processUpdateReviewOwnerResponseIntent,
  reviewProcessors
};

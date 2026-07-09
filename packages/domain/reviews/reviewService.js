import {
  deleteReview,
  listReviews,
  listReviewsByUserId,
  updateReview
} from "./reviewRepository.js";

async function getReviewAlertSummary() {
  const reviews = await listReviews();
  let flaggedCount = 0;
  let pendingCount = 0;
  let i = 0;
  let review = null;

  for (i = 0; i < reviews.length; i += 1) {
    review = reviews[i];
    if (review.flagged) {
      flaggedCount += 1;
    }
    if (!review.approved) {
      pendingCount += 1;
    }
  }

  return {
    flaggedCount: flaggedCount,
    pendingCount: pendingCount
  };
}

export {
  deleteReview,
  getReviewAlertSummary,
  listReviews,
  listReviewsByUserId,
  updateReview
};

import { getReviewById } from "../../domain/reviews/reviewRepository.js";

async function addReviewEditContext(payload) {
  var contextPayload = Object.assign({}, payload || {});
  var context = Object.assign({}, contextPayload.context || {});
  context.review = contextPayload.reviewId ? await getReviewById(contextPayload.reviewId) : null;
  contextPayload.context = context;
  return contextPayload;
}

export { addReviewEditContext };

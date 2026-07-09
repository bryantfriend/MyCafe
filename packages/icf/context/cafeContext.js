import { getCafeById } from "../../domain/cafes/cafeRepository.js";
import { getReviewById } from "../../domain/reviews/reviewRepository.js";
import { addAuthContext } from "./authContext.js";
import { addRoleContext } from "./roleContext.js";

async function addCafeOwnerContext(payload) {
  var contextPayload = await addAuthContext(payload);
  contextPayload = addRoleContext(contextPayload);
  var context = Object.assign({}, contextPayload.context || {});
  context.cafe = await getCafeById(contextPayload.cafeId);
  context.cafeId = contextPayload.cafeId;
  contextPayload.context = context;
  return contextPayload;
}

async function addReviewSubmissionContext(payload) {
  var contextPayload = await addAuthContext(payload);
  contextPayload = addRoleContext(contextPayload);
  var context = Object.assign({}, contextPayload.context || {});
  context.cafe = await getCafeById(contextPayload.cafeId);
  context.cafeId = contextPayload.cafeId;
  contextPayload.context = context;
  return contextPayload;
}

async function addReviewOwnerResponseContext(payload) {
  var contextPayload = await addAuthContext(payload);
  contextPayload = addRoleContext(contextPayload);
  var context = Object.assign({}, contextPayload.context || {});
  context.review = await getReviewById(contextPayload.reviewId);
  context.cafeId = context.review ? context.review.cafeId : "";
  context.cafe = context.cafeId ? await getCafeById(context.cafeId) : null;
  contextPayload.context = context;
  return contextPayload;
}

export {
  addCafeOwnerContext,
  addReviewOwnerResponseContext,
  addReviewSubmissionContext
};

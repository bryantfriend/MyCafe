import { emitIntentResult } from "../emit/emitResult.js";
import { authorizeEditReviewWithToken, authorizeSubmitCafeReview, authorizeUpdateReviewOwnerResponse } from "../authorization/reviewAuthorizations.js";
import { addReviewEditContext, addReviewOwnerResponseContext, addReviewSubmissionContext } from "../context/contexts.js";
import { normalizeEditReviewWithTokenIntent, normalizeSubmitCafeReviewIntent, normalizeUpdateReviewOwnerResponseIntent } from "../normalization/reviewNormalizers.js";
import { processEditReviewWithTokenIntent, processSubmitCafeReviewIntent, processUpdateReviewOwnerResponseIntent } from "../processing/reviewProcessors.js";
import { validateEditReviewWithTokenIntent, validateSubmitCafeReviewIntent, validateUpdateReviewOwnerResponseIntent } from "../validation/reviewValidators.js";

const SubmitCafeReviewIntent = {
  name: "SubmitCafeReviewIntent",
  validate: validateSubmitCafeReviewIntent,
  normalize: normalizeSubmitCafeReviewIntent,
  addContext: addReviewSubmissionContext,
  authorize: authorizeSubmitCafeReview,
  process: processSubmitCafeReviewIntent,
  emit: emitIntentResult
};

const UpdateReviewOwnerResponseIntent = {
  name: "UpdateReviewOwnerResponseIntent",
  validate: validateUpdateReviewOwnerResponseIntent,
  normalize: normalizeUpdateReviewOwnerResponseIntent,
  addContext: addReviewOwnerResponseContext,
  authorize: authorizeUpdateReviewOwnerResponse,
  process: processUpdateReviewOwnerResponseIntent,
  emit: emitIntentResult
};

const EditReviewWithTokenIntent = {
  name: "EditReviewWithTokenIntent",
  validate: validateEditReviewWithTokenIntent,
  normalize: normalizeEditReviewWithTokenIntent,
  addContext: addReviewEditContext,
  authorize: authorizeEditReviewWithToken,
  process: processEditReviewWithTokenIntent,
  emit: emitIntentResult
};

const reviewIntents = {
  EditReviewWithTokenIntent: EditReviewWithTokenIntent,
  SubmitCafeReviewIntent: SubmitCafeReviewIntent,
  UpdateReviewOwnerResponseIntent: UpdateReviewOwnerResponseIntent
};

export {
  EditReviewWithTokenIntent,
  SubmitCafeReviewIntent,
  UpdateReviewOwnerResponseIntent,
  reviewIntents
};

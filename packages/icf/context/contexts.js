import { addAuthContext } from "./authContext.js";
import { addCafeOwnerContext, addReviewOwnerResponseContext, addReviewSubmissionContext } from "./cafeContext.js";
import { addCircleRsvpContext, addCreateCircleContext } from "./circleContext.js";
import { addReviewEditContext } from "./reviewContext.js";
import { addRoleContext } from "./roleContext.js";
import { addUserAccountContext } from "./userContext.js";

async function addAdminDashboardContext(payload) {
  var authPayload = await addAuthContext(payload);
  return addRoleContext(authPayload);
}

export {
  addAdminDashboardContext,
  addAuthContext,
  addCafeOwnerContext,
  addCircleRsvpContext,
  addCreateCircleContext,
  addReviewEditContext,
  addReviewOwnerResponseContext,
  addReviewSubmissionContext,
  addRoleContext,
  addUserAccountContext
};

import { getUserById } from "../../domain/users/userService.js";
import { addAuthContext } from "./authContext.js";
import { addRoleContext } from "./roleContext.js";

async function addUserAccountContext(payload) {
  var contextPayload = await addAuthContext(payload);
  contextPayload = addRoleContext(contextPayload);
  var context = Object.assign({}, contextPayload.context || {});
  context.targetUserId = contextPayload.userId;
  context.targetUserProfile = context.targetUserId ? await getUserById(context.targetUserId) : null;
  contextPayload.context = context;
  return contextPayload;
}

export { addUserAccountContext };

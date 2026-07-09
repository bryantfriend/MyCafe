import { getCircleById } from "../../domain/circles/circleRepository.js";
import { addAuthContext } from "./authContext.js";
import { addRoleContext } from "./roleContext.js";

async function addCreateCircleContext(payload) {
  var contextPayload = await addAuthContext(payload);
  contextPayload = addRoleContext(contextPayload);
  return contextPayload;
}

async function addCircleRsvpContext(payload) {
  var contextPayload = await addAuthContext(payload);
  contextPayload = addRoleContext(contextPayload);
  var context = Object.assign({}, contextPayload.context || {});
  context.circle = contextPayload.circleId ? await getCircleById(contextPayload.circleId) : null;
  contextPayload.context = context;
  return contextPayload;
}

export { addCircleRsvpContext, addCreateCircleContext };

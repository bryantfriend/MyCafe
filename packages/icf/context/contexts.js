import { addAuthContext } from "./authContext.js";
import { addRoleContext } from "./roleContext.js";

async function addAdminDashboardContext(payload) {
  const authPayload = await addAuthContext(payload);
  return addRoleContext(authPayload);
}

export { addAdminDashboardContext, addAuthContext, addRoleContext };

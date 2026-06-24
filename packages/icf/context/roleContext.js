function addRoleContext(payload) {
  const contextPayload = Object.assign({}, payload || {});
  const context = Object.assign({}, contextPayload.context || {});
  const role = context.currentUserRole || "guest";

  context.isAdmin = role === "admin";
  context.isOwner = role === "owner";
  context.isHost = role === "host";
  context.isGuest = !context.currentUserId;

  contextPayload.context = context;
  return contextPayload;
}

export { addRoleContext };

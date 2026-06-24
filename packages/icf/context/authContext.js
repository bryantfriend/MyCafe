import {
  getCurrentAuthenticatedUser,
  getUserById,
  getPublicUserSummary,
  normalizeRoleName
} from "../../domain/users/userService.js";

async function addAuthContext(payload) {
  const contextPayload = Object.assign({}, payload || {});
  const currentUser = await getCurrentAuthenticatedUser();
  let profile = null;
  let role = "guest";
  let status = "active";

  if (currentUser && currentUser.uid) {
    profile = await getUserById(currentUser.uid);
    if (profile && profile.role) {
      role = normalizeRoleName(profile.role);
    }
    if (profile && profile.flagged) {
      status = "banned";
    }
  }

  contextPayload.context = Object.assign({}, contextPayload.context || {}, {
    currentUser: currentUser,
    currentUserId: currentUser && currentUser.uid ? currentUser.uid : "",
    currentUserRole: role,
    currentUserStatus: status,
    currentUserProfile: profile,
    currentUserSummary: currentUser ? getPublicUserSummary(currentUser, profile) : null,
    isAdmin: role === "admin",
    isOwner: role === "owner",
    isHost: role === "host",
    isGuest: !currentUser
  });

  return contextPayload;
}

export { addAuthContext };

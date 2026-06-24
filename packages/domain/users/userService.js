import {
  createUserProfile,
  deleteUserProfile,
  getCurrentAuthenticatedUser,
  getUserById,
  listUsers,
  sendPasswordReset,
  signOutCurrentUser,
  updateUserProfile
} from "./userRepository.js";

function normalizeRoleName(role) {
  const value = String(role || "guest").trim();

  if (value === "cafeOwner") {
    return "owner";
  }

  if (value === "circleHost") {
    return "host";
  }

  if (value === "admin" || value === "owner" || value === "host" || value === "user") {
    return value;
  }

  return "guest";
}

function getPublicUserSummary(user, profile) {
  return {
    id: user && user.uid ? user.uid : "",
    nickname: profile && profile.nickname ? profile.nickname : "",
    role: profile && profile.role ? normalizeRoleName(profile.role) : "guest",
    status: profile && profile.flagged ? "banned" : "active"
  };
}

export {
  createUserProfile,
  deleteUserProfile,
  getCurrentAuthenticatedUser,
  getPublicUserSummary,
  getUserById,
  listUsers,
  normalizeRoleName,
  sendPasswordReset,
  signOutCurrentUser,
  updateUserProfile
};

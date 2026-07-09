import { mergeUserProfile } from "../../domain/users/userRepository.js";
import { createProcessResult } from "./processors.js";

async function processRegisterUserProfileIntent(payload) {
  await mergeUserProfile(payload.userId, payload.profile);
  return createProcessResult("Account profile created.", { userId: payload.userId, profile: payload.profile });
}

async function processUpdateUserProfileIntent(payload) {
  await mergeUserProfile(payload.userId, payload.profile);
  return createProcessResult("Profile saved.", { userId: payload.userId, profile: payload.profile });
}

async function processUpdateUserFavoritesIntent(payload) {
  await mergeUserProfile(payload.userId, { favorites: payload.favorites });
  return createProcessResult("Favorites saved.", { userId: payload.userId, favorites: payload.favorites });
}

async function processSyncUserLoyaltyIntent(payload) {
  await mergeUserProfile(payload.userId, payload.loyaltyPatch);
  return createProcessResult("Loyalty synced.", { userId: payload.userId, loyaltyPatch: payload.loyaltyPatch });
}

const userProcessors = {
  processRegisterUserProfileIntent: processRegisterUserProfileIntent,
  processSyncUserLoyaltyIntent: processSyncUserLoyaltyIntent,
  processUpdateUserFavoritesIntent: processUpdateUserFavoritesIntent,
  processUpdateUserProfileIntent: processUpdateUserProfileIntent
};

export {
  processRegisterUserProfileIntent,
  processSyncUserLoyaltyIntent,
  processUpdateUserFavoritesIntent,
  processUpdateUserProfileIntent,
  userProcessors
};

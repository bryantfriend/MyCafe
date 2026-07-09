import { emitIntentResult } from "../emit/emitResult.js";
import { authorizeUserIntent } from "../authorization/userAuthorizations.js";
import { addUserAccountContext } from "../context/contexts.js";
import {
  normalizeRegisterUserProfileIntent,
  normalizeSyncUserLoyaltyIntent,
  normalizeUpdateUserFavoritesIntent,
  normalizeUpdateUserProfileIntent
} from "../normalization/userNormalizers.js";
import {
  processRegisterUserProfileIntent,
  processSyncUserLoyaltyIntent,
  processUpdateUserFavoritesIntent,
  processUpdateUserProfileIntent
} from "../processing/userProcessors.js";
import {
  validateRegisterUserProfileIntent,
  validateSyncUserLoyaltyIntent,
  validateUpdateUserFavoritesIntent,
  validateUpdateUserProfileIntent
} from "../validation/userValidators.js";

const RegisterUserProfileIntent = {
  name: "RegisterUserProfileIntent",
  validate: validateRegisterUserProfileIntent,
  normalize: normalizeRegisterUserProfileIntent,
  addContext: addUserAccountContext,
  authorize: authorizeUserIntent,
  process: processRegisterUserProfileIntent,
  emit: emitIntentResult
};

const UpdateUserProfileIntent = {
  name: "UpdateUserProfileIntent",
  validate: validateUpdateUserProfileIntent,
  normalize: normalizeUpdateUserProfileIntent,
  addContext: addUserAccountContext,
  authorize: authorizeUserIntent,
  process: processUpdateUserProfileIntent,
  emit: emitIntentResult
};

const UpdateUserFavoritesIntent = {
  name: "UpdateUserFavoritesIntent",
  validate: validateUpdateUserFavoritesIntent,
  normalize: normalizeUpdateUserFavoritesIntent,
  addContext: addUserAccountContext,
  authorize: authorizeUserIntent,
  process: processUpdateUserFavoritesIntent,
  emit: emitIntentResult
};

const SyncUserLoyaltyIntent = {
  name: "SyncUserLoyaltyIntent",
  validate: validateSyncUserLoyaltyIntent,
  normalize: normalizeSyncUserLoyaltyIntent,
  addContext: addUserAccountContext,
  authorize: authorizeUserIntent,
  process: processSyncUserLoyaltyIntent,
  emit: emitIntentResult
};

const userIntents = {
  RegisterUserProfileIntent: RegisterUserProfileIntent,
  SyncUserLoyaltyIntent: SyncUserLoyaltyIntent,
  UpdateUserFavoritesIntent: UpdateUserFavoritesIntent,
  UpdateUserProfileIntent: UpdateUserProfileIntent
};

export {
  RegisterUserProfileIntent,
  SyncUserLoyaltyIntent,
  UpdateUserFavoritesIntent,
  UpdateUserProfileIntent,
  userIntents
};

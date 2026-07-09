import { emitIntentResult } from "../emit/emitResult.js";
import { authorizeAdminIntent, authorizeLoadAdminDashboardIntent } from "../authorization/adminAuthorizations.js";
import { addAdminDashboardContext } from "../context/contexts.js";
import {
  normalizeAdminDeleteReviewIntent,
  normalizeAdminDeleteUserIntent,
  normalizeAdminSaveUserIntent,
  normalizeAdminUpdateCafeIntent,
  normalizeAdminUpdateCircleIntent,
  normalizeAdminUpdateReviewIntent,
  normalizeLoadAdminDashboardIntent
} from "../normalization/adminNormalizers.js";
import {
  processAdminDeleteReviewIntent,
  processAdminDeleteUserIntent,
  processAdminSaveUserIntent,
  processAdminUpdateCafeIntent,
  processAdminUpdateCircleIntent,
  processAdminUpdateReviewIntent,
  processLoadAdminDashboardIntent
} from "../processing/adminProcessors.js";
import {
  validateAdminDeleteReviewIntent,
  validateAdminDeleteUserIntent,
  validateAdminSaveUserIntent,
  validateAdminUpdateCafeIntent,
  validateAdminUpdateCircleIntent,
  validateAdminUpdateReviewIntent,
  validateLoadAdminDashboardIntent
} from "../validation/adminValidators.js";

const LoadAdminDashboardIntent = {
  name: "LoadAdminDashboardIntent",
  validate: validateLoadAdminDashboardIntent,
  normalize: normalizeLoadAdminDashboardIntent,
  addContext: addAdminDashboardContext,
  authorize: authorizeLoadAdminDashboardIntent,
  process: processLoadAdminDashboardIntent,
  emit: emitIntentResult
};

const AdminUpdateCafeIntent = {
  name: "AdminUpdateCafeIntent",
  validate: validateAdminUpdateCafeIntent,
  normalize: normalizeAdminUpdateCafeIntent,
  addContext: addAdminDashboardContext,
  authorize: authorizeAdminIntent,
  process: processAdminUpdateCafeIntent,
  emit: emitIntentResult
};

const AdminUpdateCircleIntent = {
  name: "AdminUpdateCircleIntent",
  validate: validateAdminUpdateCircleIntent,
  normalize: normalizeAdminUpdateCircleIntent,
  addContext: addAdminDashboardContext,
  authorize: authorizeAdminIntent,
  process: processAdminUpdateCircleIntent,
  emit: emitIntentResult
};

const AdminUpdateReviewIntent = {
  name: "AdminUpdateReviewIntent",
  validate: validateAdminUpdateReviewIntent,
  normalize: normalizeAdminUpdateReviewIntent,
  addContext: addAdminDashboardContext,
  authorize: authorizeAdminIntent,
  process: processAdminUpdateReviewIntent,
  emit: emitIntentResult
};

const AdminDeleteReviewIntent = {
  name: "AdminDeleteReviewIntent",
  validate: validateAdminDeleteReviewIntent,
  normalize: normalizeAdminDeleteReviewIntent,
  addContext: addAdminDashboardContext,
  authorize: authorizeAdminIntent,
  process: processAdminDeleteReviewIntent,
  emit: emitIntentResult
};

const AdminSaveUserIntent = {
  name: "AdminSaveUserIntent",
  validate: validateAdminSaveUserIntent,
  normalize: normalizeAdminSaveUserIntent,
  addContext: addAdminDashboardContext,
  authorize: authorizeAdminIntent,
  process: processAdminSaveUserIntent,
  emit: emitIntentResult
};

const AdminDeleteUserIntent = {
  name: "AdminDeleteUserIntent",
  validate: validateAdminDeleteUserIntent,
  normalize: normalizeAdminDeleteUserIntent,
  addContext: addAdminDashboardContext,
  authorize: authorizeAdminIntent,
  process: processAdminDeleteUserIntent,
  emit: emitIntentResult
};

export {
  AdminDeleteReviewIntent,
  AdminDeleteUserIntent,
  AdminSaveUserIntent,
  AdminUpdateCafeIntent,
  AdminUpdateCircleIntent,
  AdminUpdateReviewIntent,
  LoadAdminDashboardIntent
};

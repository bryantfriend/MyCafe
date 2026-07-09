import { normalizeCafeMenu } from "./cafeNormalizers.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLoadAdminDashboardIntent(payload) {
  return payload || {};
}

function addUpdatedAt(patch) {
  var normalizedPatch = Object.assign({}, patch || {});

  if (Array.isArray(normalizedPatch.menu)) {
    normalizedPatch.menu = normalizeCafeMenu(normalizedPatch.menu);
  }

  normalizedPatch.updatedAt = new Date();
  return normalizedPatch;
}

function normalizeAdminUpdateCafeIntent(payload) {
  return {
    cafeId: normalizeText(payload.cafeId),
    cafePatch: addUpdatedAt(payload.cafePatch || {})
  };
}

function normalizeAdminUpdateCircleIntent(payload) {
  return {
    circleId: normalizeText(payload.circleId),
    circlePatch: addUpdatedAt(payload.circlePatch || {})
  };
}

function normalizeAdminUpdateReviewIntent(payload) {
  return {
    reviewId: normalizeText(payload.reviewId),
    reviewUserId: normalizeText(payload.reviewUserId),
    awardTrust: payload.awardTrust === true,
    reviewPatch: payload.reviewPatch || {}
  };
}

function normalizeAdminDeleteReviewIntent(payload) {
  return {
    reviewId: normalizeText(payload.reviewId)
  };
}

function normalizeAdminSaveUserIntent(payload) {
  return {
    mode: normalizeText(payload.mode || "edit"),
    userId: normalizeText(payload.userId),
    userData: payload.userData || {}
  };
}

function normalizeAdminDeleteUserIntent(payload) {
  return {
    userId: normalizeText(payload.userId)
  };
}

export {
  normalizeAdminDeleteReviewIntent,
  normalizeAdminDeleteUserIntent,
  normalizeAdminSaveUserIntent,
  normalizeAdminUpdateCafeIntent,
  normalizeAdminUpdateCircleIntent,
  normalizeAdminUpdateReviewIntent,
  normalizeLoadAdminDashboardIntent
};

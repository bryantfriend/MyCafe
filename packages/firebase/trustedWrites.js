import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { functions } from "./firebaseFunctions.js";

const callRecordAnalyticsEvent = httpsCallable(functions, "recordAnalyticsEvent");
const callSubmitReview = httpsCallable(functions, "submitReview");
const callReserveCircleSeat = httpsCallable(functions, "reserveCircleSeat");
const callSyncLoyaltyEvents = httpsCallable(functions, "syncLoyaltyEvents");
const callRecalculateCafeAnalytics = httpsCallable(functions, "recalculateCafeAnalytics");

async function recordTrustedAnalyticsEvent(payload) {
  return callRecordAnalyticsEvent(payload);
}

async function submitTrustedReview(payload) {
  return callSubmitReview(payload);
}

async function reserveTrustedCircleSeat(payload) {
  return callReserveCircleSeat(payload);
}

async function syncTrustedLoyaltyEvents(events) {
  return callSyncLoyaltyEvents({ events });
}

async function recalculateTrustedCafeAnalytics(cafeId) {
  return callRecalculateCafeAnalytics({ cafeId });
}

export {
  recalculateTrustedCafeAnalytics,
  recordTrustedAnalyticsEvent,
  reserveTrustedCircleSeat,
  submitTrustedReview,
  syncTrustedLoyaltyEvents
};

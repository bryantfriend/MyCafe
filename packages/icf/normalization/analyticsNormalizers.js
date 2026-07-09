import { getOrderLinkHost } from "../../domain/menus/orderLinks.js";

function normalizeAnalyticsText(value) {
  return String(value || "").trim();
}

function normalizeTrackAnalyticsEventIntent(payload) {
  var eventPayload = payload.payload || {};
  var eventType = normalizeAnalyticsText(payload.type);
  var userId = eventPayload.userId || null;
  var urlHost = normalizeAnalyticsText(eventPayload.urlHost);

  if (!urlHost && eventPayload.url) {
    urlHost = getOrderLinkHost(eventPayload.url);
  }

  return {
    type: eventType,
    eventData: {
      type: eventType,
      eventName: eventType,
      eventType: normalizeAnalyticsText(eventPayload.eventType || eventType),
      cafeId: normalizeAnalyticsText(eventPayload.cafeId),
      cafeName: normalizeAnalyticsText(eventPayload.cafeName),
      circleId: normalizeAnalyticsText(eventPayload.circleId),
      gameId: normalizeAnalyticsText(eventPayload.gameId),
      itemId: normalizeAnalyticsText(eventPayload.itemId),
      itemName: normalizeAnalyticsText(eventPayload.itemName),
      category: normalizeAnalyticsText(eventPayload.category),
      language: normalizeAnalyticsText(eventPayload.language),
      query: normalizeAnalyticsText(eventPayload.query),
      resultsCount: Number(eventPayload.resultsCount || 0),
      seats: Number(eventPayload.seats || 0),
      linkType: normalizeAnalyticsText(eventPayload.linkType),
      linkLabel: normalizeAnalyticsText(eventPayload.linkLabel),
      urlHost: urlHost,
      userId: userId,
      path: eventPayload.path || (typeof window !== "undefined" ? window.location.pathname : ""),
      source: normalizeAnalyticsText(eventPayload.source),
      metadata: eventPayload.metadata || {},
      createdAt: eventPayload.createdAt || new Date()
    }
  };
}

export { normalizeTrackAnalyticsEventIntent };

import { getOrderLinkHost, isSupportedOrderLinkType } from "../../domain/menus/orderLinks.js";
import { createIntentError } from "../shared/intentErrors.js";

function validateTrackAnalyticsEventIntent(payload) {
  var errors = [];
  var eventPayload = payload && payload.payload ? payload.payload : {};
  var eventType = payload && payload.type ? String(payload.type).trim() : "";

  if (!eventType) {
    errors.push(createIntentError("missing-event-type", "type", "An analytics event type is required."));
    return errors;
  }

  if (eventType === "orderLinkClick") {
    if (!eventPayload.cafeId) {
      errors.push(createIntentError("missing-cafe-id", "payload.cafeId", "A cafe id is required for order link analytics."));
    }
    if (!eventPayload.itemId) {
      errors.push(createIntentError("missing-item-id", "payload.itemId", "A menu item id is required for order link analytics."));
    }
    if (!isSupportedOrderLinkType(eventPayload.linkType)) {
      errors.push(createIntentError("unsupported-order-link-type", "payload.linkType", "Order link analytics require a supported link type."));
    }
    if (!eventPayload.linkLabel) {
      errors.push(createIntentError("missing-order-link-label", "payload.linkLabel", "Order link analytics require a label."));
    }
    if (!eventPayload.urlHost && !getOrderLinkHost(eventPayload.url)) {
      errors.push(createIntentError("missing-url-host", "payload.urlHost", "Order link analytics must store only the URL host."));
    }
  }

  return errors;
}

export { validateTrackAnalyticsEventIntent };

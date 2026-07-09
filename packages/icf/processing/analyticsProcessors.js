import { trackAnalyticsEvent } from "../../domain/analytics/analyticsRepository.js";
import { createProcessResult } from "./processors.js";

async function processTrackAnalyticsEventIntent(payload) {
  var eventId = await trackAnalyticsEvent(payload.eventData);
  return createProcessResult("Analytics event tracked.", { eventId: eventId });
}

const analyticsProcessors = {
  processTrackAnalyticsEventIntent: processTrackAnalyticsEventIntent
};

export { analyticsProcessors, processTrackAnalyticsEventIntent };

import { emitIntentResult } from "../emit/emitResult.js";
import { authorizeTrackAnalyticsEvent } from "../authorization/analyticsAuthorizations.js";
import { addAnalyticsContext } from "../context/analyticsContext.js";
import { normalizeTrackAnalyticsEventIntent } from "../normalization/analyticsNormalizers.js";
import { processTrackAnalyticsEventIntent } from "../processing/analyticsProcessors.js";
import { validateTrackAnalyticsEventIntent } from "../validation/analyticsValidators.js";

const TrackAnalyticsEventIntent = {
  name: "TrackAnalyticsEventIntent",
  validate: validateTrackAnalyticsEventIntent,
  normalize: normalizeTrackAnalyticsEventIntent,
  addContext: addAnalyticsContext,
  authorize: authorizeTrackAnalyticsEvent,
  process: processTrackAnalyticsEventIntent,
  emit: emitIntentResult
};

const analyticsIntents = {
  TrackAnalyticsEventIntent: TrackAnalyticsEventIntent
};

export { TrackAnalyticsEventIntent, analyticsIntents };

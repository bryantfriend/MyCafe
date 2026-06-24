import { getReviewAlertSummary } from "../../domain/reviews/reviewService.js";

async function processLoadAdminDashboardIntent(payload) {
  const reviewAlerts = await getReviewAlertSummary();
  const context = payload && payload.context ? payload.context : {};

  return {
    message: "Admin dashboard loaded.",
    data: {
      currentUser: context.currentUserSummary,
      reviewAlerts: reviewAlerts
    }
  };
}

export { processLoadAdminDashboardIntent };

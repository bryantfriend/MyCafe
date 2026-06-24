import { emitIntentResult } from "../emit/emitResult.js";
import { authorizeLoadAdminDashboardIntent } from "../authorization/adminAuthorizations.js";
import { addAdminDashboardContext } from "../context/contexts.js";
import { normalizeLoadAdminDashboardIntent } from "../normalization/adminNormalizers.js";
import { processLoadAdminDashboardIntent } from "../processing/adminProcessors.js";
import { validateLoadAdminDashboardIntent } from "../validation/adminValidators.js";

const LoadAdminDashboardIntent = {
  name: "LoadAdminDashboardIntent",
  validate: validateLoadAdminDashboardIntent,
  normalize: normalizeLoadAdminDashboardIntent,
  addContext: addAdminDashboardContext,
  authorize: authorizeLoadAdminDashboardIntent,
  process: processLoadAdminDashboardIntent,
  emit: emitIntentResult
};

export { LoadAdminDashboardIntent };

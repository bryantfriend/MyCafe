import {
  AdminDeleteReviewIntent,
  AdminDeleteUserIntent,
  AdminSaveUserIntent,
  AdminUpdateCafeIntent,
  AdminUpdateCircleIntent,
  AdminUpdateReviewIntent,
  LoadAdminDashboardIntent
} from "./adminIntents.js";
import { TrackAnalyticsEventIntent } from "./analyticsIntents.js";
import {
  UpdateCafeMenuIntent,
  UpdateCafePhotosIntent,
  UpdateCafeProfileIntent,
  UpdateCafeTranslationsIntent
} from "./cafeIntents.js";
import { CircleRsvpIntent, CreateCircleIntent } from "./circleIntents.js";
import { EditReviewWithTokenIntent, SubmitCafeReviewIntent, UpdateReviewOwnerResponseIntent } from "./reviewIntents.js";
import {
  RegisterUserProfileIntent,
  SyncUserLoyaltyIntent,
  UpdateUserFavoritesIntent,
  UpdateUserProfileIntent
} from "./userIntents.js";

const intentRegistry = {
  AdminDeleteReviewIntent: AdminDeleteReviewIntent,
  AdminDeleteUserIntent: AdminDeleteUserIntent,
  AdminSaveUserIntent: AdminSaveUserIntent,
  AdminUpdateCafeIntent: AdminUpdateCafeIntent,
  AdminUpdateCircleIntent: AdminUpdateCircleIntent,
  AdminUpdateReviewIntent: AdminUpdateReviewIntent,
  CircleRsvpIntent: CircleRsvpIntent,
  CreateCircleIntent: CreateCircleIntent,
  EditReviewWithTokenIntent: EditReviewWithTokenIntent,
  LoadAdminDashboardIntent: LoadAdminDashboardIntent,
  RegisterUserProfileIntent: RegisterUserProfileIntent,
  SubmitCafeReviewIntent: SubmitCafeReviewIntent,
  SyncUserLoyaltyIntent: SyncUserLoyaltyIntent,
  TrackAnalyticsEventIntent: TrackAnalyticsEventIntent,
  UpdateCafeMenuIntent: UpdateCafeMenuIntent,
  UpdateCafePhotosIntent: UpdateCafePhotosIntent,
  UpdateCafeProfileIntent: UpdateCafeProfileIntent,
  UpdateCafeTranslationsIntent: UpdateCafeTranslationsIntent,
  UpdateReviewOwnerResponseIntent: UpdateReviewOwnerResponseIntent,
  UpdateUserFavoritesIntent: UpdateUserFavoritesIntent,
  UpdateUserProfileIntent: UpdateUserProfileIntent
};

export { intentRegistry };

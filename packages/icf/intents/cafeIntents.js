import { emitIntentResult } from "../emit/emitResult.js";
import { authorizeCafeOwner } from "../authorization/cafeAuthorizations.js";
import { addCafeOwnerContext } from "../context/contexts.js";
import {
  normalizeUpdateCafeMenuIntent,
  normalizeUpdateCafePhotosIntent,
  normalizeUpdateCafeProfileIntent,
  normalizeUpdateCafeTranslationsIntent
} from "../normalization/cafeNormalizers.js";
import {
  processUpdateCafeMenuIntent,
  processUpdateCafePhotosIntent,
  processUpdateCafeProfileIntent,
  processUpdateCafeTranslationsIntent
} from "../processing/cafeProcessors.js";
import {
  validateUpdateCafeMenuIntent,
  validateUpdateCafePhotosIntent,
  validateUpdateCafeProfileIntent,
  validateUpdateCafeTranslationsIntent
} from "../validation/cafeValidators.js";

const UpdateCafeProfileIntent = {
  name: "UpdateCafeProfileIntent",
  validate: validateUpdateCafeProfileIntent,
  normalize: normalizeUpdateCafeProfileIntent,
  addContext: addCafeOwnerContext,
  authorize: authorizeCafeOwner,
  process: processUpdateCafeProfileIntent,
  emit: emitIntentResult
};

const UpdateCafeMenuIntent = {
  name: "UpdateCafeMenuIntent",
  validate: validateUpdateCafeMenuIntent,
  normalize: normalizeUpdateCafeMenuIntent,
  addContext: addCafeOwnerContext,
  authorize: authorizeCafeOwner,
  process: processUpdateCafeMenuIntent,
  emit: emitIntentResult
};

const UpdateCafePhotosIntent = {
  name: "UpdateCafePhotosIntent",
  validate: validateUpdateCafePhotosIntent,
  normalize: normalizeUpdateCafePhotosIntent,
  addContext: addCafeOwnerContext,
  authorize: authorizeCafeOwner,
  process: processUpdateCafePhotosIntent,
  emit: emitIntentResult
};

const UpdateCafeTranslationsIntent = {
  name: "UpdateCafeTranslationsIntent",
  validate: validateUpdateCafeTranslationsIntent,
  normalize: normalizeUpdateCafeTranslationsIntent,
  addContext: addCafeOwnerContext,
  authorize: authorizeCafeOwner,
  process: processUpdateCafeTranslationsIntent,
  emit: emitIntentResult
};

const cafeIntents = {
  UpdateCafeMenuIntent: UpdateCafeMenuIntent,
  UpdateCafePhotosIntent: UpdateCafePhotosIntent,
  UpdateCafeProfileIntent: UpdateCafeProfileIntent,
  UpdateCafeTranslationsIntent: UpdateCafeTranslationsIntent
};

export {
  UpdateCafeMenuIntent,
  UpdateCafePhotosIntent,
  UpdateCafeProfileIntent,
  UpdateCafeTranslationsIntent,
  cafeIntents
};

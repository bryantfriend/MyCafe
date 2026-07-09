import { validateOrderLink } from "../../domain/menus/orderLinks.js";
import { createIntentError } from "../shared/intentErrors.js";

function validateCafeName(value) {
  return String(value || "").trim().length > 0;
}

function validateRequiredCafeId(payload) {
  var errors = [];

  if (!payload || !payload.cafeId) {
    errors.push(createIntentError("missing-cafe-id", "cafeId", "A cafe id is required."));
  }

  return errors;
}

function addOrderLinkValidationErrors(errors, orderLinks, fieldPrefix) {
  var i = 0;
  var linkErrors = [];
  var j = 0;

  if (!Array.isArray(orderLinks)) {
    return;
  }

  for (i = 0; i < orderLinks.length; i += 1) {
    linkErrors = validateOrderLink(orderLinks[i]);
    for (j = 0; j < linkErrors.length; j += 1) {
      errors.push(createIntentError(
        linkErrors[j].code,
        fieldPrefix + ".orderLinks[" + i + "]." + linkErrors[j].field,
        linkErrors[j].message
      ));
    }
  }
}

function validateMenuOrderLinks(errors, menu) {
  var categoryIndex = 0;
  var itemIndex = 0;

  if (!Array.isArray(menu)) {
    return;
  }

  for (categoryIndex = 0; categoryIndex < menu.length; categoryIndex += 1) {
    var category = menu[categoryIndex] || {};
    var items = Array.isArray(category.items) ? category.items : [];

    for (itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      addOrderLinkValidationErrors(
        errors,
        items[itemIndex].orderLinks,
        "menu[" + categoryIndex + "].items[" + itemIndex + "]"
      );
    }
  }
}

function validateUpdateCafeProfileIntent(payload) {
  var errors = validateRequiredCafeId(payload);
  var profile = payload && payload.profile ? payload.profile : {};

  if (!validateCafeName(profile.name)) {
    errors.push(createIntentError("missing-cafe-name", "profile.name", "Cafe name is required."));
  }

  return errors;
}

function validateUpdateCafeMenuIntent(payload) {
  var errors = validateRequiredCafeId(payload);

  if (!payload || !Array.isArray(payload.menu)) {
    errors.push(createIntentError("invalid-menu", "menu", "Menu must be an array of categories."));
    return errors;
  }

  validateMenuOrderLinks(errors, payload.menu);
  return errors;
}

function validateUpdateCafePhotosIntent(payload) {
  var errors = validateRequiredCafeId(payload);

  if (!payload || !Array.isArray(payload.photos)) {
    errors.push(createIntentError("invalid-photos", "photos", "Photos must be an array."));
  }

  return errors;
}

function validateUpdateCafeTranslationsIntent(payload) {
  var errors = validateRequiredCafeId(payload);

  if (!payload || !Array.isArray(payload.menu)) {
    errors.push(createIntentError("invalid-menu", "menu", "Translated menu must be an array."));
  } else {
    validateMenuOrderLinks(errors, payload.menu);
  }

  if (!payload || typeof payload.translations !== "object" || Array.isArray(payload.translations)) {
    errors.push(createIntentError("invalid-translations", "translations", "Cafe translations must be an object."));
  }

  return errors;
}

export {
  validateCafeName,
  validateMenuOrderLinks,
  validateUpdateCafeMenuIntent,
  validateUpdateCafePhotosIntent,
  validateUpdateCafeProfileIntent,
  validateUpdateCafeTranslationsIntent
};

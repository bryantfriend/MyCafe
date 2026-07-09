import { updateCafe } from "../../domain/cafes/cafeRepository.js";
import { createProcessResult } from "./processors.js";

function addUpdatedAt(data) {
  return Object.assign({}, data || {}, { updatedAt: new Date() });
}

async function processUpdateCafeProfileIntent(payload) {
  await updateCafe(payload.cafeId, addUpdatedAt(payload.profile));
  return createProcessResult("Cafe profile saved.", { cafeId: payload.cafeId });
}

async function processUpdateCafeMenuIntent(payload) {
  await updateCafe(payload.cafeId, addUpdatedAt({ menu: payload.menu }));
  return createProcessResult("Menu saved.", { cafeId: payload.cafeId, menu: payload.menu });
}

async function processUpdateCafePhotosIntent(payload) {
  var update = {
    photos: payload.photos
  };

  if (payload.imageUrl) {
    update.imageUrl = payload.imageUrl;
    update.coverImageUrl = payload.coverImageUrl || payload.imageUrl;
  }

  await updateCafe(payload.cafeId, addUpdatedAt(update));
  return createProcessResult("Cafe photos saved.", { cafeId: payload.cafeId, photos: payload.photos });
}

async function processUpdateCafeTranslationsIntent(payload) {
  await updateCafe(payload.cafeId, addUpdatedAt({
    menu: payload.menu,
    translations: payload.translations
  }));
  return createProcessResult("Translations saved.", { cafeId: payload.cafeId });
}

const cafeProcessors = {
  processUpdateCafeMenuIntent: processUpdateCafeMenuIntent,
  processUpdateCafePhotosIntent: processUpdateCafePhotosIntent,
  processUpdateCafeProfileIntent: processUpdateCafeProfileIntent,
  processUpdateCafeTranslationsIntent: processUpdateCafeTranslationsIntent
};

export {
  cafeProcessors,
  processUpdateCafeMenuIntent,
  processUpdateCafePhotosIntent,
  processUpdateCafeProfileIntent,
  processUpdateCafeTranslationsIntent
};

import { normalizeOrderLink } from "../../domain/menus/orderLinks.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeTagList(value) {
  var tags = [];
  var i = 0;

  if (Array.isArray(value)) {
    tags = value;
  } else {
    tags = String(value || "").split(",");
  }

  var normalized = [];
  for (i = 0; i < tags.length; i += 1) {
    var tag = normalizeText(tags[i]);
    if (tag) {
      normalized.push(tag);
    }
  }

  return normalized;
}

function normalizeMenuOrderLinks(orderLinks) {
  var normalized = [];
  var i = 0;

  if (!Array.isArray(orderLinks)) {
    return normalized;
  }

  for (i = 0; i < orderLinks.length; i += 1) {
    normalized.push(normalizeOrderLink(orderLinks[i]));
  }

  return normalized;
}

function normalizeMenuItems(items) {
  var normalized = [];
  var i = 0;

  if (!Array.isArray(items)) {
    return normalized;
  }

  for (i = 0; i < items.length; i += 1) {
    var item = Object.assign({}, items[i] || {});
    item.orderLinks = normalizeMenuOrderLinks(item.orderLinks);
    normalized.push(item);
  }

  return normalized;
}

function normalizeCafeMenu(menu) {
  var normalized = [];
  var i = 0;

  if (!Array.isArray(menu)) {
    return normalized;
  }

  for (i = 0; i < menu.length; i += 1) {
    var category = Object.assign({}, menu[i] || {});
    category.items = normalizeMenuItems(category.items);
    normalized.push(category);
  }

  return normalized;
}

function normalizeUpdateCafeProfileIntent(payload) {
  var profile = payload.profile || {};
  var socials = profile.socials || {};

  return {
    cafeId: normalizeText(payload.cafeId),
    profile: {
      name: normalizeText(profile.name),
      slug: normalizeText(profile.slug),
      path_name: normalizeText(profile.path_name || profile.slug),
      description: normalizeText(profile.description),
      address: normalizeText(profile.address),
      tags: normalizeTagList(profile.tags),
      priceTier: normalizeText(profile.priceTier),
      locationArea: normalizeText(profile.locationArea),
      phone: normalizeText(profile.phone),
      hours: profile.hours || {},
      orderUrl: normalizeText(profile.orderUrl),
      waiterRequestUrl: normalizeText(profile.waiterRequestUrl),
      imageUrl: normalizeText(profile.imageUrl),
      coverImageUrl: normalizeText(profile.coverImageUrl || profile.imageUrl),
      socials: socials
    }
  };
}

function normalizeUpdateCafeMenuIntent(payload) {
  return {
    cafeId: normalizeText(payload.cafeId),
    menu: normalizeCafeMenu(payload.menu)
  };
}

function normalizeUpdateCafePhotosIntent(payload) {
  var photos = [];
  var i = 0;

  if (Array.isArray(payload.photos)) {
    for (i = 0; i < payload.photos.length; i += 1) {
      var photoUrl = normalizeText(payload.photos[i]);
      if (photoUrl) {
        photos.push(photoUrl);
      }
    }
  }

  return {
    cafeId: normalizeText(payload.cafeId),
    photos: photos,
    imageUrl: normalizeText(payload.imageUrl),
    coverImageUrl: normalizeText(payload.coverImageUrl || payload.imageUrl)
  };
}

function normalizeUpdateCafeTranslationsIntent(payload) {
  return {
    cafeId: normalizeText(payload.cafeId),
    menu: normalizeCafeMenu(payload.menu),
    translations: payload.translations || {}
  };
}

export {
  normalizeCafeMenu,
  normalizeMenuOrderLinks,
  normalizeUpdateCafeMenuIntent,
  normalizeUpdateCafePhotosIntent,
  normalizeUpdateCafeProfileIntent,
  normalizeUpdateCafeTranslationsIntent
};

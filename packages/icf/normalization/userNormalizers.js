function normalizePrivacyFlag(value) {
  return value === true;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeSettings(settings) {
  var source = settings || {};
  return {
    profilePublic: normalizePrivacyFlag(source.profilePublic),
    reviewsPublic: normalizePrivacyFlag(source.reviewsPublic),
    badgesPublic: normalizePrivacyFlag(source.badgesPublic),
    xpPublic: normalizePrivacyFlag(source.xpPublic),
    favoritesPublic: normalizePrivacyFlag(source.favoritesPublic),
    photosPublic: normalizePrivacyFlag(source.photosPublic)
  };
}

function normalizeFavoriteList(favorites) {
  var normalized = [];
  var seen = {};
  var i = 0;

  if (!Array.isArray(favorites)) {
    return normalized;
  }

  for (i = 0; i < favorites.length; i += 1) {
    var cafeId = normalizeText(favorites[i]);
    if (cafeId && !seen[cafeId]) {
      normalized.push(cafeId);
      seen[cafeId] = true;
    }
  }

  return normalized;
}

function normalizeRegisterUserProfileIntent(payload) {
  var profile = payload.profile || {};
  return {
    userId: normalizeText(payload.userId),
    profile: {
      nickname: normalizeText(profile.nickname),
      email: normalizeText(profile.email),
      profilePicUrl: "",
      bio: "",
      language: normalizeText(profile.language || "en"),
      xp: 0,
      level: 1,
      badges: [],
      quests: { completed: [], active: {} },
      reviews: [],
      favorites: [],
      settings: {
        profilePublic: false,
        reviewsPublic: false,
        badgesPublic: true,
        xpPublic: true,
        favoritesPublic: false,
        photosPublic: false
      },
      role: "user",
      flagged: false,
      createdAt: new Date()
    }
  };
}

function normalizeUpdateUserProfileIntent(payload) {
  var profile = payload.profile || {};
  return {
    userId: normalizeText(payload.userId),
    profile: Object.assign({}, payload.existingProfile || {}, profile, {
      nickname: normalizeText(profile.nickname),
      profilePicUrl: normalizeText(profile.profilePicUrl),
      bio: normalizeText(profile.bio),
      language: normalizeText(profile.language || "en"),
      settings: normalizeSettings(profile.settings)
    })
  };
}

function normalizeUpdateUserFavoritesIntent(payload) {
  return {
    userId: normalizeText(payload.userId),
    favorites: normalizeFavoriteList(payload.favorites)
  };
}

function normalizeSyncUserLoyaltyIntent(payload) {
  return {
    userId: normalizeText(payload.userId),
    loyaltyPatch: payload.loyaltyPatch || {}
  };
}

export {
  normalizePrivacyFlag,
  normalizeRegisterUserProfileIntent,
  normalizeSyncUserLoyaltyIntent,
  normalizeUpdateUserFavoritesIntent,
  normalizeUpdateUserProfileIntent
};

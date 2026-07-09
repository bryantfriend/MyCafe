import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMonetizationPayload,
  getActivePlanNames,
  getInvoiceTotal,
  getPlanStatus
} from '../packages/domain/monetization/cafePlans.js';
import {
  getRevenueSummary,
  getSeatSummary
} from '../packages/domain/circles/circleMarketplace.js';
import {
  evaluateReviewTrust,
  getUserTrustLevel
} from '../packages/domain/reviews/reviewTrust.js';

test('monetization payload always keeps free listing and syncs legacy flags', () => {
  const payload = buildMonetizationPayload({
    activePackageIds: ['analytics-pro', 'games-lessons-bundle'],
    status: 'paid',
    invoices: [{ amount: 1200 }]
  });

  assert.deepEqual(payload.monetization.activePackageIds, [
    'free-listing',
    'analytics-pro',
    'games-lessons-bundle'
  ]);
  assert.equal(payload.premiumAnalyticsEnabled, true);
  assert.equal(payload.premiumGamesEnabled, true);
  assert.equal(payload.premiumLessonsEnabled, true);
  assert.equal(getInvoiceTotal(payload), 1200);
  assert.equal(getPlanStatus(payload).code, 'paid');
  assert.ok(getActivePlanNames(payload).includes('Analytics Pro'));
});

test('circle marketplace calculates seats and host payout', () => {
  const circle = {
    capacity: 10,
    pricePerSeat: 500,
    rsvpCount: 6,
    cafePartner: { sharePercent: 10 },
    platformFeePercent: 10,
    budget: { food: 1000, gifts: 500, venue: 300, marketing: 200 }
  };

  assert.deepEqual(getSeatSummary(circle), {
    attending: 6,
    capacity: 10,
    seatsLeft: 4,
    soldOut: false
  });
  assert.equal(getRevenueSummary(circle).grossRevenue, 3000);
  assert.equal(getRevenueSummary(circle).estimatedPayout, 400);
});

test('review trust flags spam and auto-approves known clean reviewers', () => {
  const cleanReview = { cafeId: 'mano', rating: 5, text: 'Great latte and very friendly service.' };
  const trustedUser = { level: 3, approvedReviewCount: 4 };
  const result = evaluateReviewTrust(cleanReview, trustedUser, {});

  assert.equal(getUserTrustLevel(trustedUser).autoApprove, true);
  assert.equal(result.approved, true);
  assert.equal(result.moderationStatus, 'auto-approved');

  const spam = evaluateReviewTrust({ cafeId: 'mano', rating: 5, text: 'free money https://a.test https://b.test' }, trustedUser, {});
  assert.equal(spam.flagged, true);
  assert.ok(spam.spamFlags.includes('too-many-links'));
});

import { readFileSync } from 'node:fs';

import {
  validateUpdateCafeProfileIntent,
  validateUpdateCafeMenuIntent
} from '../packages/icf/validation/cafeValidators.js';
import { validateSubmitCafeReviewIntent } from '../packages/icf/validation/reviewValidators.js';
import {
  normalizeUpdateCafeMenuIntent,
  normalizeUpdateCafeProfileIntent
} from '../packages/icf/normalization/cafeNormalizers.js';
import { normalizeSubmitCafeReviewIntent } from '../packages/icf/normalization/reviewNormalizers.js';

test('ICF validators reject missing required action payloads', () => {
  assert.equal(validateUpdateCafeProfileIntent({ cafeId: 'mano', profile: { name: ' Mano ' } }).length, 0);
  assert.ok(validateUpdateCafeProfileIntent({ cafeId: 'mano', profile: { name: '' } }).some(error => error.code === 'missing-cafe-name'));
  assert.ok(validateUpdateCafeMenuIntent({ cafeId: 'mano', menu: {} }).some(error => error.code === 'invalid-menu'));
  assert.ok(validateSubmitCafeReviewIntent({ cafeId: 'mano', rating: 6, text: '' }).some(error => error.code === 'invalid-rating'));
});

test('ICF normalizers produce predictable payloads', () => {
  const profile = normalizeUpdateCafeProfileIntent({
    cafeId: ' mano ',
    profile: {
      name: ' Mano Cafe ',
      slug: ' mano ',
      tags: 'coffee, desserts, ',
      imageUrl: ' https://example.com/photo.jpg '
    }
  });

  assert.equal(profile.cafeId, 'mano');
  assert.equal(profile.profile.name, 'Mano Cafe');
  assert.deepEqual(profile.profile.tags, ['coffee', 'desserts']);
  assert.equal(profile.profile.coverImageUrl, 'https://example.com/photo.jpg');

  const review = normalizeSubmitCafeReviewIntent({ cafeId: ' mano ', rating: '5', text: ' Great! ', language: '' });
  assert.equal(review.cafeId, 'mano');
  assert.equal(review.rating, 5);
  assert.equal(review.text, 'Great!');
  assert.equal(review.language, 'en');
});

test('new MyCafe intents are registered with every required ICF stage', () => {
  const registrySource = readFileSync(new URL('../packages/icf/intents/intentRegistry.js', import.meta.url), 'utf8');
  const intentFiles = [
    '../packages/icf/intents/cafeIntents.js',
    '../packages/icf/intents/reviewIntents.js',
    '../packages/icf/intents/circleIntents.js'
  ];
  const intentNames = [
    'UpdateCafeProfileIntent',
    'UpdateCafeMenuIntent',
    'UpdateCafePhotosIntent',
    'UpdateCafeTranslationsIntent',
    'SubmitCafeReviewIntent',
    'UpdateReviewOwnerResponseIntent',
    'CreateCircleIntent'
  ];
  const requiredStages = ['validate:', 'normalize:', 'addContext:', 'authorize:', 'process:', 'emit:'];

  for (const intentName of intentNames) {
    assert.ok(registrySource.includes(intentName), `${intentName} should be registered`);
  }

  for (const filePath of intentFiles) {
    const source = readFileSync(new URL(filePath, import.meta.url), 'utf8');
    for (const stage of requiredStages) {
      assert.ok(source.includes(stage), `${filePath} should include ${stage}`);
    }
  }
});

import { validateCircleRsvpIntent } from '../packages/icf/validation/circleValidators.js';
import { validateEditReviewWithTokenIntent } from '../packages/icf/validation/reviewValidators.js';
import {
  validateSyncUserLoyaltyIntent,
  validateUpdateUserFavoritesIntent,
  validateUpdateUserProfileIntent
} from '../packages/icf/validation/userValidators.js';
import { normalizeCircleRsvpIntent } from '../packages/icf/normalization/circleNormalizers.js';
import { normalizeUpdateUserFavoritesIntent, normalizeUpdateUserProfileIntent } from '../packages/icf/normalization/userNormalizers.js';

test('second-pass ICF validators protect user-facing mutations', () => {
  assert.equal(validateCircleRsvpIntent({ circleId: 'circle-1', rsvp: { name: 'Aida', seats: 2 } }).length, 0);
  assert.ok(validateCircleRsvpIntent({ circleId: 'circle-1', rsvp: { name: '', seats: 0 } }).some(error => error.code === 'missing-rsvp-name'));
  assert.ok(validateEditReviewWithTokenIntent({ reviewId: 'r1', rating: 5, text: 'Updated' }).some(error => error.code === 'missing-edit-token'));
  assert.ok(validateUpdateUserProfileIntent({ userId: 'u1', profile: { nickname: '' } }).some(error => error.code === 'missing-nickname'));
  assert.ok(validateUpdateUserFavoritesIntent({ userId: 'u1', favorites: 'mano' }).some(error => error.code === 'invalid-favorites'));
  assert.ok(validateSyncUserLoyaltyIntent({ userId: 'u1' }).some(error => error.code === 'invalid-loyalty-patch'));
});

test('second-pass ICF normalizers clean user-facing payloads', () => {
  const rsvp = normalizeCircleRsvpIntent({ circleId: ' circle-1 ', rsvp: { name: ' Aida ', email: ' a@test.com ', seats: '2' } });
  assert.equal(rsvp.circleId, 'circle-1');
  assert.equal(rsvp.rsvp.name, 'Aida');
  assert.equal(rsvp.rsvp.seats, 2);

  const favorites = normalizeUpdateUserFavoritesIntent({ userId: ' u1 ', favorites: [' mano ', 'mano', '', 'coffee-lab'] });
  assert.deepEqual(favorites.favorites, ['mano', 'coffee-lab']);

  const profile = normalizeUpdateUserProfileIntent({
    userId: ' u1 ',
    profile: {
      nickname: ' Guest ',
      language: '',
      settings: { badgesPublic: true, favoritesPublic: 'yes' }
    }
  });
  assert.equal(profile.userId, 'u1');
  assert.equal(profile.profile.nickname, 'Guest');
  assert.equal(profile.profile.language, 'en');
  assert.equal(profile.profile.settings.badgesPublic, true);
  assert.equal(profile.profile.settings.favoritesPublic, false);
});

test('second-pass ICF intents are registered', () => {
  const registrySource = readFileSync(new URL('../packages/icf/intents/intentRegistry.js', import.meta.url), 'utf8');
  const intentNames = [
    'CircleRsvpIntent',
    'EditReviewWithTokenIntent',
    'SyncUserLoyaltyIntent',
    'UpdateUserFavoritesIntent',
    'UpdateUserProfileIntent'
  ];

  for (const intentName of intentNames) {
    assert.ok(registrySource.includes(intentName), `${intentName} should be registered`);
  }
});

import {
  validateAdminDeleteReviewIntent,
  validateAdminDeleteUserIntent,
  validateAdminSaveUserIntent,
  validateAdminUpdateCafeIntent,
  validateAdminUpdateCircleIntent,
  validateAdminUpdateReviewIntent
} from '../packages/icf/validation/adminValidators.js';
import { validateTrackAnalyticsEventIntent } from '../packages/icf/validation/analyticsValidators.js';
import { validateRegisterUserProfileIntent } from '../packages/icf/validation/userValidators.js';
import {
  normalizeAdminSaveUserIntent,
  normalizeAdminUpdateCafeIntent
} from '../packages/icf/normalization/adminNormalizers.js';
import { normalizeTrackAnalyticsEventIntent } from '../packages/icf/normalization/analyticsNormalizers.js';
import { normalizeRegisterUserProfileIntent } from '../packages/icf/normalization/userNormalizers.js';

test('third-pass ICF validators protect admin, analytics, and registration mutations', () => {
  assert.equal(validateAdminUpdateCafeIntent({ cafeId: 'mano', cafePatch: { name: 'Mano' } }).length, 0);
  assert.ok(validateAdminUpdateCafeIntent({ cafeId: '', cafePatch: {} }).some(error => error.code === 'missing-cafe-id'));
  assert.ok(validateAdminUpdateCircleIntent({ circleId: '', circlePatch: {} }).some(error => error.code === 'missing-circle-id'));
  assert.ok(validateAdminUpdateReviewIntent({ reviewId: '', reviewPatch: {} }).some(error => error.code === 'missing-review-id'));
  assert.ok(validateAdminDeleteReviewIntent({}).some(error => error.code === 'missing-review-id'));
  assert.ok(validateAdminSaveUserIntent({ mode: 'edit', userData: {} }).some(error => error.code === 'missing-user-id'));
  assert.ok(validateAdminDeleteUserIntent({}).some(error => error.code === 'missing-user-id'));
  assert.ok(validateTrackAnalyticsEventIntent({}).some(error => error.code === 'missing-event-type'));
  assert.ok(validateRegisterUserProfileIntent({ userId: 'u1', profile: { nickname: 'Aida', email: '' } }).some(error => error.code === 'missing-email'));
});

test('third-pass ICF normalizers clean admin, analytics, and registration payloads', () => {
  const cafe = normalizeAdminUpdateCafeIntent({ cafeId: ' mano ', cafePatch: { name: 'Mano' } });
  assert.equal(cafe.cafeId, 'mano');
  assert.equal(cafe.cafePatch.name, 'Mano');
  assert.ok(cafe.cafePatch.updatedAt instanceof Date);

  const user = normalizeAdminSaveUserIntent({ mode: ' edit ', userId: ' u1 ', userData: { nickname: 'Aida' } });
  assert.equal(user.mode, 'edit');
  assert.equal(user.userId, 'u1');
  assert.equal(user.userData.nickname, 'Aida');

  const analytics = normalizeTrackAnalyticsEventIntent({ type: ' menu-scan ', payload: { cafeId: 'mano', resultsCount: '3' } });
  assert.equal(analytics.type, 'menu-scan');
  assert.equal(analytics.eventData.eventName, 'menu-scan');
  assert.equal(analytics.eventData.resultsCount, 3);

  const profile = normalizeRegisterUserProfileIntent({ userId: ' u1 ', profile: { nickname: ' Aida ', email: ' a@test.com ', language: 'ru' } });
  assert.equal(profile.userId, 'u1');
  assert.equal(profile.profile.nickname, 'Aida');
  assert.equal(profile.profile.email, 'a@test.com');
  assert.equal(profile.profile.role, 'user');
});

test('third-pass ICF intents are registered with every required stage', () => {
  const registrySource = readFileSync(new URL('../packages/icf/intents/intentRegistry.js', import.meta.url), 'utf8');
  const intentFiles = [
    '../packages/icf/intents/adminIntents.js',
    '../packages/icf/intents/analyticsIntents.js',
    '../packages/icf/intents/userIntents.js'
  ];
  const intentNames = [
    'AdminUpdateCafeIntent',
    'AdminUpdateCircleIntent',
    'AdminUpdateReviewIntent',
    'AdminDeleteReviewIntent',
    'AdminSaveUserIntent',
    'AdminDeleteUserIntent',
    'RegisterUserProfileIntent',
    'TrackAnalyticsEventIntent'
  ];
  const requiredStages = ['validate:', 'normalize:', 'addContext:', 'authorize:', 'process:', 'emit:'];

  for (const intentName of intentNames) {
    assert.ok(registrySource.includes(intentName), `${intentName} should be registered`);
  }

  for (const filePath of intentFiles) {
    const source = readFileSync(new URL(filePath, import.meta.url), 'utf8');
    for (const stage of requiredStages) {
      assert.ok(source.includes(stage), `${filePath} should include ${stage}`);
    }
  }
});

import {
  getOrderLinkHost,
  normalizeOrderLink,
  renderOrderLinkButtons,
  sortOrderLinks,
  trackOrderLinkClick,
  validateOrderLink
} from '../packages/domain/menus/orderLinks.js';

test('order link helpers validate safe external ordering links', () => {
  const whatsapp = normalizeOrderLink({
    type: 'whatsapp',
    label: 'Order on WhatsApp',
    url: ' https://wa.me/996555111222 ',
    sortOrder: '2'
  });

  assert.equal(whatsapp.type, 'whatsapp');
  assert.equal(whatsapp.url, 'https://wa.me/996555111222');
  assert.equal(getOrderLinkHost(whatsapp.url), 'wa.me');
  assert.equal(validateOrderLink(whatsapp).length, 0);

  assert.ok(validateOrderLink({ type: 'custom', label: 'Bad', url: 'javascript:alert(1)' }).some(error => error.code === 'unsafe-order-link-url'));
  assert.ok(validateOrderLink({ type: 'bank', label: 'Bank', url: 'https://example.com' }).some(error => error.code === 'unsupported-order-link-type'));
  assert.ok(validateOrderLink({ type: 'telegram', label: '', url: 'https://t.me/mycafe' }).some(error => error.code === 'missing-order-link-label'));
});

test('order link helpers render only active safe public buttons', () => {
  const html = renderOrderLinkButtons([
    { type: 'telegram', label: 'Telegram', url: 'https://t.me/mycafe', isActive: true, sortOrder: 2 },
    { type: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/996555111222', isActive: true, sortOrder: 1 },
    { type: 'custom', label: 'Hidden', url: 'https://example.com', isActive: false, sortOrder: 3 },
    { type: 'custom', label: 'Unsafe', url: 'javascript:alert(1)', isActive: true, sortOrder: 4 }
  ]);

  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.indexOf('WhatsApp') < html.indexOf('Telegram'));
  assert.equal(html.includes('Hidden'), false);
  assert.equal(html.includes('Unsafe'), false);
});

test('order link analytics helper stores host metadata and does not expose full URL', async () => {
  let capturedType = '';
  let capturedPayload = null;

  await trackOrderLinkClick('mano', 'latte', {
    type: 'glovo',
    label: 'Glovo',
    url: 'https://glovoapp.com/kg/en/bishkek/mycafe',
    isActive: true
  }, {
    language: 'en',
    source: 'publicMenu',
    userId: null,
    recordAnalyticsEvent: async function(type, payload) {
      capturedType = type;
      capturedPayload = payload;
      return 'event-1';
    }
  });

  assert.equal(capturedType, 'orderLinkClick');
  assert.equal(capturedPayload.urlHost, 'glovoapp.com');
  assert.equal(capturedPayload.url, undefined);
  assert.equal(capturedPayload.userId, null);
});

test('ICF menu validation rejects unsafe item order links and normalizes valid links', () => {
  const unsafeMenu = [{
    category_en: 'Coffee',
    items: [{
      name: 'Latte',
      price: '180',
      orderLinks: [{ type: 'whatsapp', label: 'Order', url: 'javascript:alert(1)' }]
    }]
  }];
  const safeMenu = [{
    category_en: 'Coffee',
    items: [{
      name: 'Latte',
      price: '180',
      orderLinks: [{ type: 'telegram', label: 'Telegram', url: 'https://t.me/mycafe', sortOrder: '3' }]
    }]
  }];

  assert.ok(validateUpdateCafeMenuIntent({ cafeId: 'mano', menu: unsafeMenu }).some(error => error.code === 'unsafe-order-link-url'));
  assert.ok(validateAdminUpdateCafeIntent({ cafeId: 'mano', cafePatch: { menu: unsafeMenu } }).some(error => error.code === 'unsafe-order-link-url'));

  const normalized = normalizeUpdateCafeMenuIntent({ cafeId: 'mano', menu: safeMenu });
  assert.equal(normalized.menu[0].items[0].orderLinks[0].type, 'telegram');
  assert.equal(normalized.menu[0].items[0].orderLinks[0].sortOrder, 3);
});

test('order link analytics normalization keeps only safe URL host fields', () => {
  const normalized = normalizeTrackAnalyticsEventIntent({
    type: 'orderLinkClick',
    payload: {
      cafeId: 'mano',
      itemId: 'latte',
      linkType: 'mbank',
      linkLabel: 'MBANK',
      url: 'https://mbank.kg/mcafe/mano',
      language: 'ru',
      source: 'publicMenu',
      userId: null
    }
  });

  assert.equal(normalized.eventData.type, 'orderLinkClick');
  assert.equal(normalized.eventData.urlHost, 'mbank.kg');
  assert.equal(normalized.eventData.url, undefined);
  assert.equal(normalized.eventData.userId, null);
});


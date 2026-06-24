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

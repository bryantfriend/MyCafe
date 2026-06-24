const admin = require('firebase-admin');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onObjectFinalized } = require('firebase-functions/v2/storage');
const logger = require('firebase-functions/logger');

admin.initializeApp();

const db = admin.firestore();

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', `${label} must be an object.`);
  }
}

async function getUserRole(uid) {
  if (!uid) return '';
  const snap = await db.doc(`users/${uid}`).get();
  return snap.exists ? snap.data().role || '' : '';
}

async function assertCafeAccess(uid, cafeId) {
  const role = await getUserRole(uid);
  if (role === 'admin') return;
  const cafeSnap = await db.doc(`cafes/${cafeId}`).get();
  if (!cafeSnap.exists) throw new HttpsError('not-found', 'Cafe not found.');
  const cafe = cafeSnap.data();
  const extraAdmins = Array.isArray(cafe.extraAdmins) ? cafe.extraAdmins : [];
  if (cafe.ownerId !== uid && !extraAdmins.includes(uid)) {
    throw new HttpsError('permission-denied', 'Cafe owner access required.');
  }
}

function cleanString(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

exports.recordAnalyticsEvent = onCall(async request => {
  assertObject(request.data, 'Analytics payload');
  const allowedTypes = new Set([
    'cafe-view',
    'menu-view',
    'menu-scan',
    'qr-open',
    'menu-item-view',
    'language-usage',
    'search',
    'favorite',
    'review-submit',
    'circle-rsvp',
    'game-engagement'
  ]);
  const type = cleanString(request.data.type, 80);
  if (!allowedTypes.has(type)) {
    throw new HttpsError('invalid-argument', 'Unsupported analytics event type.');
  }

  const event = {
    type,
    eventName: type,
    cafeId: cleanString(request.data.cafeId, 120),
    circleId: cleanString(request.data.circleId, 120),
    gameId: cleanString(request.data.gameId, 120),
    itemName: cleanString(request.data.itemName, 160),
    category: cleanString(request.data.category, 160),
    language: cleanString(request.data.language, 16),
    query: cleanString(request.data.query, 160),
    resultsCount: Number(request.data.resultsCount || 0),
    seats: Number(request.data.seats || 0),
    source: cleanString(request.data.source, 80),
    path: cleanString(request.data.path, 220),
    userId: request.auth?.uid || '',
    trusted: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const ref = await db.collection('analyticsEvents').add(event);
  return { id: ref.id };
});

exports.submitReview = onCall(async request => {
  assertObject(request.data, 'Review payload');
  const cafeId = cleanString(request.data.cafeId, 120);
  const rating = Number(request.data.rating);
  const text = cleanString(request.data.text, 2000);
  if (!cafeId || rating < 1 || rating > 5 || text.length < 12) {
    throw new HttpsError('invalid-argument', 'Review requires cafe, rating 1-5, and useful text.');
  }

  const review = {
    cafeId,
    cafeName: cleanString(request.data.cafeName, 160),
    userId: request.auth?.uid || '',
    name: cleanString(request.data.name, 120),
    rating,
    imageUrl: cleanString(request.data.imageUrl, 400),
    text,
    language: cleanString(request.data.language, 16),
    approved: false,
    flagged: false,
    moderationStatus: 'pending',
    trustedWrite: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const ref = await db.collection('reviews').add(review);
  await db.collection('analyticsEvents').add({
    type: 'review-submit',
    eventName: 'review-submit',
    cafeId,
    language: review.language,
    trusted: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { id: ref.id, moderationStatus: review.moderationStatus };
});

exports.reserveCircleSeat = onCall(async request => {
  assertObject(request.data, 'RSVP payload');
  const circleId = cleanString(request.data.circleId, 120);
  if (!circleId) throw new HttpsError('invalid-argument', 'Circle id is required.');

  const seats = Math.max(1, Number(request.data.seats || 1));
  const circleRef = db.doc(`cafeCircles/${circleId}`);
  const result = await db.runTransaction(async transaction => {
    const snap = await transaction.get(circleRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Circle not found.');
    const circle = snap.data();
    const capacity = Number(circle.capacity || 0);
    const rsvpCount = Number(circle.rsvpCount || 0);
    if (capacity && rsvpCount + seats > capacity) {
      throw new HttpsError('failed-precondition', 'Not enough seats left.');
    }
    const rsvp = {
      id: `rsvp-${Date.now()}`,
      userId: request.auth?.uid || '',
      name: cleanString(request.data.name, 120) || 'Guest',
      email: cleanString(request.data.email, 180),
      seats,
      status: 'confirmed',
      paid: false,
      createdAt: new Date().toISOString()
    };
    transaction.update(circleRef, {
      rsvp: admin.firestore.FieldValue.arrayUnion(rsvp),
      rsvpCount: rsvpCount + seats
    });
    return { rsvp, circle };
  });

  await db.collection('analyticsEvents').add({
    type: 'circle-rsvp',
    eventName: 'circle-rsvp',
    circleId,
    cafeId: result.circle.cafeId || result.circle.cafePartner?.cafeId || '',
    seats,
    trusted: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { rsvp: result.rsvp };
});

exports.syncLoyaltyEvents = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const events = Array.isArray(request.data?.events) ? request.data.events.slice(0, 50) : [];
  const safeEvents = events.map(event => ({
    id: cleanString(event.id, 120),
    type: cleanString(event.type, 80),
    cafeId: cleanString(event.cafeId, 120),
    gameId: cleanString(event.gameId, 120),
    itemTag: cleanString(event.itemTag, 120),
    xp: Number(event.xp || 0),
    createdAt: cleanString(event.createdAt, 80) || new Date().toISOString(),
    trusted: true
  })).filter(event => event.id && event.type);

  await db.doc(`users/${request.auth.uid}`).set({
    loyaltyEvents: admin.firestore.FieldValue.arrayUnion(...safeEvents),
    loyaltySyncedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { synced: safeEvents.length };
});

exports.recalculateCafeAnalytics = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const cafeId = cleanString(request.data?.cafeId, 120);
  await assertCafeAccess(request.auth.uid, cafeId);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const eventsSnap = await db.collection('analyticsEvents')
    .where('cafeId', '==', cafeId)
    .where('createdAt', '>=', since)
    .get();
  const counts = {};
  eventsSnap.forEach(doc => {
    const type = doc.data().type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  });
  await db.doc(`cafes/${cafeId}`).set({
    analyticsSummary: {
      sevenDayCounts: counts,
      recalculatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  }, { merge: true });
  return { counts };
});

exports.optimizeUploadedImage = onObjectFinalized({ cpu: 1, memory: '512MiB' }, async event => {
  const object = event.data;
  if (!object.contentType || !object.contentType.startsWith('image/')) return;
  logger.info('Image optimization hook received upload.', {
    bucket: object.bucket,
    name: object.name,
    size: object.size
  });
  // Production deployments can enable Sharp resizing here. The hook is installed now so
  // future generated thumbnails can be trusted server-side instead of client-written.
});

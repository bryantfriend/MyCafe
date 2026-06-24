import {
  addDoc,
  collection,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const analyticsCollection = 'analyticsEvents';

function nowTimestamp() {
  return Timestamp.now();
}

function normalizeEvent(type, payload = {}) {
  return {
    type,
    eventName: type,
    cafeId: payload.cafeId || '',
    cafeName: payload.cafeName || '',
    circleId: payload.circleId || '',
    gameId: payload.gameId || '',
    itemName: payload.itemName || '',
    category: payload.category || '',
    language: payload.language || '',
    query: payload.query || '',
    resultsCount: Number(payload.resultsCount || 0),
    seats: Number(payload.seats || 0),
    path: payload.path || (typeof window !== 'undefined' ? window.location.pathname : ''),
    source: payload.source || '',
    metadata: payload.metadata || {},
    createdAt: payload.createdAt || nowTimestamp()
  };
}

async function recordAnalyticsEvent(db, type, payload = {}) {
  try {
    return await addDoc(collection(db, analyticsCollection), normalizeEvent(type, payload));
  } catch (error) {
    console.warn('[analytics] Event unavailable.', error);
    return null;
  }
}

function getEventTime(event) {
  if (!event?.createdAt) return 0;
  if (event.createdAt.seconds) return event.createdAt.seconds * 1000;
  return new Date(event.createdAt).getTime() || 0;
}

function getWeekStart(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date.getTime();
}

function isThisWeek(event, referenceDate = new Date()) {
  return getEventTime(event) >= getWeekStart(referenceDate);
}

function countBy(events, key) {
  const counts = new Map();
  events.forEach(event => {
    const value = event[key] || 'Unknown';
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)));
}

function countType(events, type) {
  return events.filter(event => event.type === type || event.eventName === type).length;
}

function summarizeCafeGrowth(events = [], reviews = []) {
  const weekEvents = events.filter(event => isThisWeek(event));
  const topItems = countBy(weekEvents.filter(event => event.type === 'menu-item-view'), 'itemName');
  const topLanguages = countBy(weekEvents.filter(event => event.language), 'language');
  const topSearches = countBy(weekEvents.filter(event => event.type === 'search' && event.query), 'query');
  const topGames = countBy(weekEvents.filter(event => event.type === 'game-engagement'), 'gameId');
  const circleSeats = weekEvents
    .filter(event => event.type === 'circle-rsvp')
    .reduce((total, event) => total + Number(event.seats || 1), 0);
  const approvedReviews = reviews.filter(review => review.approved && !review.flagged);
  const averageRating = approvedReviews.length
    ? (approvedReviews.reduce((total, review) => total + Number(review.rating || 0), 0) / approvedReviews.length).toFixed(1)
    : 'n/a';

  const insights = [];
  if (topItems[0]) {
    insights.push(`Your ${topItems[0].label} was viewed ${topItems[0].count} time${topItems[0].count === 1 ? '' : 's'} this week.`);
  }
  if (topSearches[0]) {
    insights.push(`Guests searched for "${topSearches[0].label}" ${topSearches[0].count} time${topSearches[0].count === 1 ? '' : 's'} this week.`);
  }
  if (topLanguages[0]) {
    insights.push(`${topLanguages[0].label.toUpperCase()} is your most-used menu language this week.`);
  }
  if (circleSeats) {
    insights.push(`Circle RSVPs added ${circleSeats} reserved seat${circleSeats === 1 ? '' : 's'} this week.`);
  }
  if (!insights.length) {
    insights.push('Growth insights will appear after guests scan, search, favorite, review, RSVP, or play.');
  }

  return {
    averageRating,
    circleRsvps: countType(weekEvents, 'circle-rsvp'),
    circleSeats,
    cafeViews: countType(weekEvents, 'cafe-view'),
    favorites: countType(weekEvents, 'favorite'),
    gameEngagement: countType(weekEvents, 'game-engagement'),
    insights,
    languageUsage: topLanguages,
    menuItemViews: countType(weekEvents, 'menu-item-view'),
    menuScans: countType(weekEvents, 'menu-scan') + countType(weekEvents, 'qr-open'),
    menuViews: countType(weekEvents, 'menu-view'),
    qrOpens: countType(weekEvents, 'qr-open'),
    reviews: reviews.length,
    searches: countType(weekEvents, 'search'),
    topGames,
    topItems,
    topSearches,
    weekEvents
  };
}

export {
  normalizeEvent,
  recordAnalyticsEvent,
  summarizeCafeGrowth
};

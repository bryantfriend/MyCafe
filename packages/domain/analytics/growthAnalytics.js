import { runIntentPipeline } from '../../icf/pipeline/runIntentPipeline.js';

function nowTimestamp() {
  return new Date();
}

function normalizeEvent(type, payload) {
  var source = payload || {};
  return {
    type: type,
    eventName: type,
    eventType: source.eventType || type,
    cafeId: source.cafeId || '',
    cafeName: source.cafeName || '',
    circleId: source.circleId || '',
    gameId: source.gameId || '',
    itemId: source.itemId || '',
    itemName: source.itemName || '',
    category: source.category || '',
    language: source.language || '',
    query: source.query || '',
    resultsCount: Number(source.resultsCount || 0),
    seats: Number(source.seats || 0),
    linkType: source.linkType || '',
    linkLabel: source.linkLabel || '',
    urlHost: source.urlHost || '',
    userId: source.userId || null,
    path: source.path || (typeof window !== 'undefined' ? window.location.pathname : ''),
    source: source.source || '',
    metadata: source.metadata || {},
    createdAt: source.createdAt || nowTimestamp()
  };
}

async function recordAnalyticsEvent(db, type, payload) {
  try {
    var result = await runIntentPipeline('TrackAnalyticsEventIntent', {
      type: type,
      payload: payload || {}
    });
    if (!result.ok) {
      return null;
    }
    return result.data ? result.data.eventId : null;
  } catch (error) {
    console.warn('[analytics] Event unavailable.', error);
    return null;
  }
}

function getEventTime(event) {
  if (!event || !event.createdAt) {
    return 0;
  }

  if (event.createdAt.seconds) {
    return event.createdAt.seconds * 1000;
  }

  return new Date(event.createdAt).getTime() || 0;
}

function getWeekStart(referenceDate) {
  var date = new Date(referenceDate || new Date());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date.getTime();
}

function isThisWeek(event, referenceDate) {
  return getEventTime(event) >= getWeekStart(referenceDate || new Date());
}

function countBy(events, key) {
  var counts = new Map();
  var rows = [];
  var i = 0;

  for (i = 0; i < events.length; i += 1) {
    var value = events[i][key] || 'Unknown';
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  counts.forEach(function(count, label) {
    rows.push({ label: label, count: count });
  });

  rows.sort(function(firstRow, secondRow) {
    if (firstRow.count !== secondRow.count) {
      return secondRow.count - firstRow.count;
    }

    return String(firstRow.label).localeCompare(String(secondRow.label));
  });

  return rows;
}

function countType(events, type) {
  var count = 0;
  var i = 0;

  for (i = 0; i < events.length; i += 1) {
    if (events[i].type === type || events[i].eventName === type) {
      count += 1;
    }
  }

  return count;
}

function getFilteredEvents(events, matcher) {
  var filtered = [];
  var i = 0;

  for (i = 0; i < events.length; i += 1) {
    if (matcher(events[i])) {
      filtered.push(events[i]);
    }
  }

  return filtered;
}

function getCircleSeats(weekEvents) {
  var total = 0;
  var circleEvents = getFilteredEvents(weekEvents, function(event) {
    return event.type === 'circle-rsvp';
  });
  var i = 0;

  for (i = 0; i < circleEvents.length; i += 1) {
    total += Number(circleEvents[i].seats || 1);
  }

  return total;
}

function getApprovedReviews(reviews) {
  return getFilteredEvents(reviews, function(review) {
    return review.approved && !review.flagged;
  });
}

function getAverageRating(approvedReviews) {
  var total = 0;
  var i = 0;

  if (!approvedReviews.length) {
    return 'n/a';
  }

  for (i = 0; i < approvedReviews.length; i += 1) {
    total += Number(approvedReviews[i].rating || 0);
  }

  return (total / approvedReviews.length).toFixed(1);
}

function summarizeCafeGrowth(events, reviews) {
  var safeEvents = Array.isArray(events) ? events : [];
  var safeReviews = Array.isArray(reviews) ? reviews : [];
  var weekEvents = getFilteredEvents(safeEvents, function(event) {
    return isThisWeek(event);
  });
  var topItems = countBy(getFilteredEvents(weekEvents, function(event) {
    return event.type === 'menu-item-view';
  }), 'itemName');
  var topLanguages = countBy(getFilteredEvents(weekEvents, function(event) {
    return Boolean(event.language);
  }), 'language');
  var topSearches = countBy(getFilteredEvents(weekEvents, function(event) {
    return event.type === 'search' && event.query;
  }), 'query');
  var topGames = countBy(getFilteredEvents(weekEvents, function(event) {
    return event.type === 'game-engagement';
  }), 'gameId');
  var topOrderLinks = countBy(getFilteredEvents(weekEvents, function(event) {
    return event.type === 'orderLinkClick';
  }), 'linkType');
  var circleSeats = getCircleSeats(weekEvents);
  var approvedReviews = getApprovedReviews(safeReviews);
  var averageRating = getAverageRating(approvedReviews);
  var insights = [];

  if (topItems[0]) {
    insights.push('Your ' + topItems[0].label + ' was viewed ' + topItems[0].count + ' time' + (topItems[0].count === 1 ? '' : 's') + ' this week.');
  }
  if (topOrderLinks[0]) {
    insights.push(topOrderLinks[0].label + ' order links were tapped ' + topOrderLinks[0].count + ' time' + (topOrderLinks[0].count === 1 ? '' : 's') + ' this week.');
  }
  if (topSearches[0]) {
    insights.push('Guests searched for "' + topSearches[0].label + '" ' + topSearches[0].count + ' time' + (topSearches[0].count === 1 ? '' : 's') + ' this week.');
  }
  if (topLanguages[0]) {
    insights.push(String(topLanguages[0].label).toUpperCase() + ' is your most-used menu language this week.');
  }
  if (circleSeats) {
    insights.push('Circle RSVPs added ' + circleSeats + ' reserved seat' + (circleSeats === 1 ? '' : 's') + ' this week.');
  }
  if (!insights.length) {
    insights.push('Growth insights will appear after guests scan, search, favorite, review, RSVP, order, or play.');
  }

  return {
    averageRating: averageRating,
    circleRsvps: countType(weekEvents, 'circle-rsvp'),
    circleSeats: circleSeats,
    cafeViews: countType(weekEvents, 'cafe-view'),
    favorites: countType(weekEvents, 'favorite'),
    gameEngagement: countType(weekEvents, 'game-engagement'),
    insights: insights,
    languageUsage: topLanguages,
    menuItemViews: countType(weekEvents, 'menu-item-view'),
    menuScans: countType(weekEvents, 'menu-scan') + countType(weekEvents, 'qr-open'),
    menuViews: countType(weekEvents, 'menu-view'),
    orderLinkClicks: countType(weekEvents, 'orderLinkClick'),
    qrOpens: countType(weekEvents, 'qr-open'),
    reviews: safeReviews.length,
    searches: countType(weekEvents, 'search'),
    topGames: topGames,
    topItems: topItems,
    topOrderLinks: topOrderLinks,
    topSearches: topSearches,
    weekEvents: weekEvents
  };
}

export {
  normalizeEvent,
  recordAnalyticsEvent,
  summarizeCafeGrowth
};

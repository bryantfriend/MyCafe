const localKey = "mycafe:loyalty";

const questCatalog = [
  {
    id: "visit-three-cafes",
    name: "Visit 3 cafes this week",
    description: "Open QR menus or cafe pages at three different cafes.",
    eventType: "visit",
    target: 3,
    scope: "uniqueCafe",
    xp: 90,
    coupon: { id: "cafe-hop-10", title: "Cafe Hop 10%", description: "Show this coupon for a cafe-hop reward." }
  },
  {
    id: "photo-review",
    name: "Review with a photo",
    description: "Leave a review that includes a visit photo.",
    eventType: "photo-review",
    target: 1,
    xp: 60,
    coupon: { id: "photo-friend-dessert", title: "Photo Friend Dessert", description: "Unlocks a dessert perk when a cafe opts in." }
  },
  {
    id: "play-while-waiting",
    name: "Play while waiting",
    description: "Play any MyCafe game from a cafe session.",
    eventType: "game-play",
    target: 1,
    xp: 35,
    coupon: { id: "waiting-game-perk", title: "Waiting Game Perk", description: "Use after a game session for a small cafe reward." }
  },
  {
    id: "save-three-favorites",
    name: "Save 3 favorites",
    description: "Build your personal cafe shortlist.",
    eventType: "favorite",
    target: 3,
    scope: "uniqueCafe",
    xp: 45
  },
  {
    id: "try-dessert",
    name: "Try a dessert",
    description: "Open or order a dessert-tagged menu item.",
    eventType: "dessert-action",
    target: 1,
    xp: 40,
    coupon: { id: "dessert-trail", title: "Dessert Trail", description: "A dessert quest reward for participating cafes." }
  }
];

const badgeCatalog = [
  { id: "first-review", name: "First Review", requirement: "Leave one review.", eventType: "review", target: 1, xp: 20 },
  { id: "photo-friend", name: "Photo Friend", requirement: "Leave a review with a photo.", eventType: "photo-review", target: 1, xp: 20 },
  { id: "cafe-explorer", name: "Cafe Explorer", requirement: "Visit three unique cafes.", eventType: "visit", target: 3, scope: "uniqueCafe", xp: 30 },
  { id: "game-break", name: "Game Break", requirement: "Play a MyCafe game.", eventType: "game-play", target: 1, xp: 15 },
  { id: "regular", name: "Regular", requirement: "Reach 250 XP.", xpTarget: 250, xp: 0 }
];

function readLocalLoyalty() {
  try {
    return JSON.parse(localStorage.getItem(localKey) || "{}");
  } catch {
    return {};
  }
}

function writeLocalLoyalty(state) {
  localStorage.setItem(localKey, JSON.stringify(state || {}));
}

function normalizeLoyaltyState(state) {
  return {
    events: Array.isArray(state?.events) ? state.events : [],
    coupons: Array.isArray(state?.coupons) ? state.coupons : [],
    syncedEventIds: Array.isArray(state?.syncedEventIds) ? state.syncedEventIds : []
  };
}

function createEventId() {
  return `loyalty-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function recordLocalLoyaltyEvent(type, payload) {
  const state = normalizeLoyaltyState(readLocalLoyalty());
  const dedupeKey = payload?.dedupeKey || "";
  if (dedupeKey) {
    const existing = state.events.find(event => event.type === type && event.dedupeKey === dedupeKey);
    if (existing) return existing;
  }

  const event = {
    id: createEventId(),
    type,
    cafeId: payload?.cafeId || "",
    gameId: payload?.gameId || "",
    itemTag: payload?.itemTag || "",
    dedupeKey,
    xp: Number(payload?.xp || 0),
    createdAt: new Date().toISOString()
  };
  state.events.push(event);
  writeLocalLoyalty(state);
  return event;
}

function getEventTimestamp(event) {
  if (!event?.createdAt) return 0;
  if (event.createdAt.seconds) return event.createdAt.seconds * 1000;
  return new Date(event.createdAt).getTime() || 0;
}

function getWeekStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date.getTime();
}

function getRelevantEvents(events, quest) {
  const weekStart = getWeekStart();
  return (events || []).filter(event => {
    if (event.type !== quest.eventType) return false;
    if (quest.id === "visit-three-cafes" && getEventTimestamp(event) < weekStart) return false;
    return true;
  });
}

function getProgress(events, config) {
  const relevant = getRelevantEvents(events, config);
  if (config.scope === "uniqueCafe") {
    return new Set(relevant.map(event => event.cafeId).filter(Boolean)).size;
  }
  return relevant.length;
}

function unlockCoupons(existingCoupons, completedQuests) {
  const byId = new Map((existingCoupons || []).map(coupon => [coupon.id, coupon]));
  completedQuests.forEach(quest => {
    if (!quest.coupon) return;
    if (!byId.has(quest.coupon.id)) {
      byId.set(quest.coupon.id, {
        ...quest.coupon,
        questId: quest.id,
        unlockedAt: new Date().toISOString(),
        redeemed: false
      });
    }
  });
  return [...byId.values()];
}

function mergeEvents(userData, localState) {
  const normalizedLocal = normalizeLoyaltyState(localState);
  const byId = new Map();
  [
    ...(Array.isArray(userData?.loyaltyEvents) ? userData.loyaltyEvents : []),
    ...normalizedLocal.events
  ].forEach(event => {
    if (!event?.id || byId.has(event.id)) return;
    byId.set(event.id, event);
  });
  return [...byId.values()];
}

function evaluateLoyalty(userData, localState) {
  const normalizedLocal = normalizeLoyaltyState(localState);
  const events = mergeEvents(userData, normalizedLocal);
  const baseXp = Number(userData?.xp || 0);
  const eventXp = events.reduce((total, event) => total + Number(event.xp || 0), 0);
  const xp = baseXp + eventXp;

  const quests = questCatalog.map(quest => {
    const progress = Math.min(quest.target, getProgress(events, quest));
    return {
      ...quest,
      progress,
      completed: progress >= quest.target
    };
  });

  const badges = badgeCatalog.map(badge => {
    const progress = badge.xpTarget ? xp : Math.min(badge.target, getProgress(events, badge));
    return {
      ...badge,
      progress,
      unlocked: badge.xpTarget ? xp >= badge.xpTarget : progress >= badge.target
    };
  });

  const completedQuests = quests.filter(quest => quest.completed);
  const coupons = unlockCoupons([
    ...(Array.isArray(userData?.coupons) ? userData.coupons : []),
    ...normalizedLocal.coupons
  ], completedQuests);

  return {
    badges,
    coupons,
    events,
    level: Math.max(1, Math.floor(xp / 100) + 1),
    quests,
    xp
  };
}

function getUnsyncedLocalEvents(userData, localState) {
  const normalizedLocal = normalizeLoyaltyState(localState);
  const synced = new Set([
    ...(Array.isArray(userData?.loyaltyEvents) ? userData.loyaltyEvents.map(event => event.id) : []),
    ...normalizedLocal.syncedEventIds
  ]);
  return normalizedLocal.events.filter(event => !synced.has(event.id));
}

function markLocalEventsSynced(events) {
  const state = normalizeLoyaltyState(readLocalLoyalty());
  const synced = new Set(state.syncedEventIds);
  events.forEach(event => synced.add(event.id));
  state.syncedEventIds = [...synced];
  writeLocalLoyalty(state);
}

export {
  badgeCatalog,
  evaluateLoyalty,
  getUnsyncedLocalEvents,
  markLocalEventsSynced,
  questCatalog,
  readLocalLoyalty,
  recordLocalLoyaltyEvent,
  writeLocalLoyalty
};

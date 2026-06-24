const cafePlanCatalog = [
  {
    id: "free-listing",
    name: "Free listing",
    priceLabel: "Free",
    description: "Public cafe profile with basic search visibility.",
    features: ["profile", "photos", "reviews"],
    recommendedFor: "New cafes and proof-of-demand listings."
  },
  {
    id: "qr-menu-pro",
    name: "QR Menu Pro",
    priceLabel: "Paid monthly",
    description: "Mobile QR menu, categories, item photos, allergens, availability, order and waiter hooks.",
    features: ["qrMenu", "menuPhotos", "allergens", "orderHooks"],
    recommendedFor: "Cafes ready to replace paper menus."
  },
  {
    id: "translation-pro",
    name: "Translation Pro",
    priceLabel: "Paid monthly",
    description: "Translation coverage, missing-language warnings, drafts, and admin review workflow.",
    features: ["translations", "translationDrafts", "translationReview"],
    recommendedFor: "Tourist-heavy cafes and multilingual menus."
  },
  {
    id: "analytics-pro",
    name: "Analytics Pro",
    priceLabel: "Paid monthly",
    description: "QR opens, menu views, review trends, menu demand, and growth reporting.",
    features: ["analytics"],
    legacyFlags: ["premiumAnalyticsEnabled"],
    recommendedFor: "Owners who want measurable growth."
  },
  {
    id: "sponsored-placement",
    name: "Sponsored Placement",
    priceLabel: "Campaign",
    description: "Featured ranking, homepage placement, and campaign notes for admin operators.",
    features: ["sponsoredPlacement"],
    recommendedFor: "Launches, seasonal offers, and local promos."
  },
  {
    id: "games-lessons-bundle",
    name: "Games/Lessons bundle",
    priceLabel: "Paid monthly",
    description: "Cafe-branded waiting games plus language lessons and ordering practice.",
    features: ["games", "lessons"],
    legacyFlags: ["premiumGamesEnabled", "premiumLessonsEnabled"],
    recommendedFor: "Cafes with table wait time or family/social traffic."
  },
  {
    id: "event-circles-package",
    name: "Event/Circles package",
    priceLabel: "Revenue share",
    description: "Paid Circles marketplace tools, RSVPs, attendees, partner terms, and payout tracking.",
    features: ["circles", "events", "payouts"],
    recommendedFor: "Cafes that host community tables and paid events."
  }
];

const defaultMonetization = {
  activePackageIds: ["free-listing"],
  status: "free",
  trialStartedAt: "",
  trialEndsAt: "",
  expiresAt: "",
  invoices: [],
  adminNotes: ""
};

function normalizeDateValue(value) {
  if (!value) return "";
  const date = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizeMonetization(cafe) {
  const monetization = cafe?.monetization || {};
  const legacyPackageIds = cafePlanCatalog
    .filter(plan => (plan.legacyFlags || []).some(flag => cafe?.[flag]))
    .map(plan => plan.id);
  const activePackageIds = Array.from(new Set([
    "free-listing",
    ...(Array.isArray(monetization.activePackageIds) ? monetization.activePackageIds : []),
    ...legacyPackageIds
  ]));

  return {
    ...defaultMonetization,
    ...monetization,
    activePackageIds,
    trialStartedAt: normalizeDateValue(monetization.trialStartedAt),
    trialEndsAt: normalizeDateValue(monetization.trialEndsAt),
    expiresAt: normalizeDateValue(monetization.expiresAt),
    invoices: Array.isArray(monetization.invoices) ? monetization.invoices : []
  };
}

function getPlanById(planId) {
  return cafePlanCatalog.find(plan => plan.id === planId) || null;
}

function isPlanActive(cafe, planId) {
  return normalizeMonetization(cafe).activePackageIds.includes(planId);
}

function getActivePlans(cafe) {
  const monetization = normalizeMonetization(cafe);
  return monetization.activePackageIds
    .map(getPlanById)
    .filter(Boolean);
}

function getActivePlanNames(cafe) {
  return getActivePlans(cafe).map(plan => plan.name);
}

function getPlanStatus(cafe) {
  const monetization = normalizeMonetization(cafe);
  const now = Date.now();
  const trialEnds = monetization.trialEndsAt ? new Date(monetization.trialEndsAt).getTime() : 0;
  const expires = monetization.expiresAt ? new Date(monetization.expiresAt).getTime() : 0;

  if (expires && expires < now) return { code: "expired", label: "Expired" };
  if (trialEnds && trialEnds >= now) return { code: "trial", label: "Trial active" };
  if (monetization.status === "trial") return { code: "trial", label: "Trial active" };
  if (monetization.status === "expired") return { code: "expired", label: "Expired" };
  if (monetization.status === "paid") return { code: "paid", label: "Paid active" };
  if (monetization.status === "paused") return { code: "paused", label: "Paused" };
  return { code: "free", label: "Free" };
}

function getInvoiceTotal(cafe) {
  return normalizeMonetization(cafe).invoices.reduce((total, invoice) => {
    return total + Number(invoice.amount || 0);
  }, 0);
}

function getLegacyPremiumFlags(activePackageIds) {
  const flags = {};
  cafePlanCatalog.forEach(plan => {
    (plan.legacyFlags || []).forEach(flag => {
      flags[flag] = activePackageIds.includes(plan.id);
    });
  });
  return flags;
}

function buildMonetizationPayload(input) {
  const activePackageIds = Array.from(new Set(["free-listing", ...(input.activePackageIds || [])]));
  const monetization = {
    activePackageIds,
    status: input.status || "free",
    trialStartedAt: input.trialStartedAt || "",
    trialEndsAt: input.trialEndsAt || "",
    expiresAt: input.expiresAt || "",
    invoices: Array.isArray(input.invoices) ? input.invoices : [],
    adminNotes: input.adminNotes || "",
    updatedAt: new Date().toISOString()
  };

  return {
    monetization,
    ...getLegacyPremiumFlags(activePackageIds)
  };
}

export {
  buildMonetizationPayload,
  cafePlanCatalog,
  getActivePlanNames,
  getActivePlans,
  getInvoiceTotal,
  getLegacyPremiumFlags,
  getPlanById,
  getPlanStatus,
  isPlanActive,
  normalizeMonetization
};

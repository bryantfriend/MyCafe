const blockedReviewTerms = [
  "casino",
  "crypto profit",
  "free money",
  "loan now",
  "telegram pump",
  "whatsapp only"
];

function createReviewEditToken() {
  const bytes = new Uint8Array(16);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getReviewEditUrl(reviewId, editToken) {
  return `review-edit.html?id=${encodeURIComponent(reviewId)}&token=${encodeURIComponent(editToken)}`;
}

function getUserTrustLevel(userData) {
  if (!userData) {
    return { key: "guest", label: "Guest", autoApprove: false, score: 0 };
  }

  if (userData.flagged) {
    return { key: "restricted", label: "Restricted", autoApprove: false, score: 0 };
  }

  const level = Number(userData.level || 1);
  const approvedReviews = Number(userData.approvedReviewCount || userData.reviewStats?.approved || 0);

  if (level >= 4 || approvedReviews >= 10) {
    return { key: "trusted", label: "Trusted", autoApprove: true, score: 90 };
  }

  if (level >= 2 || approvedReviews >= 3) {
    return { key: "known", label: "Known reviewer", autoApprove: true, score: 65 };
  }

  return { key: "new", label: "New reviewer", autoApprove: false, score: 30 };
}

function getSpamFlags(review, context) {
  const flags = [];
  const text = String(review.text || "").trim();
  const normalized = text.toLowerCase();
  const urlCount = (text.match(/https?:\/\//g) || []).length;

  if (text.length < 12) flags.push("too-short");
  if (urlCount > 1) flags.push("too-many-links");
  if (/(.)\1{8,}/.test(normalized)) flags.push("repeated-characters");
  if (blockedReviewTerms.some(term => normalized.includes(term))) flags.push("blocked-term");
  if (context?.recentSubmissionSeconds && context.recentSubmissionSeconds < 45) flags.push("rapid-repeat");
  if (review.rating < 1 || review.rating > 5) flags.push("invalid-rating");

  return flags;
}

function getVerifiedVisit(userData, cafeId) {
  const visits = userData?.verifiedVisits || userData?.visits || [];
  if (Array.isArray(visits)) {
    return visits.some(visit => {
      if (typeof visit === "string") return visit === cafeId;
      return visit.cafeId === cafeId && visit.verified !== false;
    });
  }

  return false;
}

function evaluateReviewTrust(review, userData, context) {
  const trust = getUserTrustLevel(userData);
  const spamFlags = getSpamFlags(review, context);
  const verifiedVisit = !!review.verifiedVisit || getVerifiedVisit(userData, review.cafeId);
  const hasPhoto = !!review.imageUrl;
  const autoApprove = trust.autoApprove && spamFlags.length === 0 && !userData?.flagged;

  return {
    approved: autoApprove,
    moderationStatus: autoApprove ? "auto-approved" : "pending",
    trustLevel: trust.key,
    trustLabel: trust.label,
    trustScore: trust.score + (verifiedVisit ? 10 : 0) + (hasPhoto ? 5 : 0) - (spamFlags.length * 20),
    verifiedVisit,
    hasPhoto,
    spamFlags,
    spamScore: spamFlags.length,
    flagged: spamFlags.length > 0,
    flagReason: spamFlags.length ? spamFlags.join(", ") : ""
  };
}

function getReviewBadgeLabels(review) {
  const badges = [];
  if (review.verifiedVisit) badges.push("Verified visit");
  if (review.imageUrl) badges.push("Photo review");
  if (review.moderationStatus === "auto-approved") badges.push("Auto-approved");
  if (review.trustLabel) badges.push(review.trustLabel);
  return badges;
}

export {
  createReviewEditToken,
  evaluateReviewTrust,
  getReviewBadgeLabels,
  getReviewEditUrl,
  getUserTrustLevel
};

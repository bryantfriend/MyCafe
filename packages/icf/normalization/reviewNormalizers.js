function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeSubmitCafeReviewIntent(payload) {
  return {
    cafeId: normalizeText(payload.cafeId),
    cafeName: normalizeText(payload.cafeName),
    userId: normalizeText(payload.userId),
    name: normalizeText(payload.name),
    email: normalizeText(payload.email),
    rating: Number(payload.rating),
    imageUrl: normalizeText(payload.imageUrl),
    text: normalizeText(payload.text),
    language: normalizeText(payload.language || "en"),
    recentReviewContext: payload.recentReviewContext || {}
  };
}

function normalizeUpdateReviewOwnerResponseIntent(payload) {
  return {
    reviewId: normalizeText(payload.reviewId),
    action: normalizeText(payload.action),
    ownerReply: normalizeText(payload.ownerReply)
  };
}

function normalizeEditReviewWithTokenIntent(payload) {
  return {
    reviewId: normalizeText(payload.reviewId),
    editToken: normalizeText(payload.editToken),
    name: normalizeText(payload.name),
    rating: Number(payload.rating),
    imageUrl: normalizeText(payload.imageUrl),
    text: normalizeText(payload.text)
  };
}

export {
  normalizeEditReviewWithTokenIntent,
  normalizeSubmitCafeReviewIntent,
  normalizeUpdateReviewOwnerResponseIntent
};

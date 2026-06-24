function normalizeReviewLanguage(value) {
  const language = String(value || "ru").trim().toLowerCase();
  return language || "ru";
}

export { normalizeReviewLanguage };

function validateReviewRating(value) {
  const rating = Number(value);
  return rating >= 1 && rating <= 5;
}

export { validateReviewRating };

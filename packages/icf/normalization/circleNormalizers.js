function normalizeBudget(value) {
  const budget = Number(value || 0);
  return Number.isNaN(budget) ? 0 : budget;
}

export { normalizeBudget };

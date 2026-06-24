function validateCircleBudget(value) {
  const budget = Number(value);
  return !Number.isNaN(budget) && budget >= 0;
}

export { validateCircleBudget };

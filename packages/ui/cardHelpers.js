function createCard(className) {
  const card = document.createElement("div");
  card.className = className || "bg-white rounded shadow p-4";
  return card;
}

export { createCard };

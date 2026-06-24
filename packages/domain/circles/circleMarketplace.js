const defaultTemplates = [
  { id: "coffee-chat", name: "Coffee Chat", description: "Low-cost social table with guided prompts." },
  { id: "tasting-night", name: "Tasting Night", description: "Paid tasting menu with a partner cafe." },
  { id: "family-circle", name: "Family Circle", description: "Warm host-led group with gifts and shared food." },
  { id: "language-table", name: "Language Table", description: "Practice conversation with cafe games and snacks." }
];

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getRsvps(circle) {
  return Array.isArray(circle?.rsvp) ? circle.rsvp : [];
}

function getConfirmedRsvps(circle) {
  return getRsvps(circle).filter(person => (person.status || "confirmed") !== "canceled");
}

function getCapacity(circle) {
  return Math.max(0, toNumber(circle?.capacity || circle?.maxGuests || circle?.seats, 0));
}

function getAttendeeCount(circle) {
  return Math.max(toNumber(circle?.rsvpCount, 0), getConfirmedRsvps(circle).length);
}

function getSeatSummary(circle) {
  const capacity = getCapacity(circle);
  const attending = getAttendeeCount(circle);
  const seatsLeft = capacity ? Math.max(0, capacity - attending) : null;
  return { attending, capacity, seatsLeft, soldOut: capacity > 0 && seatsLeft === 0 };
}

function getTicketPrice(circle) {
  return toNumber(circle?.pricePerSeat || circle?.ticketPrice || circle?.costPerGuest || 0);
}

function getBudget(circle) {
  const budget = circle?.budget || {};
  return {
    total: toNumber(budget.total || circle?.budgetTotal || 0),
    gifts: toNumber(budget.gifts || 0),
    food: toNumber(budget.food || 0),
    salary: toNumber(budget.salary || budget.hostSalary || 0),
    marketing: toNumber(budget.marketing || 0),
    venue: toNumber(budget.venue || 0)
  };
}

function getRevenueSummary(circle) {
  const attendeeCount = getAttendeeCount(circle);
  const ticketPrice = getTicketPrice(circle);
  const grossRevenue = toNumber(circle?.grossRevenue, attendeeCount * ticketPrice);
  const budget = getBudget(circle);
  const partnerSharePercent = toNumber(circle?.cafePartner?.sharePercent || circle?.partnerSharePercent || 0);
  const platformFeePercent = toNumber(circle?.platformFeePercent || 10);
  const partnerShare = Math.round(grossRevenue * (partnerSharePercent / 100));
  const platformFee = Math.round(grossRevenue * (platformFeePercent / 100));
  const estimatedPayout = Math.max(0, grossRevenue - partnerShare - platformFee - budget.food - budget.gifts - budget.venue - budget.marketing);
  return {
    attendeeCount,
    ticketPrice,
    grossRevenue,
    partnerShare,
    partnerSharePercent,
    platformFee,
    platformFeePercent,
    estimatedPayout,
    paidOut: toNumber(circle?.payout?.amountPaid || 0),
    payoutStatus: circle?.payout?.paid ? "paid" : "pending"
  };
}

function getTemplate(circle) {
  const templateId = circle?.templateId || circle?.template || "coffee-chat";
  return defaultTemplates.find(template => template.id === templateId) || defaultTemplates[0];
}

function getRecurringLabel(circle) {
  const recurrence = circle?.recurrence || {};
  if (!recurrence.enabled && !circle?.recurring) return "One-time event";
  const cadence = recurrence.cadence || circle?.recurring || "weekly";
  const count = recurrence.count ? `${recurrence.count} sessions` : "ongoing";
  return `${cadence} · ${count}`;
}

function getPostEventProof(circle) {
  const proof = circle?.postEvent || {};
  return {
    photos: Array.isArray(proof.photos) ? proof.photos : [],
    reviews: Array.isArray(proof.reviews) ? proof.reviews : [],
    summary: proof.summary || ""
  };
}

function buildLocalRsvp(circleId, formData) {
  return {
    id: `local-rsvp-${Date.now()}`,
    circleId,
    name: formData.name || "Guest",
    email: formData.email || "",
    seats: Math.max(1, toNumber(formData.seats, 1)),
    status: "confirmed",
    paid: false,
    createdAt: new Date().toISOString()
  };
}

export {
  buildLocalRsvp,
  defaultTemplates,
  getAttendeeCount,
  getBudget,
  getCapacity,
  getConfirmedRsvps,
  getPostEventProof,
  getRecurringLabel,
  getRevenueSummary,
  getSeatSummary,
  getTemplate,
  getTicketPrice
};

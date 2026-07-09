function setText(element, value) {
  if (element) {
    element.textContent = value || "";
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, function(character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[character];
  });
}

function getTimestampDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value, fallback) {
  const date = getTimestampDate(value);
  return date ? date.toLocaleString() : fallback || "Date soon";
}

function setStatus(element, message, type) {
  if (!element) return;
  element.textContent = message || "";
  element.dataset.status = type || "info";
}

function isSafeHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export { escapeHtml, formatDateTime, getTimestampDate, isSafeHttpUrl, setStatus, setText };

const supportedOrderLinkTypes = [
  "whatsapp",
  "telegram",
  "glovo",
  "yandex",
  "twogis",
  "googleMaps",
  "mbank",
  "custom"
];

const orderLinkLabels = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  glovo: "Glovo",
  yandex: "Yandex",
  twogis: "2GIS",
  googleMaps: "Google Maps",
  mbank: "MBANK",
  custom: "Order Link"
};

const orderLinkIcons = {
  whatsapp: "WA",
  telegram: "TG",
  glovo: "GV",
  yandex: "YX",
  twogis: "2G",
  googleMaps: "GM",
  mbank: "MB",
  custom: "↗"
};

function normalizeOrderLinkText(value) {
  return String(value || "").trim();
}

function isSupportedOrderLinkType(type) {
  var normalizedType = normalizeOrderLinkText(type);
  return supportedOrderLinkTypes.indexOf(normalizedType) >= 0;
}

function createOrderLinkId(type, label, sortOrder) {
  var raw = [type || "custom", label || "link", String(sortOrder || 1)].join("-");
  var safe = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return safe || "custom-link";
}

function getOrderLinkUrl(rawLink) {
  if (!rawLink) {
    return "";
  }

  return normalizeOrderLinkText(rawLink.url);
}

function isSafeOrderLinkUrl(url) {
  var value = normalizeOrderLinkText(url);
  var parsed = null;

  if (!value) {
    return false;
  }

  if (value.toLowerCase().indexOf("javascript:") === 0) {
    return false;
  }

  try {
    parsed = new URL(value);
  } catch (error) {
    return false;
  }

  if (parsed.protocol === "https:") {
    return true;
  }

  if (parsed.protocol === "tg:") {
    return true;
  }

  return false;
}

function getOrderLinkHost(url) {
  var value = normalizeOrderLinkText(url);
  var parsed = null;

  try {
    parsed = new URL(value);
  } catch (error) {
    return "";
  }

  return parsed.hostname || parsed.protocol.replace(":", "");
}

function normalizeOrderLink(rawLink) {
  var source = rawLink || {};
  var type = normalizeOrderLinkText(source.type || "custom");
  var label = normalizeOrderLinkText(source.label || getOrderLinkLabel(type, ""));
  var url = getOrderLinkUrl(source);
  var sortOrder = Number(source.sortOrder || 1);
  var now = new Date().toISOString();

  if (!isSupportedOrderLinkType(type)) {
    type = "custom";
  }

  if (!Number.isFinite(sortOrder) || sortOrder < 1) {
    sortOrder = 1;
  }

  return {
    id: normalizeOrderLinkText(source.id) || createOrderLinkId(type, label, sortOrder),
    type: type,
    label: label,
    url: url,
    isActive: source.isActive === false ? false : true,
    sortOrder: sortOrder,
    createdAt: source.createdAt || now,
    updatedAt: source.updatedAt || now
  };
}

function validateOrderLink(rawLink) {
  var errors = [];
  var link = rawLink || {};
  var type = normalizeOrderLinkText(link.type);
  var label = normalizeOrderLinkText(link.label);
  var url = getOrderLinkUrl(link);
  var isActive = link.isActive === false ? false : true;

  if (!type) {
    errors.push({ code: "missing-order-link-type", field: "type", message: "Order link type is required." });
  } else if (!isSupportedOrderLinkType(type)) {
    errors.push({ code: "unsupported-order-link-type", field: "type", message: "Order link type is not supported." });
  }

  if (!label) {
    errors.push({ code: "missing-order-link-label", field: "label", message: "Order link label is required." });
  }

  if (!url) {
    errors.push({ code: "missing-order-link-url", field: "url", message: "Order link URL is required." });
  } else if (!isSafeOrderLinkUrl(url)) {
    errors.push({ code: "unsafe-order-link-url", field: "url", message: "Use a safe https:// link or supported Telegram deep link." });
  }

  if (isActive && (!label || !url)) {
    errors.push({ code: "empty-active-order-link", field: "orderLinks", message: "Active order links need both a label and URL." });
  }

  return errors;
}

function getOrderLinkIcon(type) {
  var normalizedType = normalizeOrderLinkText(type);
  return orderLinkIcons[normalizedType] || orderLinkIcons.custom;
}

function getOrderLinkLabel(type, fallbackLabel) {
  var fallback = normalizeOrderLinkText(fallbackLabel);
  var normalizedType = normalizeOrderLinkText(type);

  if (fallback) {
    return fallback;
  }

  return orderLinkLabels[normalizedType] || orderLinkLabels.custom;
}

function sortOrderLinks(orderLinks) {
  var links = [];
  var i = 0;

  if (!Array.isArray(orderLinks)) {
    return links;
  }

  for (i = 0; i < orderLinks.length; i += 1) {
    links.push(normalizeOrderLink(orderLinks[i]));
  }

  links.sort(function(firstLink, secondLink) {
    if (firstLink.sortOrder !== secondLink.sortOrder) {
      return firstLink.sortOrder - secondLink.sortOrder;
    }

    return firstLink.label.localeCompare(secondLink.label);
  });

  return links;
}

function escapeOrderLinkHtml(value) {
  return String(value || "").replace(/[&<>\"']/g, function(character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[character];
  });
}

function renderOrderLinkButtons(orderLinks, options) {
  var settings = options || {};
  var links = sortOrderLinks(orderLinks);
  var html = [];
  var i = 0;

  for (i = 0; i < links.length; i += 1) {
    var link = links[i];
    var errors = validateOrderLink(link);

    if (errors.length > 0) {
      continue;
    }

    if (link.isActive === false && settings.includeInactive !== true) {
      continue;
    }

    html.push([
      "<a class=\"order-link-button ",
      escapeOrderLinkHtml(link.type),
      link.isActive === false ? " inactive" : "",
      "\" href=\"",
      escapeOrderLinkHtml(link.url),
      "\" target=\"_blank\" rel=\"noopener noreferrer\" data-order-link-id=\"",
      escapeOrderLinkHtml(link.id),
      "\" data-order-link-type=\"",
      escapeOrderLinkHtml(link.type),
      "\" data-order-link-label=\"",
      escapeOrderLinkHtml(link.label),
      "\" data-order-link-url=\"",
      escapeOrderLinkHtml(link.url),
      "\"><span>",
      escapeOrderLinkHtml(getOrderLinkIcon(link.type)),
      "</span><strong>",
      escapeOrderLinkHtml(getOrderLinkLabel(link.type, link.label)),
      "</strong></a>"
    ].join(""));
  }

  if (!html.length) {
    return "";
  }

  return "<div class=\"order-link-button-row\">" + html.join("") + "</div>";
}

async function trackOrderLinkClick(cafeId, itemId, link, options) {
  var settings = options || {};
  var safeLink = normalizeOrderLink(link || {});
  var recorder = settings.recordAnalyticsEvent;

  if (typeof recorder !== "function") {
    console.log("[orderLinks] Analytics recorder unavailable for orderLinkClick.");
    return null;
  }

  try {
    return await recorder("orderLinkClick", {
      cafeId: normalizeOrderLinkText(cafeId),
      itemId: normalizeOrderLinkText(itemId),
      eventType: "orderLinkClick",
      linkType: safeLink.type,
      linkLabel: safeLink.label,
      urlHost: getOrderLinkHost(safeLink.url),
      language: normalizeOrderLinkText(settings.language),
      source: normalizeOrderLinkText(settings.source || "publicMenu"),
      userId: settings.userId || null,
      itemName: normalizeOrderLinkText(settings.itemName),
      category: normalizeOrderLinkText(settings.category),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.log("[orderLinks] orderLinkClick analytics failed.", error);
    return null;
  }
}

export {
  getOrderLinkHost,
  getOrderLinkIcon,
  getOrderLinkLabel,
  isSafeOrderLinkUrl,
  isSupportedOrderLinkType,
  normalizeOrderLink,
  renderOrderLinkButtons,
  sortOrderLinks,
  supportedOrderLinkTypes,
  trackOrderLinkClick,
  validateOrderLink
};

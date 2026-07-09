import { supportedLanguages } from "../../js/i18n.js";

const translationTargets = ["ru", "ky", "en", "uz", "ko", "zh", "ar", "tr"];

const draftPrefixes = {
  ar: "مسودة",
  en: "Draft",
  ko: "초안",
  ky: "Долбоор",
  ru: "Черновик",
  tr: "Taslak",
  uz: "Qoralama",
  zh: "草稿"
};

function getTranslationTargets() {
  return translationTargets.map(function(code) {
    return supportedLanguages.find(function(language) {
      return language.code === code;
    }) || { code: code, label: code.toUpperCase(), name: code.toUpperCase() };
  });
}

function getTranslationValue(translations, languageCode, field) {
  return translations && translations[languageCode] && translations[languageCode][field]
    ? translations[languageCode][field]
    : "";
}

function getTranslationStatus(translations, languageCode, fields) {
  if (languageCode === "en" && (!translations || !translations.en)) {
    return { code: "approved", label: "Approved", missingFields: [] };
  }

  const status = translations && translations[languageCode] && translations[languageCode].status
    ? translations[languageCode].status
    : "";
  const missingFields = fields.filter(function(field) {
    return !getTranslationValue(translations, languageCode, field);
  });

  if (missingFields.length === fields.length) {
    return { code: "missing", label: "Missing", missingFields: missingFields };
  }

  if (status === "approved") {
    return { code: "approved", label: "Approved", missingFields: missingFields };
  }

  if (status === "needs-review" || status === "draft") {
    return { code: "needs-review", label: "Needs review", missingFields: missingFields };
  }

  return missingFields.length
    ? { code: "partial", label: "Partial", missingFields: missingFields }
    : { code: "needs-review", label: "Needs review", missingFields: missingFields };
}

function getTranslationCoverage(translations, fields) {
  const targets = getTranslationTargets();
  const statuses = targets.map(function(language) {
    return Object.assign({ language: language }, getTranslationStatus(translations, language.code, fields));
  });
  const approved = statuses.filter(function(status) {
    return status.code === "approved";
  }).length;
  const missing = statuses.filter(function(status) {
    return status.code === "missing";
  }).length;

  return {
    approved: approved,
    missing: missing,
    total: statuses.length,
    percent: Math.round((approved / statuses.length) * 100),
    statuses: statuses
  };
}

function getDraftText(languageCode, sourceText) {
  if (!sourceText) return "";
  const prefix = draftPrefixes[languageCode] || "Draft";
  return `${prefix}: ${sourceText}`;
}

function buildTranslationDrafts(source, existingTranslations, fields) {
  const nextTranslations = Object.assign({}, existingTranslations || {});

  getTranslationTargets().forEach(function(language) {
    const current = Object.assign({}, nextTranslations[language.code] || {});
    let changed = false;

    fields.forEach(function(field) {
      if (!current[field] && source[field]) {
        current[field] = getDraftText(language.code, source[field]);
        changed = true;
      }
    });

    if (changed && current.status !== "approved") {
      current.status = "needs-review";
      current.draftedAt = new Date().toISOString();
    }

    if (changed || nextTranslations[language.code]) {
      nextTranslations[language.code] = current;
    }
  });

  return nextTranslations;
}

function buildCategoryDrafts(category) {
  const translations = Object.assign({}, category.translations || {});
  getTranslationTargets().forEach(function(language) {
    const categoryField = `category_${language.code}`;
    if (categoryField === "category_en") return;
    if (!category[categoryField] && category.category_en) {
      category[categoryField] = getDraftText(language.code, category.category_en);
      translations[language.code] = Object.assign({}, translations[language.code] || {}, {
        name: category[categoryField],
        status: "needs-review",
        draftedAt: new Date().toISOString()
      });
    }
  });
  category.translations = translations;
  return category;
}

function buildMenuDrafts(menu) {
  return (menu || []).map(function(category) {
    const nextCategory = buildCategoryDrafts(Object.assign({}, category));
    nextCategory.items = (category.items || []).map(function(item) {
      return Object.assign({}, item, {
        translations: buildTranslationDrafts({
          name: item.name || "",
          description: item.description || ""
        }, item.translations || {}, ["name", "description"])
      });
    });
    return nextCategory;
  });
}

function getMenuTranslationSummary(menu) {
  let total = 0;
  let missing = 0;
  let needsReview = 0;
  let approved = 0;

  (menu || []).forEach(function(category) {
    const categoryCoverage = getTranslationCoverage(category.translations || {}, ["name"]);
    total += categoryCoverage.total;
    missing += categoryCoverage.missing;
    approved += categoryCoverage.approved;
    needsReview += categoryCoverage.statuses.filter(function(status) {
      return status.code === "needs-review" || status.code === "partial";
    }).length;

    (category.items || []).forEach(function(item) {
      const itemCoverage = getTranslationCoverage(item.translations || {}, ["name"]);
      total += itemCoverage.total;
      missing += itemCoverage.missing;
      approved += itemCoverage.approved;
      needsReview += itemCoverage.statuses.filter(function(status) {
        return status.code === "needs-review" || status.code === "partial";
      }).length;
    });
  });

  return {
    approved: approved,
    missing: missing,
    needsReview: needsReview,
    total: total,
    percent: total ? Math.round((approved / total) * 100) : 0
  };
}

export {
  buildMenuDrafts,
  buildTranslationDrafts,
  getMenuTranslationSummary,
  getTranslationCoverage,
  getTranslationStatus,
  getTranslationTargets
};

import { auth, db } from './firebase-init.js';
import { supportedLanguages, getStoredLanguage, setStoredLanguage, getLanguageName } from './i18n.js';
import {
  getReviewBadgeLabels,
  getReviewEditUrl
} from '../packages/domain/reviews/reviewTrust.js';
import { recordLocalLoyaltyEvent } from '../packages/domain/loyalty/loyaltyEngine.js';
import { recordAnalyticsEvent } from '../packages/domain/analytics/growthAnalytics.js';
import {
  renderOrderLinkButtons,
  sortOrderLinks,
  trackOrderLinkClick
} from '../packages/domain/menus/orderLinks.js';
import { runIntentPipeline } from '../packages/icf/pipeline/runIntentPipeline.js';
import { getMenuTranslationSummary, getTranslationStatus } from '../packages/i18n/translationEngine.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const languageSelector = document.getElementById('languageSelector');
const cafeInfo = document.getElementById('cafeInfo');
const menuSection = document.getElementById('menuSection');
const menuCategories = document.getElementById('menuCategories');
const menuItems = document.getElementById('menuItems');
const menuSearch = document.getElementById('menuSearch');
const menuCount = document.getElementById('menuCount');
const translationNotice = document.getElementById('translationNotice');
const qrQuickActions = document.getElementById('qrQuickActions');
const qrServiceFacts = document.getElementById('qrServiceFacts');
const menuActionStatus = document.getElementById('menuActionStatus');
const shareMenuBtn = document.getElementById('shareMenuBtn');
const callCafeBtn = document.getElementById('callCafeBtn');
const callWaiterBtn = document.getElementById('callWaiterBtn');
const openOrderBtn = document.getElementById('openOrderBtn');
const orderTray = document.getElementById('orderTray');
const orderTrayCount = document.getElementById('orderTrayCount');
const orderTrayTotal = document.getElementById('orderTrayTotal');
const clearOrderBtn = document.getElementById('clearOrderBtn');
const showOrderBtn = document.getElementById('showOrderBtn');
const reviewList = document.getElementById('reviewList');
const guestReviewForm = document.getElementById('guestReviewForm');

const fallbackCafe = {
  id: 'mano',
  name: 'Mano Cafe',
  description: 'Translated breakfasts, coffee, teas, and desserts in Bishkek.',
  path_name: 'mano',
  address: 'Bishkek center',
  tags: ['breakfast', 'coffee', 'desserts'],
  socials: { instagram: '@mano' },
  qrCode: '',
  premiumGamesEnabled: true,
  premiumLessonsEnabled: true
};

const categoryIcons = {
  Breakfasts: '🍳',
  'Coffee & Teas': '☕',
  'Cold Drinks': '🍹',
  'Appetizers & Salads': '🥗',
  'Burgers & Panini': '🍔',
  Soups: '🍲',
  'Hot Dishes': '🍛',
  Pasta: '🍝',
  Pizza: '🍕',
  Rolls: '🍣',
  'Baked Goods & Desserts': '🍰'
};

let currentLanguage = getStoredLanguage();
let currentCafeData = null;
let currentMenuData = null;
let currentCafeId = null;
let isQrMode = false;
let selectedCategoryIndex = 0;
let trackedPageView = false;
let orderItems = [];
let currentUser = null;
let currentUserData = null;
let menuSearchTimer = null;
const trackedMenuItemViews = new Set();

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(Boolean);
  }
  return [];
}

function getCafeImage(cafeData) {
  return cafeData.imageUrl
    || cafeData.coverImageUrl
    || cafeData.logoUrl
    || cafeData.photos?.[0]
    || `assets/${cafeData.path_name || 'mano'}/mano_logo.png`;
}

function getCafePhone(cafeData) {
  return cafeData.phone || cafeData.contactPhone || cafeData.contacts?.phone || '';
}

function getCafeOrderUrl(cafeData) {
  return cafeData.orderUrl || cafeData.onlineOrderUrl || cafeData.links?.order || '';
}

function getWaiterUrl(cafeData) {
  return cafeData.waiterRequestUrl || cafeData.callWaiterUrl || cafeData.links?.waiter || '';
}

function getHoursLabel(cafeData) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const hours = cafeData.hours || cafeData.openingHours || {};
  if (typeof hours === 'string') return hours;
  return hours[today] || hours.daily || hours.default || 'Ask staff for today\'s hours';
}

function getPrimaryNumber(price) {
  const match = String(price || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isDessertItem(item, category) {
  const text = [
    item.name,
    item.description,
    item.category,
    category?.name,
    category?.category_en,
    ...(normalizeTags(item.tags || item.tag || []) || [])
  ].filter(Boolean).join(' ').toLowerCase();
  return /dessert|cake|cookie|pastry|sweet|ice cream|baked|cheesecake|brownie|pancake|waffle|торт|десерт|слад|пирож|булоч|кекс|печень|балмуздак/.test(text);
}

function getItemAllergens(item) {
  const explicit = item.allergens || item.allergenTags || [];
  if (Array.isArray(explicit) && explicit.length) return explicit.filter(Boolean);
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.split(',').map(allergen => allergen.trim()).filter(Boolean);
  }

  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  const allergens = [];
  if (/milk|cheese|cream|butter|latte|cappuccino|какао|сыр|каймак|слив|stracciatella|шоколад/.test(text)) allergens.push('dairy');
  if (/egg|яйц|жумуртка|pancake|shakshuka|omelet/.test(text)) allergens.push('egg');
  if (/bread|toast|pasta|spaghetti|fettuccine|lasagna|pizza|panini|burger|gluten|хлеб|нан/.test(text)) allergens.push('gluten');
  if (/peanut|pecan|nut|арахис|орех|жаңгак/.test(text)) allergens.push('nuts');
  if (/shrimp|trout|salmon|crab|seafood|кревет|лосось|форель|краб/.test(text)) allergens.push('seafood');
  return [...new Set(allergens)];
}

function getDietaryTags(item) {
  const tags = item.dietary || item.dietaryTags || [];
  if (Array.isArray(tags) && tags.length) return tags.filter(Boolean);

  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  const inferred = [];
  if (/vegan|detox|celery|avocado|cucumber|apple|green|овощ|жашыл/.test(text)) inferred.push('plant-forward');
  if (/spicy|adjika|tom yum|спайси|ачуу/.test(text)) inferred.push('spicy');
  return inferred;
}

function getItemImage(item, category) {
  if (item.image) return item.image;
  if (category?.image) return category.image;
  return '';
}

function getOrderItemKey(item, category) {
  return `${category.category_en || category.name || 'menu'}:${item.name || ''}:${item.price || ''}`;
}

function trackMenuItemViews(category, items) {
  if (!currentCafeId) return;
  const categoryName = getCategoryName(category);
  items.slice(0, 12).forEach(item => {
    const itemName = getItemName(item);
    const key = `${currentCafeId}:${currentLanguage}:${categoryName}:${itemName}`;
    if (trackedMenuItemViews.has(key)) return;
    trackedMenuItemViews.add(key);
    recordAnalyticsEvent(db, 'menu-item-view', {
      cafeId: currentCafeId,
      cafeName: getTranslatedCafe(currentCafeData || {}).name,
      itemName,
      category: categoryName,
      language: currentLanguage,
      source: isQrMode ? 'qr-menu' : 'public-menu'
    });
  });
}

function normalizeMenu(menuData) {
  if (!menuData) return [];

  const categories = Array.isArray(menuData)
    ? menuData
    : Object.entries(menuData).map(([categoryName, items]) => ({
      category_en: categoryName,
      name: categoryName,
      items: Array.isArray(items) ? items : []
    }));

  return categories
    .map(category => ({
      ...category,
      items: (category.items || [])
        .filter(item => item && !item.archived)
        .map(item => ({
          ...item,
          price: item.price ?? item.priceText ?? '',
          image: item.image || item.imageUrl || item.photo || ''
        }))
    }))
    .filter(category => category.items.length);
}

function getCafeIdentifier() {
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get('id') || params.get('slug');
  isQrMode = params.get('qr') === '1' || window.location.pathname.includes('/cafe/');

  if (queryId) return queryId;

  const segments = window.location.pathname.split('/').filter(Boolean);
  const cafeSegmentIndex = segments.findIndex(segment => segment === 'cafe');
  return cafeSegmentIndex >= 0 ? segments[cafeSegmentIndex + 1] : null;
}

function populateLanguageSelector() {
  languageSelector.innerHTML = supportedLanguages.map(language => `
    <option value="${language.code}" ${language.code === currentLanguage ? 'selected' : ''}>
      ${language.label} - ${language.name}
    </option>
  `).join('');
}

async function getCafeInfo(identifier) {
  if (!identifier) return fallbackCafe;

  try {
    const docSnap = await getDoc(doc(db, 'cafes', identifier));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }

    const slugQuery = query(collection(db, 'cafes'), where('slug', '==', identifier));
    const slugSnap = await getDocs(slugQuery);
    if (!slugSnap.empty) {
      const match = slugSnap.docs[0];
      return { id: match.id, ...match.data() };
    }
  } catch (error) {
    console.warn('[cafePage] Firestore unavailable, using local cafe data.', error);
  }

  return identifier === 'mano' ? fallbackCafe : null;
}

async function getMenuFromJson(pathName) {
  if (!pathName) return null;
  try {
    const response = await fetch(`assets/${pathName}/menu.json`);
    if (!response.ok) throw new Error(`Menu file not found for ${pathName}`);
    return await response.json();
  } catch (error) {
    console.warn('[cafePage] Local menu unavailable.', error);
    return null;
  }
}

function getTranslatedCafe(cafeData) {
  const translations = cafeData.translations?.[currentLanguage] || {};
  return {
    name: translations.name || cafeData.name || 'Cafe',
    description: translations.description || cafeData.description || '',
    address: cafeData.address || cafeData.location?.address || 'Bishkek'
  };
}

function renderQrMode() {
  document.querySelectorAll('[data-public-nav]').forEach(item => {
    item.classList.toggle('hidden', isQrMode);
  });
  document.getElementById('qrModeNotice')?.classList.toggle('hidden', !isQrMode);
  document.body.classList.toggle('qr-mode-active', isQrMode);
  qrQuickActions?.classList.toggle('hidden', false);
}

function renderCafeInfo(cafeData) {
  const cafe = getTranslatedCafe(cafeData);
  const tags = normalizeTags(cafeData.tags);
  const menuUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(currentCafeId || cafeData.id || 'mano')}&qr=1`;
  const imageUrl = getCafeImage(cafeData);
  const phone = getCafePhone(cafeData);
  const orderUrl = getCafeOrderUrl(cafeData);
  const hoursLabel = getHoursLabel(cafeData);

  document.title = `MyCafe | ${cafe.name}`;
  cafeInfo.innerHTML = `
    <div class="cafe-hero">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(cafe.name)}" class="cafe-hero-image">
      <div class="cafe-hero-body">
        <p class="eyebrow">${escapeHtml(getLanguageName(currentLanguage))}</p>
        <h1>${escapeHtml(cafe.name)}</h1>
        <p class="cafe-description">${escapeHtml(cafe.description)}</p>
        <p class="text-sm text-gray-600">${escapeHtml(cafe.address)}</p>
        <div class="qr-hero-facts">
          <span>${escapeHtml(hoursLabel)}</span>
          ${phone ? `<span>${escapeHtml(phone)}</span>` : ''}
          ${cafeData.tableNumber ? `<span>Table ${escapeHtml(cafeData.tableNumber)}</span>` : ''}
        </div>
        <div class="tag-row">
          ${tags.map(tag => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('')}
        </div>
      </div>
      <div class="cafe-hero-actions">
        <a class="primary-link" href="${menuUrl}">QR menu view</a>
        ${cafeData.qrCode ? `<a class="secondary-link" href="${escapeHtml(cafeData.qrCode)}" download>Download QR code</a>` : ''}
        ${cafeData.socials?.instagram ? `<a class="secondary-link" href="https://instagram.com/${escapeHtml(String(cafeData.socials.instagram).replace('@', ''))}">Instagram</a>` : ''}
        ${phone ? `<a class="secondary-link" href="tel:${escapeHtml(phone.replace(/[^+\d]/g, ''))}">Call cafe</a>` : ''}
        ${orderUrl ? `<a class="secondary-link" href="${escapeHtml(orderUrl)}">Order online</a>` : ''}
      </div>
    </div>
  `;

  qrServiceFacts.innerHTML = `
    <span>${escapeHtml(hoursLabel)}</span>
    ${phone ? `<span>${escapeHtml(phone)}</span>` : ''}
    ${orderUrl ? '<span>Online ordering</span>' : '<span>Show order to staff</span>'}
  `;
  callCafeBtn.href = phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : '#';
  callCafeBtn.classList.toggle('disabled-link', !phone);
}

function getCategoryName(category) {
  return category[`category_${currentLanguage}`]
    || category.translations?.[currentLanguage]?.name
    || category.category_en
    || category.name
    || 'Menu';
}

function getItemName(item) {
  return item.translations?.[currentLanguage]?.name || item.name || 'Item';
}

function getItemDescription(item) {
  return item.translations?.[currentLanguage]?.description || item.description || '';
}

function isCategoryMissingCurrentTranslation(category) {
  if (currentLanguage === 'en') return false;
  return !category[`category_${currentLanguage}`] && !category.translations?.[currentLanguage]?.name;
}

function isItemMissingCurrentTranslation(item) {
  if (currentLanguage === 'en') return false;
  const status = getTranslationStatus(item.translations || {}, currentLanguage, ['name']);
  return status.code === 'missing';
}

function getSearchableItemText(item) {
  const translations = Object.values(item.translations || {}).flatMap(translation => [
    translation.name,
    translation.description
  ]);
  return [
    item.name,
    item.description,
    item.price,
    ...translations
  ].filter(Boolean).join(' ').toLowerCase();
}

function getPriceLabel(item) {
  const price = String(item.price || '').trim();
  if (!price) return '';
  return price.includes('сом') ? price : `${price} сом`;
}

function updateOrderTray() {
  const itemCount = orderItems.reduce((total, item) => total + item.quantity, 0);
  const total = orderItems.reduce((sum, item) => sum + (item.priceValue * item.quantity), 0);

  orderTray.classList.toggle('hidden', itemCount === 0);
  orderTrayCount.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
  orderTrayTotal.textContent = total ? `${total} сом` : 'Price varies';
}

function addItemToOrder(item) {
  const existing = orderItems.find(orderItem => orderItem.key === item.key);
  if (existing) {
    existing.quantity += 1;
  } else {
    orderItems.push({ ...item, quantity: 1 });
  }

  menuActionStatus.textContent = `${item.name} added.`;
  updateOrderTray();

  if (item.isDessert && currentCafeId) {
    recordLocalLoyaltyEvent('dessert-action', {
      cafeId: currentCafeId,
      itemTag: item.category || 'dessert',
      dedupeKey: `dessert:${currentCafeId}:${item.key}`,
      xp: 10
    });
  }
}

function getOrderSummary() {
  if (!orderItems.length) return 'No items selected yet.';
  return orderItems.map(item => {
    const price = item.priceLabel || 'Ask price';
    return `${item.quantity} x ${item.name} (${price})`;
  }).join('\n');
}

function renderCategoryItems(category) {
  menuItems.innerHTML = '';
  const search = menuSearch?.value.trim().toLowerCase() || '';
  const items = (category.items || [])
    .filter(item => !search || getSearchableItemText(item).includes(search));
  trackMenuItemViews(category, items);

  if (!items.length) {
    menuItems.innerHTML = '<p class="empty-menu-message">No available items match this search.</p>';
    return;
  }

  const itemsGrid = document.createElement('div');
  itemsGrid.className = 'menu-items-grid';

  items.forEach(item => {
    const itemCard = document.createElement('article');
    const isAvailable = item.available !== false;
    itemCard.className = `menu-item-card${isAvailable ? '' : ' unavailable'}`;
    const itemName = getItemName(item);
    const itemDescription = getItemDescription(item);
    const priceLabel = getPriceLabel(item);
    const itemImage = getItemImage(item, category);
    const allergens = getItemAllergens(item);
    const dietary = getDietaryTags(item);
    const missingTranslation = isItemMissingCurrentTranslation(item);
    const prepTime = item.prepTime || item.prepMinutes ? `${item.prepTime || item.prepMinutes} min` : '';
    const key = getOrderItemKey(item, category);
    const itemId = item.id || item.itemId || key;
    const orderLinks = isAvailable ? sortOrderLinks(item.orderLinks || []) : [];
    const orderLinkHtml = isAvailable ? renderOrderLinkButtons(orderLinks, { includeInactive: false }) : '';
    itemCard.dataset.orderKey = key;
    itemCard.innerHTML = `
      ${itemImage ? `<img src="${escapeHtml(itemImage)}" alt="${escapeHtml(itemName)}" loading="lazy">` : '<div class="menu-item-photo-placeholder">Menu photo coming soon</div>'}
      <div class="menu-item-body">
        <div>
          <div class="menu-item-title-row">
            <h4>${escapeHtml(itemName)}</h4>
            <span class="availability-pill ${isAvailable ? 'available' : 'sold-out'}">${isAvailable ? 'Available' : 'Sold out'}</span>
          </div>
          ${missingTranslation ? `<small class="translation-warning">Translation draft needed for ${escapeHtml(getLanguageName(currentLanguage))}</small>` : ''}
          ${itemDescription ? `<p>${escapeHtml(itemDescription)}</p>` : ''}
          <div class="menu-meta-row">
            ${prepTime ? `<span>${escapeHtml(prepTime)}</span>` : ''}
            ${dietary.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}
          </div>
          <div class="allergen-row">
            ${allergens.length ? allergens.map(allergen => `<span>${escapeHtml(allergen)}</span>`).join('') : '<span>Ask staff about allergens</span>'}
          </div>
        </div>
        ${orderLinkHtml}
        <div class="menu-item-footer">
          ${priceLabel ? `<strong>${escapeHtml(priceLabel)}</strong>` : '<strong>Ask price</strong>'}
          <button class="add-order-item secondary-link" type="button" ${isAvailable ? '' : 'disabled'}>Add</button>
        </div>
      </div>
    `;
    itemCard.querySelector('.add-order-item')?.addEventListener('click', () => {
      addItemToOrder({
        key,
        name: itemName,
        priceLabel,
        priceValue: getPrimaryNumber(item.price),
        category: getCategoryName(category),
        isDessert: isDessertItem(item, category)
      });
    });
    itemCard.querySelectorAll('.order-link-button').forEach(function(linkButton) {
      linkButton.addEventListener('click', function() {
        trackOrderLinkClick(currentCafeId, itemId, {
          id: linkButton.dataset.orderLinkId || '',
          type: linkButton.dataset.orderLinkType || 'custom',
          label: linkButton.dataset.orderLinkLabel || '',
          url: linkButton.dataset.orderLinkUrl || '',
          isActive: true
        }, {
          language: currentLanguage,
          source: 'publicMenu',
          userId: currentUser ? currentUser.uid : null,
          itemName,
          category: getCategoryName(category),
          recordAnalyticsEvent: function(eventType, payload) {
            return recordAnalyticsEvent(db, eventType, payload);
          }
        });
      });
    });
    itemsGrid.appendChild(itemCard);
  });

  menuItems.appendChild(itemsGrid);
}

function renderMenu(menuData) {
  const normalizedMenu = normalizeMenu(menuData);

  if (!normalizedMenu.length) {
    menuSection.classList.add('hidden');
    return;
  }

  menuSection.classList.remove('hidden');
  menuCategories.innerHTML = '';
  selectedCategoryIndex = Math.min(selectedCategoryIndex, normalizedMenu.length - 1);

  const search = menuSearch?.value.trim().toLowerCase() || '';
  const matchingItems = normalizedMenu.reduce((total, category) => {
    return total + (category.items || []).filter(item => {
      return !search || getSearchableItemText(item).includes(search);
    }).length;
  }, 0);
  const availableItemCount = normalizedMenu.reduce((total, category) => {
    return total + (category.items || []).filter(item => {
      return item.available !== false;
    }).length;
  }, 0);

  if (menuCount) {
    menuCount.textContent = search ? `${matchingItems} matching items` : `${availableItemCount} available items`;
  }

  normalizedMenu.forEach((category, index) => {
    const categoryName = getCategoryName(category);
    const icon = categoryIcons[category.category_en] || '🍽️';
    const missingCategoryTranslation = isCategoryMissingCurrentTranslation(category);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `menu-category-button${index === selectedCategoryIndex ? ' active' : ''}${missingCategoryTranslation ? ' needs-translation' : ''}`;
    const categoryCount = (category.items || []).filter(item => item.available !== false).length;
    button.innerHTML = `<span>${icon}</span><span>${escapeHtml(categoryName)}</span><small>${missingCategoryTranslation ? '!' : categoryCount}</small>`;
    button.dataset.index = index;
    menuCategories.appendChild(button);
  });

  const summary = getMenuTranslationSummary(normalizedMenu);
  const missingForCurrentLanguage = normalizedMenu.reduce((total, category) => {
    const categoryMissing = isCategoryMissingCurrentTranslation(category) ? 1 : 0;
    return total + categoryMissing + (category.items || []).filter(isItemMissingCurrentTranslation).length;
  }, 0);

  translationNotice.classList.toggle('hidden', !missingForCurrentLanguage);
  translationNotice.innerHTML = missingForCurrentLanguage
    ? `<strong>${missingForCurrentLanguage} ${escapeHtml(getLanguageName(currentLanguage))} translations need review.</strong><span>${summary.percent}% approved across priority languages.</span>`
    : '';

  menuCategories.onclick = event => {
    const clickedButton = event.target.closest('button');
    if (!clickedButton) return;

    selectedCategoryIndex = Number(clickedButton.dataset.index);
    renderMenu(menuData);
  };

  renderCategoryItems(normalizedMenu[selectedCategoryIndex]);
}

function renderReviews(reviews = []) {
  if (!reviews.length) {
    reviewList.innerHTML = '<p class="empty-state">Approved reviews will appear here.</p>';
    return;
  }

  reviewList.innerHTML = reviews.map(review => `
    <article class="bg-white rounded-lg border p-4">
      <div class="flex justify-between gap-3">
        <strong>${escapeHtml(review.username || review.name || 'Guest')}</strong>
        <span>${escapeHtml(review.rating || 5)} stars</span>
      </div>
      <div class="review-badge-row">
        ${getReviewBadgeLabels(review).map(badge => `<span>${escapeHtml(badge)}</span>`).join('')}
      </div>
      <p class="mt-2">${escapeHtml(review.text || '')}</p>
      ${review.imageUrl ? `<img src="${escapeHtml(review.imageUrl)}" alt="Review photo" class="w-28 mt-3 rounded">` : ''}
      ${review.ownerReply ? `
        <div class="owner-reply-public">
          <strong>Cafe reply</strong>
          <p>${escapeHtml(review.ownerReply)}</p>
        </div>
      ` : ''}
    </article>
  `).join('');
}

async function loadReviews(cafeId) {
  if (!cafeId) return [];
  try {
    const reviewsQuery = query(collection(db, 'reviews'), where('cafeId', '==', cafeId), where('approved', '==', true));
    const snapshot = await getDocs(reviewsQuery);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.warn('[cafePage] Reviews unavailable.', error);
    return [];
  }
}

async function loadCurrentUserData(user) {
  if (!user) {
    currentUserData = null;
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    currentUserData = userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
  } catch (error) {
    console.warn('[cafePage] Could not load review trust profile.', error);
    currentUserData = null;
  }
}

function getRecentReviewContext() {
  const lastAt = Number(localStorage.getItem('mycafe:lastReviewAt') || 0);
  return lastAt ? { recentSubmissionSeconds: Math.round((Date.now() - lastAt) / 1000) } : {};
}

async function trackCafePageView() {
  if (!currentCafeId || trackedPageView) return;
  trackedPageView = true;

  recordLocalLoyaltyEvent('visit', {
    cafeId: currentCafeId,
    dedupeKey: `visit:${currentCafeId}:${getTodayKey()}`,
    xp: isQrMode ? 12 : 8
  });

  const basePayload = {
    cafeId: currentCafeId,
    cafeName: getTranslatedCafe(currentCafeData || {}).name,
    language: currentLanguage,
    path: window.location.pathname,
    source: isQrMode ? 'qr-menu' : 'public-menu'
  };
  recordAnalyticsEvent(db, 'cafe-view', basePayload);
  recordAnalyticsEvent(db, isQrMode ? 'qr-open' : 'menu-view', basePayload);
  if (isQrMode) {
    recordAnalyticsEvent(db, 'menu-scan', basePayload);
  }
}

function trackMenuSearch() {
  const queryText = menuSearch?.value.trim() || '';
  if (!currentCafeId || queryText.length < 2) return;
  window.clearTimeout(menuSearchTimer);
  menuSearchTimer = window.setTimeout(() => {
    const resultCount = menuCount?.textContent?.match(/\d+/)?.[0] || 0;
    recordAnalyticsEvent(db, 'search', {
      cafeId: currentCafeId,
      cafeName: getTranslatedCafe(currentCafeData || {}).name,
      language: currentLanguage,
      query: queryText.toLowerCase(),
      resultsCount: Number(resultCount),
      source: 'qr-menu-search'
    });
  }, 700);
}

async function shareMenu() {
  const cafe = currentCafeData ? getTranslatedCafe(currentCafeData) : { name: 'MyCafe menu' };
  const url = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(currentCafeId || 'mano')}&qr=1`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: `${cafe.name} menu`,
        text: `Open the ${cafe.name} QR menu`,
        url
      });
      menuActionStatus.textContent = 'Menu shared.';
      return;
    }

    await navigator.clipboard.writeText(url);
    menuActionStatus.textContent = 'Menu link copied.';
  } catch {
    menuActionStatus.textContent = 'Share is unavailable. Copy the address from the browser.';
  }
}

function callWaiter() {
  const waiterUrl = getWaiterUrl(currentCafeData || {});
  if (waiterUrl) {
    window.location.href = waiterUrl;
    return;
  }

  menuActionStatus.textContent = 'Waiter request noted. Show this screen to staff or use the call button.';
}

function startOrder() {
  const orderUrl = getCafeOrderUrl(currentCafeData || {});
  if (orderUrl) {
    window.location.href = orderUrl;
    return;
  }

  menuActionStatus.textContent = orderItems.length
    ? `Order ready:\n${getOrderSummary()}`
    : 'Add menu items first, then show the tray to staff.';
}

function showOrderSummary() {
  menuActionStatus.textContent = getOrderSummary();
  menuActionStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function bindQrActions() {
  shareMenuBtn?.addEventListener('click', shareMenu);
  callWaiterBtn?.addEventListener('click', callWaiter);
  openOrderBtn?.addEventListener('click', startOrder);
  showOrderBtn?.addEventListener('click', showOrderSummary);
  clearOrderBtn?.addEventListener('click', () => {
    orderItems = [];
    menuActionStatus.textContent = 'Order cleared.';
    updateOrderTray();
  });
}

function bindGuestReview() {
  guestReviewForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentCafeId) {
      reviewList.innerHTML = '<p class="text-red-700">Cafe is still loading. Try again in a moment.</p>';
      return;
    }

    const submitButton = guestReviewForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    const reviewPayload = {
      cafeId: currentCafeId,
      cafeName: getTranslatedCafe(currentCafeData || {}).name,
      userId: currentUser?.uid || '',
      name: document.getElementById('guestName').value.trim(),
      email: document.getElementById('guestEmail').value.trim(),
      rating: Number(document.getElementById('guestRating').value),
      imageUrl: document.getElementById('guestPhotoUrl').value.trim(),
      text: document.getElementById('guestReviewText').value.trim(),
      language: currentLanguage,
      recentReviewContext: getRecentReviewContext()
    };

    try {
      const reviewResult = await runIntentPipeline('SubmitCafeReviewIntent', reviewPayload);
      if (!reviewResult.ok) {
        throw new Error(reviewResult.message || 'Review could not be sent right now.');
      }
      const reviewData = reviewResult.data || {};
      recordAnalyticsEvent(db, 'review-submit', {
        cafeId: currentCafeId,
        cafeName: reviewPayload.cafeName,
        language: currentLanguage,
        metadata: {
          approved: reviewData.approved,
          rating: reviewData.rating || reviewPayload.rating,
          hasPhoto: Boolean(reviewPayload.imageUrl)
        }
      });
      recordLocalLoyaltyEvent('review', {
        cafeId: currentCafeId,
        dedupeKey: `review:${reviewData.reviewId}`,
        xp: 15
      });
      if (reviewPayload.imageUrl) {
        recordLocalLoyaltyEvent('photo-review', {
          cafeId: currentCafeId,
          dedupeKey: `photo-review:${reviewData.reviewId}`,
          xp: 20
        });
      }
      localStorage.setItem('mycafe:lastReviewAt', String(Date.now()));
      guestReviewForm.reset();
      const editUrl = getReviewEditUrl(reviewData.reviewId, reviewData.editToken);
      reviewList.innerHTML = `
        <p class="text-green-700">${reviewData.approved ? 'Review published automatically.' : 'Review sent for approval.'}</p>
        <p class="text-sm text-gray-600 mt-2">Save your edit token. After approval, use the edit link from your dashboard or email flow.</p>
        <p class="owner-url-box mt-2">${escapeHtml(editUrl)}</p>
      `;
      if (reviewData.approved) {
        renderReviews(await loadReviews(currentCafeId));
      }
    } catch (error) {
      console.error('[cafePage] Could not submit review.', error);
      reviewList.innerHTML = '<p class="text-red-700">Review could not be sent right now.</p>';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send for approval';
    }
  });
}

async function renderPage() {
  const identifier = getCafeIdentifier();
  currentCafeData = await getCafeInfo(identifier);

  if (!currentCafeData) {
    cafeInfo.innerHTML = '<p>Cafe not found.</p>';
    menuSection.classList.add('hidden');
    return;
  }

  currentCafeId = currentCafeData.id || identifier || 'mano';
  currentMenuData = currentCafeData.menu || await getMenuFromJson(currentCafeData.path_name);

  renderQrMode();
  renderCafeInfo(currentCafeData);
  renderMenu(currentMenuData);
  trackCafePageView();
  renderReviews(await loadReviews(currentCafeId));
}

languageSelector.addEventListener('change', event => {
  currentLanguage = setStoredLanguage(event.target.value);
  if (currentCafeId) {
    recordAnalyticsEvent(db, 'language-usage', {
      cafeId: currentCafeId,
      cafeName: getTranslatedCafe(currentCafeData || {}).name,
      language: currentLanguage,
      source: 'language-selector'
    });
  }
  if (currentCafeData) renderCafeInfo(currentCafeData);
  if (currentMenuData) renderMenu(currentMenuData);
});

menuSearch?.addEventListener('input', () => {
  selectedCategoryIndex = 0;
  if (currentMenuData) renderMenu(currentMenuData);
  trackMenuSearch();
});

onAuthStateChanged(auth, async user => {
  currentUser = user;
  await loadCurrentUserData(user);
  if (user) {
    const guestName = document.getElementById('guestName');
    const guestEmail = document.getElementById('guestEmail');
    if (guestName && !guestName.value) {
      guestName.value = user.displayName || currentUserData?.nickname || '';
    }
    if (guestEmail && !guestEmail.value) {
      guestEmail.value = user.email || '';
    }
  }
});

populateLanguageSelector();
bindQrActions();
bindGuestReview();
renderPage();


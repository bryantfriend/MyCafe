import { auth, db } from './firebase-init.js';
import { storage } from '../packages/firebase/firebaseStorage.js';
import { redirectToLogin } from '../packages/ui/authUiHelpers.js';
import { escapeHtml, formatDateTime, isSafeHttpUrl, setStatus } from '../packages/ui/renderHelpers.js';
import {
  buildMenuDrafts,
  buildTranslationDrafts,
  getMenuTranslationSummary,
  getTranslationCoverage,
  getTranslationTargets
} from '../packages/i18n/translationEngine.js';
import { getReviewBadgeLabels } from '../packages/domain/reviews/reviewTrust.js';
import {
  cafePlanCatalog,
  getActivePlanNames,
  getInvoiceTotal,
  getPlanStatus,
  normalizeMonetization
} from '../packages/domain/monetization/cafePlans.js';
import { summarizeCafeGrowth } from '../packages/domain/analytics/growthAnalytics.js';
import {
  normalizeOrderLink,
  renderOrderLinkButtons,
  sortOrderLinks,
  supportedOrderLinkTypes,
  validateOrderLink
} from '../packages/domain/menus/orderLinks.js';
import { runIntentPipeline } from '../packages/icf/pipeline/runIntentPipeline.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getDownloadURL,
  ref,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const ownerStatus = document.getElementById('ownerStatus');
const ownerCafeSelect = document.getElementById('ownerCafeSelect');
const ownerPublicMenuLink = document.getElementById('ownerPublicMenuLink');
const ownerLogoutBtn = document.getElementById('ownerLogoutBtn');
const ownerProfileForm = document.getElementById('ownerProfileForm');
const ownerMenuEditor = document.getElementById('ownerMenuEditor');
const ownerAddCategoryBtn = document.getElementById('ownerAddCategoryBtn');
const ownerSaveMenuBtn = document.getElementById('ownerSaveMenuBtn');
const ownerPhotoForm = document.getElementById('ownerPhotoForm');
const ownerPhotoGrid = document.getElementById('ownerPhotoGrid');
const ownerReviewFilter = document.getElementById('ownerReviewFilter');
const ownerReviewList = document.getElementById('ownerReviewList');
const ownerPremiumGrid = document.getElementById('ownerPremiumGrid');
const ownerAnalyticsGrid = document.getElementById('ownerAnalyticsGrid');
const ownerTranslationSummary = document.getElementById('ownerTranslationSummary');
const ownerTranslationList = document.getElementById('ownerTranslationList');
const ownerDraftTranslationsBtn = document.getElementById('ownerDraftTranslationsBtn');
const ownerSaveTranslationReviewBtn = document.getElementById('ownerSaveTranslationReviewBtn');

let currentUser = null;
let currentUserProfile = null;
let ownerCafes = [];
let selectedCafe = null;
let selectedCafeId = '';
let currentMenu = [];
let currentReviews = [];
let currentAnalyticsEvents = [];

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return String(tags || '').split(',').map(tag => tag.trim()).filter(Boolean);
}

function normalizeMenu(menuData) {
  if (!menuData) return [];
  if (Array.isArray(menuData)) {
    
    
    
    return menuData.map(category => ({
    
    
    
      category_en: category.category_en || category.name || '',
    
    
    
      category_ru: category.category_ru || '',
    
    
    
      category_ky: category.category_ky || '',
    
    
    
      items: Array.isArray(category.items) ? category.items : []
    
    
    
    }));
  }

  return Object.entries(menuData).map(([categoryName, items]) => ({
    
    
    
    category_en: categoryName,
    
    
    
    category_ru: '',
    
    
    
    category_ky: '',
    
    
    
    items: Array.isArray(items) ? items : []
  }));
}

function getVisibleMenuItemCount(menu) {
  return menu.reduce((total, category) => {
    
    
    
    return total + (category.items || []).filter(item => item && item.available !== false && !item.archived).length;
  }, 0);
}

function getCafePublicUrl(cafe) {
  const id = cafe?.id || selectedCafeId || 'mano';
  return `${window.location.origin}/cafe.html?id=${encodeURIComponent(id)}`;
}

function getCafeQrUrl(cafe) {
  return `${getCafePublicUrl(cafe)}&qr=1`;
}

function getQrImageUrl(cafe) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(getCafeQrUrl(cafe))}`;
}

function setOwnerBusy(message) {
  setStatus(ownerStatus, message, 'info');
}

function setOwnerSuccess(message) {
  setStatus(ownerStatus, message, 'success');
}

function setOwnerError(message) {
  setStatus(ownerStatus, message, 'error');
}

function isCafeOwner(cafe) {
  if (!currentUser || !cafe) return false;
  return cafe.ownerId === currentUser.uid || (cafe.extraAdmins || []).includes(currentUser.uid);
}

function getSafeFileName(file) {
  return file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '') || 'owner-photo';
}

async function uploadCafePhoto(cafeId, file) {
  const photoRef = ref(storage, `cafes/${cafeId}/owner-photos/${Date.now()}-${getSafeFileName(file)}`);
  const result = await uploadBytes(photoRef, file);
  return getDownloadURL(result.ref);
}
function requireIntentSuccess(result) {
  if (!result || !result.ok) {
    
    
    
    throw new Error(result && result.message ? result.message : 'Intent could not be completed.');
  }

  return result;
}

async function loadUserProfile(user) {
  try {
    
    
    
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    
    
    
    return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : { role: 'user' };
  } catch (error) {
    
    
    
    console.warn('[ownerDashboard] Could not load user profile.', error);
    
    
    
    return { role: 'user' };
  }
}

async function loadOwnerCafes(user, profile) {
  try {
    
    
    
    if (profile?.role === 'admin') {
    
    
    
      const allSnap = await getDocs(collection(db, 'cafes'));
    
    
    
      return allSnap.docs.map(cafeDoc => ({ id: cafeDoc.id, ...cafeDoc.data() }));
    
    
    
    }

    
    
    
    const ownedQuery = query(collection(db, 'cafes'), where('ownerId', '==', user.uid));
    
    
    
    const adminQuery = query(collection(db, 'cafes'), where('extraAdmins', 'array-contains', user.uid));
    
    
    
    const [ownedSnap, adminSnap] = await Promise.all([getDocs(ownedQuery), getDocs(adminQuery)]);
    
    
    
    const byId = new Map();

    
    
    
    ownedSnap.docs.forEach(cafeDoc => byId.set(cafeDoc.id, { id: cafeDoc.id, ...cafeDoc.data() }));
    
    
    
    adminSnap.docs.forEach(cafeDoc => byId.set(cafeDoc.id, { id: cafeDoc.id, ...cafeDoc.data() }));

    
    
    
    return [...byId.values()];
  } catch (error) {
    
    
    
    console.warn('[ownerDashboard] Could not load owner cafes.', error);
    
    
    
    return [];
  }
}

async function loadCafeReviews(cafeId) {
  try {
    
    
    
    const reviewQuery = query(collection(db, 'reviews'), where('cafeId', '==', cafeId));
    
    
    
    const snapshot = await getDocs(reviewQuery);
    
    
    
    return snapshot.docs.map(reviewDoc => ({ id: reviewDoc.id, ...reviewDoc.data() }));
  } catch (error) {
    
    
    
    console.warn('[ownerDashboard] Could not load reviews.', error);
    
    
    
    return [];
  }
}

async function loadCafeAnalytics(cafeId) {
  try {
    
    
    
    const eventQuery = query(collection(db, 'analyticsEvents'), where('cafeId', '==', cafeId));
    
    
    
    const snapshot = await getDocs(eventQuery);
    
    
    
    return snapshot.docs.map(eventDoc => ({ id: eventDoc.id, ...eventDoc.data() }));
  } catch (error) {
    
    
    
    console.warn('[ownerDashboard] Could not load analytics events.', error);
    
    
    
    return [];
  }
}

function renderCafeSelector() {
  ownerCafeSelect.innerHTML = ownerCafes.length
    
    
    
    ? ownerCafes.map(cafe => `<option value="${escapeHtml(cafe.id)}">${escapeHtml(cafe.name || cafe.id)}</option>`).join('')
    
    
    
    : '<option value="">No assigned cafes</option>';
  ownerCafeSelect.value = selectedCafeId || ownerCafes[0]?.id || '';
}

function fillProfileForm(cafe) {
  document.getElementById('ownerCafeName').value = cafe.name || '';
  document.getElementById('ownerCafeSlug').value = cafe.slug || cafe.path_name || cafe.id || '';
  document.getElementById('ownerCafeDescription').value = cafe.description || '';
  document.getElementById('ownerCafeAddress').value = cafe.address || cafe.location?.address || '';
  document.getElementById('ownerCafeTags').value = normalizeTags(cafe.tags).join(', ');
  document.getElementById('ownerCafePriceTier').value = cafe.priceTier || cafe.price || 'mid';
  document.getElementById('ownerCafeLocationArea').value = cafe.locationArea || cafe.area || 'center';
  document.getElementById('ownerCafeInstagram').value = cafe.socials?.instagram || '';
  document.getElementById('ownerCafePhone').value = cafe.phone || '';
  document.getElementById('ownerCafeHours').value = cafe.hours?.daily || cafe.openingHours?.daily || cafe.hours || '';
  document.getElementById('ownerCafeOrderUrl').value = cafe.orderUrl || cafe.onlineOrderUrl || '';
  document.getElementById('ownerCafeWaiterUrl').value = cafe.waiterRequestUrl || cafe.callWaiterUrl || '';
  document.getElementById('ownerCafeImageUrl').value = cafe.imageUrl || cafe.coverImageUrl || '';
}

function renderMetrics() {
  const approvedReviews = currentReviews.filter(review => review.approved && !review.flagged);
  const pendingReviews = currentReviews.filter(review => !review.approved || review.flagged);
  const averageRating = approvedReviews.length
    
    
    
    ? (approvedReviews.reduce((total, review) => total + Number(review.rating || 0), 0) / approvedReviews.length).toFixed(1)
    
    
    
    : 'n/a';
  const activePlanNames = getActivePlanNames(selectedCafe).filter(name => name !== 'Free listing');
  const planStatus = getPlanStatus(selectedCafe);

  document.getElementById('metricMenuItems').textContent = String(getVisibleMenuItemCount(currentMenu));
  document.getElementById('metricReviews').textContent = String(currentReviews.length);
  document.getElementById('metricReviewsDetail').textContent = `${approvedReviews.length} approved, ${pendingReviews.length} pending, ${averageRating} avg rating`;
  document.getElementById('metricPremium').textContent = activePlanNames.length ? `${activePlanNames.length} package${activePlanNames.length === 1 ? '' : 's'}` : 'Free';
  document.getElementById('metricPremiumDetail').textContent = `${planStatus.label} · ${activePlanNames.join(', ') || 'Free listing'}`;
  document.getElementById('metricQr').textContent = selectedCafe ? 'Ready' : 'No cafe';
}

function renderMenuEditor() {
  ownerMenuEditor.innerHTML = currentMenu.length
    
    
    
    ? currentMenu.map(renderCategoryCard).join('')
    
    
    
    : '<p class="empty-state">No menu categories yet. Add the first category to start.</p>';
}

function renderCategoryCard(category, index) {
  const items = category.items || [];
  return `
    
    
    
    <section class="owner-menu-category" data-category-index="${index}">
    
    
    
      <div class="owner-menu-category-header">
    
    
    
        
    
    
    <div class="owner-form-grid">
    
    
    
        
    
    
      <label><span>English category</span><input class="category-en" type="text" value="${escapeHtml(category.category_en || '')}" placeholder="Breakfasts"></label>
    
    
    
        
    
    
      <label><span>Russian category</span><input class="category-ru" type="text" value="${escapeHtml(category.category_ru || '')}" placeholder="Завтраки"></label>
    
    
    
        
    
    
      <label><span>Kyrgyz category</span><input class="category-ky" type="text" value="${escapeHtml(category.category_ky || '')}" placeholder="Эртең мененки тамактар"></label>
    
    
    
        
    
    
    </div>
    
    
    
        
    
    
    <div class="owner-actions">
    
    
    
        
    
    
      <button class="secondary-link add-menu-item" type="button">Add item</button>
    
    
    
        
    
    
      <button class="secondary-link delete-menu-category" type="button">Delete category</button>
    
    
    
        
    
    
    </div>
    
    
    
      </div>
    
    
    
      <div class="owner-menu-items">
    
    
    
        
    
    
    ${items.length ? items.map(renderMenuItemRow).join('') : '<p class="empty-state">No items in this category yet.</p>'}
    
    
    
      </div>
    
    
    
    </section>
  `;
}

function renderOwnerOrderLinkTypeOptions(selectedType) {
  var html = [];
  var i = 0;

  for (i = 0; i < supportedOrderLinkTypes.length; i += 1) {
    
    
    
    var type = supportedOrderLinkTypes[i];
    
    
    
    html.push('<option value="' + escapeHtml(type) + '" ' + (type === selectedType ? 'selected' : '') + '>' + escapeHtml(type) + '</option>');
  }

  return html.join('');
}

function renderOwnerOrderLinkRow(link) {
  var normalizedLink = normalizeOrderLink(link || {});

  return `
    
    
    
    <div class="owner-order-link-row" data-order-link-id="${escapeHtml(normalizedLink.id)}">
    
    
    
      <label><span>Type</span><select class="order-link-type">${renderOwnerOrderLinkTypeOptions(normalizedLink.type)}</select></label>
    
    
    
      <label><span>Label</span><input class="order-link-label" type="text" value="${escapeHtml(normalizedLink.label)}" placeholder="Order on WhatsApp"></label>
    
    
    
      <label class="owner-wide"><span>URL</span><input class="order-link-url" type="url" value="${escapeHtml(normalizedLink.url)}" placeholder="https://..."></label>
    
    
    
      <label><span>Sort</span><input class="order-link-sort" type="number" min="1" value="${escapeHtml(normalizedLink.sortOrder)}"></label>
    
    
    
      <label class="owner-order-link-active"><input class="order-link-active" type="checkbox" ${normalizedLink.isActive === false ? '' : 'checked'}> Active</label>
    
    
    
      <button class="secondary-link remove-order-link" type="button">Delete</button>
    
    
    
    </div>
  `;
}

function renderOwnerOrderLinksEditor(item) {
  var links = sortOrderLinks(item.orderLinks || []);
  var rows = [];
  var i = 0;

  for (i = 0; i < links.length; i += 1) {
    
    
    
    rows.push(renderOwnerOrderLinkRow(links[i]));
  }

  return `
    
    
    
    <div class="owner-order-link-editor owner-wide">
    
    
    
      <div class="owner-order-link-header">
    
    
    
        
    
    
    <span>External order links</span>
    
    
    
        
    
    
    <button class="secondary-link add-order-link" type="button">+ Add Link</button>
    
    
    
      </div>
    
    
    
      <div class="owner-order-link-list">
    
    
    
        
    
    
    ${rows.join('')}
    
    
    
      </div>
    
    
    
      <div class="owner-order-link-preview">
    
    
    
        
    
    
    ${renderOrderLinkButtons(links, { includeInactive: false }) || '<small>No active order buttons yet.</small>'}
    
    
    
      </div>
    
    
    
    </div>
  `;
}

function renderMenuItemRow(item) {
  return `
    
    
    
    <article class="owner-menu-item">
    
    
    
      <div class="owner-form-grid">
    
    
    
        
    
    
    <label><span>Name</span><input class="item-name" type="text" value="${escapeHtml(item.name || '')}" placeholder="Latte"></label>
    
    
    
        
    
    
    <label><span>Price</span><input class="item-price" type="text" value="${escapeHtml(item.price || item.priceText || '')}" placeholder="180"></label>
    
    
    
        
    
    
    <label class="owner-wide"><span>Description</span><textarea class="item-description" rows="2">${escapeHtml(item.description || '')}</textarea></label>
    
    
    
        
    
    
    <label class="owner-wide"><span>Image URL</span><input class="item-image" type="url" value="${escapeHtml(item.image || item.imageUrl || '')}"></label>
    
    
    
        
    
    
    <label class="owner-wide"><span>Allergens</span><input class="item-allergens" type="text" value="${escapeHtml((item.allergens || []).join ? item.allergens.join(', ') : item.allergens || '')}" placeholder="dairy, gluten, nuts"></label>
    
    
    
        
    
    
    ${renderOwnerOrderLinksEditor(item || {})}
    
    
    
      </div>
    
    
    
      <div class="owner-menu-item-controls">
    
    
    
        
    
    
    <label><input class="item-available" type="checkbox" ${item.available === false ? '' : 'checked'}> Available</label>
    
    
    
        
    
    
    <label><input class="item-archived" type="checkbox" ${item.archived ? 'checked' : ''}> Hidden</label>
    
    
    
        
    
    
    <button class="secondary-link remove-menu-item" type="button">Remove</button>
    
    
    
      </div>
    
    
    
    </article>
  `;
}

function readOrderLinksFromItemNode(itemNode) {
  var rows = itemNode.querySelectorAll('.owner-order-link-row');
  var links = [];
  var i = 0;
  var j = 0;

  for (i = 0; i < rows.length; i += 1) {
    
    
    
    var row = rows[i];
    
    
    
    var rawLink = {
    
    
    
      id: row.dataset.orderLinkId || '',
    
    
    
      type: row.querySelector('.order-link-type').value.trim(),
    
    
    
      label: row.querySelector('.order-link-label').value.trim(),
    
    
    
      url: row.querySelector('.order-link-url').value.trim(),
    
    
    
      sortOrder: Number(row.querySelector('.order-link-sort').value || i + 1),
    
    
    
      isActive: row.querySelector('.order-link-active').checked
    
    
    
    };

    
    
    
    if (!rawLink.label && !rawLink.url) {
    
    
    
      continue;
    
    
    
    }

    
    
    
    var errors = validateOrderLink(rawLink);
    
    
    
    if (errors.length > 0) {
    
    
    
      var messages = [];
    
    
    
      for (j = 0; j < errors.length; j += 1) {
    
    
    
        
    
    
    messages.push(errors[j].message);
    
    
    
      }
    
    
    
      throw new Error(messages.join(' '));
    
    
    
    }

    
    
    
    links.push(normalizeOrderLink(rawLink));
  }

  return sortOrderLinks(links);
}

function readMenuFromDom() {
  const categories = [...ownerMenuEditor.querySelectorAll('.owner-menu-category')];
  return categories.map((categoryNode, categoryIndex) => {
    
    
    
    const existingCategory = currentMenu[categoryIndex] || {};
    
    
    
    const items = [...categoryNode.querySelectorAll('.owner-menu-item')].map((itemNode, itemIndex) => {
    
    
    
      const existingItem = existingCategory.items?.[itemIndex] || {};
    
    
    
      return {
    
    
    
      name: itemNode.querySelector('.item-name')?.value.trim() || '',
    
    
    
      price: itemNode.querySelector('.item-price')?.value.trim() || '',
    
    
    
      description: itemNode.querySelector('.item-description')?.value.trim() || '',
    
    
    
      image: itemNode.querySelector('.item-image')?.value.trim() || '',
    
    
    
      allergens: normalizeTags(itemNode.querySelector('.item-allergens')?.value || ''),
    
    
    
      available: !!itemNode.querySelector('.item-available')?.checked,
    
    
    
      archived: !!itemNode.querySelector('.item-archived')?.checked,
    
    
    
      orderLinks: readOrderLinksFromItemNode(itemNode),
    
    
    
      translations: existingItem.translations || {}
    
    
    
    };
    
    
    
    }).filter(item => item.name && item.price);

    
    
    
    return {
    
    
    
      category_en: categoryNode.querySelector('.category-en')?.value.trim() || '',
    
    
    
      category_ru: categoryNode.querySelector('.category-ru')?.value.trim() || '',
    
    
    
      category_ky: categoryNode.querySelector('.category-ky')?.value.trim() || '',
    
    
    
      translations: existingCategory.translations || {},
    
    
    
      items
    
    
    
    };
  }).filter(category => category.category_en);
}

function renderPhotos() {
  const photos = selectedCafe?.photos || [];
  ownerPhotoGrid.innerHTML = photos.length
    
    
    
    ? photos.map((photoUrl, index) => `
    
    
    
      <article class="cafe-card">
    
    
    
        
    
    
    <img src="${escapeHtml(photoUrl)}" alt="Cafe photo ${index + 1}" loading="lazy">
    
    
    
        
    
    
    <div class="cafe-card-body">
    
    
    
        
    
    
      <h3>Photo ${index + 1}</h3>
    
    
    
        
    
    
      <div class="card-actions">
    
    
    
        
    
    
        
    
    
    <button class="secondary-link set-cover-photo" type="button" data-photo-url="${escapeHtml(photoUrl)}">Set cover</button>
    
    
    
        
    
    
        
    
    
    <button class="secondary-link remove-owner-photo" type="button" data-photo-url="${escapeHtml(photoUrl)}">Remove</button>
    
    
    
        
    
    
      </div>
    
    
    
        
    
    
    </div>
    
    
    
      </article>
    
    
    
    `).join('')
    
    
    
    : '<p class="empty-state">No cafe photos yet.</p>';
}

function renderQrTools() {
  const qrUrl = getCafeQrUrl(selectedCafe);
  const qrImageUrl = getQrImageUrl(selectedCafe);
  document.getElementById('ownerQrUrl').textContent = qrUrl;
  document.getElementById('ownerQrImage').src = qrImageUrl;
  document.getElementById('ownerOpenQrBtn').href = qrUrl;
  document.getElementById('ownerDownloadQrBtn').href = qrImageUrl;
  ownerPublicMenuLink.href = getCafePublicUrl(selectedCafe);
}

function renderPremium() {
  const monetization = normalizeMonetization(selectedCafe);
  const planStatus = getPlanStatus(selectedCafe);
  const invoiceTotal = getInvoiceTotal(selectedCafe);
  const summaryCard = `
    
    
    
    <article class="owner-premium-card active">
    
    
    
      <span>${escapeHtml(planStatus.label)}</span>
    
    
    
      <strong>${escapeHtml(getActivePlanNames(selectedCafe).join(', ') || 'Free listing')}</strong>
    
    
    
      <p>${monetization.trialEndsAt ? `Trial ends ${escapeHtml(formatDateTime(monetization.trialEndsAt, 'soon'))}. ` : ''}${monetization.expiresAt ? `Expires ${escapeHtml(formatDateTime(monetization.expiresAt, 'not set'))}.` : 'No package expiration set.'}</p>
    
    
    
      <small>${monetization.invoices.length} invoice${monetization.invoices.length === 1 ? '' : 's'} · ${invoiceTotal} som total</small>
    
    
    
      ${monetization.adminNotes ? `<small>${escapeHtml(monetization.adminNotes)}</small>` : ''}
    
    
    
    </article>
  `;

  ownerPremiumGrid.innerHTML = summaryCard + cafePlanCatalog.map(plan => {
    
    
    
    const active = monetization.activePackageIds.includes(plan.id);
    
    
    
    return `
    
    
    
      <article class="owner-premium-card ${active ? 'active' : ''}">
    
    
    
        
    
    
    <span>${active ? 'Active package' : 'Available package'}</span>
    
    
    
        
    
    
    <strong>${escapeHtml(plan.name)}</strong>
    
    
    
        
    
    
    <p>${escapeHtml(plan.description)}</p>
    
    
    
        
    
    
    <small>${escapeHtml(plan.priceLabel)} · ${escapeHtml(plan.recommendedFor)}</small>
    
    
    
      </article>
    
    
    
    `;
  }).join('');
}

function renderReviews() {
  const filter = ownerReviewFilter.value;
  const reviews = currentReviews.filter(review => {
    
    
    
    if (filter === 'pending') return !review.approved;
    
    
    
    if (filter === 'approved') return review.approved && !review.flagged;
    
    
    
    if (filter === 'flagged') return review.flagged;
    
    
    
    return true;
  });

  ownerReviewList.innerHTML = reviews.length
    
    
    
    ? reviews.map(review => `
    
    
    
      <article class="owner-review-card" data-review-id="${escapeHtml(review.id)}">
    
    
    
        
    
    
    <div>
    
    
    
        
    
    
      <strong>${escapeHtml(review.name || review.username || 'Guest')}</strong>
    
    
    
        
    
    
      <span>${escapeHtml(review.rating || 5)} stars</span>
    
    
    
        
    
    
    </div>
    
    
    
        
    
    
    <div class="review-badge-row">
    
    
    
        
    
    
      ${getReviewBadgeLabels(review).map(badge => `<span>${escapeHtml(badge)}</span>`).join('')}
    
    
    
        
    
    
      ${(review.spamFlags || []).map(flag => `<span class="risk">${escapeHtml(flag)}</span>`).join('')}
    
    
    
        
    
    
    </div>
    
    
    
        
    
    
    <p>${escapeHtml(review.text || '')}</p>
    
    
    
        
    
    
    ${review.imageUrl ? `<img src="${escapeHtml(review.imageUrl)}" alt="Review photo" loading="lazy">` : ''}
    
    
    
        
    
    
    <small>${escapeHtml(formatDateTime(review.createdAt || review.timestamp, 'No date'))} · ${review.flagged ? 'Flagged' : review.approved ? 'Approved' : 'Pending'}</small>
    
    
    
        
    
    
    <label><span>Owner reply</span><textarea class="owner-reply-input" rows="2">${escapeHtml(review.ownerReply || '')}</textarea></label>
    
    
    
        
    
    
    <div class="owner-actions">
    
    
    
        
    
    
      <button class="primary-link save-owner-reply" type="button">Save reply</button>
    
    
    
        
    
    
      <button class="secondary-link flag-review-admin" type="button">Flag for admin</button>
    
    
    
        
    
    
    </div>
    
    
    
      </article>
    
    
    
    `).join('')
    
    
    
    : '<p class="empty-state">No reviews match this filter.</p>';
}

function renderAnalytics() {
  const growth = summarizeCafeGrowth(currentAnalyticsEvents, currentReviews);
  const photoCount = selectedCafe?.photos?.length || 0;
  const visibleItems = getVisibleMenuItemCount(currentMenu);

  const metricCards = [
    
    
    
    ['Menu scans', growth.menuScans, 'QR scans and QR menu opens this week.'],
    
    
    
    ['Cafe views', growth.cafeViews, 'Public cafe page views this week.'],
    
    
    
    ['Menu views', growth.menuViews, 'Non-QR menu sessions this week.'],
    
    
    
    ['Searches', growth.searches, 'Discovery and menu searches this week.'],
    
    
    
    ['Favorites', growth.favorites, 'Guests who saved this cafe this week.'],
    
    
    
    ['Reviews', growth.reviews, `${growth.averageRating} average rating.`],
    
    
    
    ['QR opens', growth.qrOpens, 'Direct QR-open events this week.'],
    
    
    
    ['Order link clicks', growth.orderLinkClicks, 'External order channel taps this week.'],
    
    
    
    
    
    
    
    ['Circle RSVPs', growth.circleRsvps, `${growth.circleSeats} reserved seats this week.`],
    
    
    
    ['Game engagement', growth.gameEngagement, 'Cafe or hub game sessions this week.'],
    
    
    
    ['Photos', photoCount, 'Gallery images on the listing.'],
    
    
    
    ['Visible menu items', visibleItems, 'Available, unhidden menu items.']
  ].map(([label, value, detail]) => `
    
    
    
    <article class="owner-analytics-card">
    
    
    
      <span>${escapeHtml(label)}</span>
    
    
    
      <strong>${escapeHtml(value || '0')}</strong>
    
    
    
      <small>${escapeHtml(detail)}</small>
    
    
    
    </article>
  `).join('');

  ownerAnalyticsGrid.innerHTML = `
    
    
    
    <article class="owner-analytics-card growth-insights-card">
    
    
    
      <span>Growth insights</span>
    
    
    
      <strong>This week</strong>
    
    
    
      <div class="growth-insight-list">
    
    
    
        
    
    
    ${growth.insights.map(insight => `<p>${escapeHtml(insight)}</p>`).join('')}
    
    
    
      </div>
    
    
    
    </article>
    
    
    
    ${metricCards}
    
    
    
    ${renderAnalyticsList('Top menu items', growth.topItems, 'No menu item views yet.')}
    
    
    
    ${renderAnalyticsList('Language usage', growth.languageUsage, 'No language data yet.')}
    
    
    
    ${renderAnalyticsList('Top searches', growth.topSearches, 'No searches yet.')}
    
    
    
    ${renderAnalyticsList('Games', growth.topGames, 'No game sessions yet.')}
  `;
}

function renderAnalyticsList(title, rows, emptyText) {
  return `
    
    
    
    <article class="owner-analytics-card growth-list-card">
    
    
    
      <span>${escapeHtml(title)}</span>
    
    
    
      <div class="growth-ranked-list">
    
    
    
        
    
    
    ${rows.length ? rows.slice(0, 5).map(row => `
    
    
    
        
    
    
      <p><strong>${escapeHtml(row.label)}</strong><small>${row.count}</small></p>
    
    
    
        
    
    
    `).join('') : `<p>${escapeHtml(emptyText)}</p>`}
    
    
    
      </div>
    
    
    
    </article>
  `;
}

function renderTranslationPills(translations, fields) {
  const coverage = getTranslationCoverage(translations || {}, fields);
  return `
    
    
    
    <div class="translation-status-row">
    
    
    
      ${coverage.statuses.map(status => `
    
    
    
        
    
    
    <span class="translation-status-pill ${escapeHtml(status.code)}" title="${escapeHtml(status.label)}">
    
    
    
        
    
    
      ${escapeHtml(status.language.label)} ${escapeHtml(status.label)}
    
    
    
        
    
    
    </span>
    
    
    
      `).join('')}
    
    
    
    </div>
  `;
}

function renderTranslations() {
  const summary = getMenuTranslationSummary(currentMenu);
  ownerTranslationSummary.innerHTML = `
    
    
    
    <article class="owner-analytics-card">
    
    
    
      <span>Approved</span>
    
    
    
      <strong>${summary.percent}%</strong>
    
    
    
      <small>${summary.approved}/${summary.total} priority translations approved.</small>
    
    
    
    </article>
    
    
    
    <article class="owner-analytics-card">
    
    
    
      <span>Needs review</span>
    
    
    
      <strong>${summary.needsReview}</strong>
    
    
    
      <small>Draft or partial translations waiting for human review.</small>
    
    
    
    </article>
    
    
    
    <article class="owner-analytics-card">
    
    
    
      <span>Missing</span>
    
    
    
      <strong>${summary.missing}</strong>
    
    
    
      <small>Languages without a draft yet.</small>
    
    
    
    </article>
  `;

  const rows = [];
  rows.push(`
    
    
    
    <article class="translation-review-card" data-kind="cafe">
    
    
    
      <div>
    
    
    
        
    
    
    <strong>${escapeHtml(selectedCafe?.name || 'Cafe profile')}</strong>
    
    
    
        
    
    
    <small>Cafe profile</small>
    
    
    
      </div>
    
    
    
      ${renderTranslationPills(selectedCafe?.translations || {}, ['name', 'description'])}
    
    
    
      <div class="translation-review-controls">
    
    
    
        
    
    
    ${getTranslationTargets().map(language => `
    
    
    
        
    
    
      <label>
    
    
    
        
    
    
        
    
    
    <span>${escapeHtml(language.label)}</span>
    
    
    
        
    
    
        
    
    
    <select data-translation-status="${escapeHtml(language.code)}">
    
    
    
        
    
    
        
    
    
      <option value="">Needs review</option>
    
    
    
        
    
    
        
    
    
      <option value="approved" ${selectedCafe?.translations?.[language.code]?.status === 'approved' ? 'selected' : ''}>Approved</option>
    
    
    
        
    
    
        
    
    
      <option value="needs-review" ${selectedCafe?.translations?.[language.code]?.status === 'needs-review' ? 'selected' : ''}>Needs review</option>
    
    
    
        
    
    
        
    
    
    </select>
    
    
    
        
    
    
      </label>
    
    
    
        
    
    
    `).join('')}
    
    
    
      </div>
    
    
    
    </article>
  `);

  currentMenu.forEach((category, categoryIndex) => {
    
    
    
    rows.push(`
    
    
    
      <article class="translation-review-card" data-kind="category" data-category-index="${categoryIndex}">
    
    
    
        
    
    
    <div>
    
    
    
        
    
    
      <strong>${escapeHtml(category.category_en || category.name || 'Category')}</strong>
    
    
    
        
    
    
      <small>Category</small>
    
    
    
        
    
    
    </div>
    
    
    
        
    
    
    ${renderTranslationPills(category.translations || {}, ['name'])}
    
    
    
      </article>
    
    
    
    `);

    
    
    
    (category.items || []).forEach((item, itemIndex) => {
    
    
    
      rows.push(`
    
    
    
        
    
    
    <article class="translation-review-card" data-kind="item" data-category-index="${categoryIndex}" data-item-index="${itemIndex}">
    
    
    
        
    
    
      <div>
    
    
    
        
    
    
        
    
    
    <strong>${escapeHtml(item.name || 'Menu item')}</strong>
    
    
    
        
    
    
        
    
    
    <small>${escapeHtml(category.category_en || 'Menu')}</small>
    
    
    
        
    
    
      </div>
    
    
    
        
    
    
      ${renderTranslationPills(item.translations || {}, ['name'])}
    
    
    
        
    
    
      <div class="translation-review-controls">
    
    
    
        
    
    
        
    
    
    ${getTranslationTargets().map(language => `
    
    
    
        
    
    
        
    
    
      <label>
    
    
    
        
    
    
        
    
    
        
    
    
    <span>${escapeHtml(language.label)}</span>
    
    
    
        
    
    
        
    
    
        
    
    
    <select data-translation-status="${escapeHtml(language.code)}">
    
    
    
        
    
    
        
    
    
        
    
    
      <option value="">Needs review</option>
    
    
    
        
    
    
        
    
    
        
    
    
      <option value="approved" ${item.translations?.[language.code]?.status === 'approved' ? 'selected' : ''}>Approved</option>
    
    
    
        
    
    
        
    
    
        
    
    
      <option value="needs-review" ${item.translations?.[language.code]?.status === 'needs-review' ? 'selected' : ''}>Needs review</option>
    
    
    
        
    
    
        
    
    
        
    
    
    </select>
    
    
    
        
    
    
        
    
    
      </label>
    
    
    
        
    
    
        
    
    
    `).join('')}
    
    
    
        
    
    
      </div>
    
    
    
        
    
    
    </article>
    
    
    
      `);
    
    
    
    });
  });

  ownerTranslationList.innerHTML = rows.length
    
    
    
    ? rows.join('')
    
    
    
    : '<p class="empty-state">Add menu items before reviewing translations.</p>';
}

function renderAll() {
  if (!selectedCafe) return;
  currentMenu = normalizeMenu(selectedCafe.menu);
  fillProfileForm(selectedCafe);
  renderMetrics();
  renderMenuEditor();
  renderPhotos();
  renderQrTools();
  renderPremium();
  renderTranslations();
  renderReviews();
  renderAnalytics();
}

async function selectCafe(cafeId) {
  selectedCafeId = cafeId;
  selectedCafe = ownerCafes.find(cafe => cafe.id === selectedCafeId) || null;

  if (!selectedCafe) {
    
    
    
    setOwnerError('No cafe selected.');
    
    
    
    return;
  }

  setOwnerBusy(`Loading ${selectedCafe.name || selectedCafe.id}...`);
  currentReviews = await loadCafeReviews(selectedCafe.id);
  currentAnalyticsEvents = await loadCafeAnalytics(selectedCafe.id);
  renderAll();
  setOwnerSuccess(`Owner portal loaded for ${selectedCafe.name || selectedCafe.id}.`);
}

async function refreshSelectedCafe() {
  if (!selectedCafeId) return;
  try {
    
    
    
    const cafeSnap = await getDoc(doc(db, 'cafes', selectedCafeId));
    
    
    
    if (cafeSnap.exists()) {
    
    
    
      selectedCafe = { id: cafeSnap.id, ...cafeSnap.data() };
    
    
    
      ownerCafes = ownerCafes.map(cafe => cafe.id === selectedCafeId ? selectedCafe : cafe);
    
    
    
    }
  } catch (error) {
    
    
    
    console.warn('[ownerDashboard] Could not refresh cafe.', error);
  }
}

function bindTabs() {
  document.querySelectorAll('[data-owner-tab]').forEach(tabButton => {
    
    
    
    tabButton.addEventListener('click', () => {
    
    
    
      const tabName = tabButton.dataset.ownerTab;
    
    
    
      document.querySelectorAll('[data-owner-tab]').forEach(button => {
    
    
    
        
    
    
    button.classList.toggle('active', button === tabButton);
    
    
    
      });
    
    
    
      document.querySelectorAll('.owner-panel').forEach(panel => {
    
    
    
        
    
    
    panel.classList.toggle('active', panel.id === `ownerPanel${tabName[0].toUpperCase()}${tabName.slice(1)}`);
    
    
    
      });
    
    
    
    });
  });
}

function bindEvents() {
  ownerCafeSelect.addEventListener('change', () => selectCafe(ownerCafeSelect.value));

  ownerLogoutBtn.addEventListener('click', async () => {
    
    
    
    await signOut(auth);
    
    
    
    window.location.href = 'login.html';
  });

  ownerProfileForm.addEventListener('submit', async event => {
    
    
    
    event.preventDefault();
    
    
    
    if (!selectedCafe || !isCafeOwner(selectedCafe) && currentUserProfile?.role !== 'admin') return;
    
    
    
    const submitButton = ownerProfileForm.querySelector('button[type="submit"]');
    
    
    
    submitButton.disabled = true;
    
    
    
    setOwnerBusy('Saving cafe profile...');

    
    
    
    const instagram = document.getElementById('ownerCafeInstagram').value.trim();
    
    
    
    const imageUrl = document.getElementById('ownerCafeImageUrl').value.trim();
    
    
    
    const updated = {
    
    
    
      name: document.getElementById('ownerCafeName').value.trim(),
    
    
    
      slug: document.getElementById('ownerCafeSlug').value.trim(),
    
    
    
      path_name: document.getElementById('ownerCafeSlug').value.trim(),
    
    
    
      description: document.getElementById('ownerCafeDescription').value.trim(),
    
    
    
      address: document.getElementById('ownerCafeAddress').value.trim(),
    
    
    
      tags: normalizeTags(document.getElementById('ownerCafeTags').value),
    
    
    
      priceTier: document.getElementById('ownerCafePriceTier').value,
    
    
    
      locationArea: document.getElementById('ownerCafeLocationArea').value,
    
    
    
      phone: document.getElementById('ownerCafePhone').value.trim(),
    
    
    
      hours: { daily: document.getElementById('ownerCafeHours').value.trim() },
    
    
    
      orderUrl: document.getElementById('ownerCafeOrderUrl').value.trim(),
    
    
    
      waiterRequestUrl: document.getElementById('ownerCafeWaiterUrl').value.trim(),
    
    
    
      imageUrl,
    
    
    
      coverImageUrl: imageUrl,
    
    
    
      socials: { ...(selectedCafe.socials || {}), instagram },
    
    
    
      updatedAt: new Date()
    
    
    
    };

    
    
    
    try {
    
    
    
      await requireIntentSuccess(await runIntentPipeline('UpdateCafeProfileIntent', {
    
    
    
        
    
    
    cafeId: selectedCafe.id,
    
    
    
        
    
    
    profile: updated
    
    
    
      }));
    
    
    
      await refreshSelectedCafe();
    
    
    
      renderCafeSelector();
    
    
    
      renderAll();
    
    
    
      setOwnerSuccess('Cafe profile saved.');
    
    
    
    } catch (error) {
    
    
    
      console.error('[ownerDashboard] Profile save failed.', error);
    
    
    
      setOwnerError('Cafe profile could not be saved.');
    
    
    
    } finally {
    
    
    
      submitButton.disabled = false;
    
    
    
    }
  });

  ownerAddCategoryBtn.addEventListener('click', () => {
    
    
    
    currentMenu = readMenuFromDom();
    
    
    
    currentMenu.push({ category_en: '', category_ru: '', category_ky: '', items: [] });
    
    
    
    renderMenuEditor();
  });

  ownerMenuEditor.addEventListener('click', event => {
    
    
    
    const button = event.target.closest('button');
    
    
    
    if (!button) return;

    
    
    
    if (button.classList.contains('add-menu-item')) {
    
    
    
      const categoryNode = button.closest('.owner-menu-category');
    
    
    
      const itemList = categoryNode.querySelector('.owner-menu-items');
    
    
    
      itemList.querySelector('.empty-state')?.remove();
    
    
    
      itemList.insertAdjacentHTML('beforeend', renderMenuItemRow({}));
    
    
    
    }

    
    
    
    if (button.classList.contains('delete-menu-category')) {
    
    
    
      button.closest('.owner-menu-category')?.remove();
    
    
    
    }

    
    
    
    if (button.classList.contains('remove-menu-item')) {
    
    
    
      button.closest('.owner-menu-item')?.remove();
    
    
    
    }

    
    
    
    if (button.classList.contains('add-order-link')) {
    
    
    
      const itemNode = button.closest('.owner-menu-item');
    
    
    
      const listNode = itemNode.querySelector('.owner-order-link-list');
    
    
    
      const nextSort = listNode.querySelectorAll('.owner-order-link-row').length + 1;
    
    
    
      listNode.insertAdjacentHTML('beforeend', renderOwnerOrderLinkRow({ sortOrder: nextSort }));
    
    
    
    }

    
    
    
    if (button.classList.contains('remove-order-link')) {
    
    
    
      button.closest('.owner-order-link-row')?.remove();
    
    
    
    }
  });

  ownerSaveMenuBtn.addEventListener('click', async () => {
    
    
    
    if (!selectedCafe) return;
    
    
    
    ownerSaveMenuBtn.disabled = true;
    
    
    
    setOwnerBusy('Saving menu...');
    
    
    
    try {
    
    
    
      const menu = readMenuFromDom();
    
    
    
      await requireIntentSuccess(await runIntentPipeline('UpdateCafeMenuIntent', {
    
    
    
        
    
    
    cafeId: selectedCafe.id,
    
    
    
        
    
    
    menu
    
    
    
      }));
    
    
    
      await refreshSelectedCafe();
    
    
    
      renderAll();
    
    
    
      setOwnerSuccess('Menu saved. Public QR menus update immediately.');
    
    
    
    } catch (error) {
    
    
    
      console.error('[ownerDashboard] Menu save failed.', error);
    
    
    
      setOwnerError('Menu could not be saved.');
    
    
    
    } finally {
    
    
    
      ownerSaveMenuBtn.disabled = false;
    
    
    
    }
  });

  ownerPhotoForm.addEventListener('submit', async event => {
    
    
    
    event.preventDefault();
    
    
    
    if (!selectedCafe) return;
    
    
    
    const submitButton = ownerPhotoForm.querySelector('button[type="submit"]');
    
    
    
    const file = document.getElementById('ownerPhotoFile').files?.[0];
    
    
    
    const url = document.getElementById('ownerPhotoUrl').value.trim();

    
    
    
    if (!file && !isSafeHttpUrl(url)) {
    
    
    
      setOwnerError('Choose an image file or enter a valid image URL.');
    
    
    
      return;
    
    
    
    }

    
    
    
    submitButton.disabled = true;
    
    
    
    setOwnerBusy('Adding photo...');
    
    
    
    try {
    
    
    
      const photoUrl = file ? await uploadCafePhoto(selectedCafe.id, file) : url;
    
    
    
      const photos = [...(selectedCafe.photos || []), photoUrl];
    
    
    
      const update = { photos, updatedAt: new Date() };
    
    
    
      if (!selectedCafe.imageUrl) {
    
    
    
        
    
    
    update.imageUrl = photoUrl;
    
    
    
        
    
    
    update.coverImageUrl = photoUrl;
    
    
    
      }
    
    
    
      await requireIntentSuccess(await runIntentPipeline('UpdateCafePhotosIntent', {
    
    
    
        
    
    
    cafeId: selectedCafe.id,
    
    
    
        
    
    
    photos: update.photos,
    
    
    
        
    
    
    imageUrl: update.imageUrl || '',
    
    
    
        
    
    
    coverImageUrl: update.coverImageUrl || ''
    
    
    
      }));
    
    
    
      ownerPhotoForm.reset();
    
    
    
      await refreshSelectedCafe();
    
    
    
      renderAll();
    
    
    
      setOwnerSuccess('Photo added.');
    
    
    
    } catch (error) {
    
    
    
      console.error('[ownerDashboard] Photo add failed.', error);
    
    
    
      setOwnerError('Photo could not be added. Check storage permissions.');
    
    
    
    } finally {
    
    
    
      submitButton.disabled = false;
    
    
    
    }
  });

  ownerPhotoGrid.addEventListener('click', async event => {
    
    
    
    const removeButton = event.target.closest('.remove-owner-photo');
    
    
    
    const coverButton = event.target.closest('.set-cover-photo');
    
    
    
    if (!selectedCafe || (!removeButton && !coverButton)) return;

    
    
    
    const photoUrl = (removeButton || coverButton).dataset.photoUrl;
    
    
    
    setOwnerBusy('Updating photos...');
    
    
    
    try {
    
    
    
      if (removeButton) {
    
    
    
        
    
    
    const photos = (selectedCafe.photos || []).filter(url => url !== photoUrl);
    
    
    
        
    
    
    await requireIntentSuccess(await runIntentPipeline('UpdateCafePhotosIntent', {
    
    
    
        
    
    
      cafeId: selectedCafe.id,
    
    
    
        
    
    
      photos
    
    
    
        
    
    
    }));
    
    
    
      }
    
    
    
      if (coverButton) {
    
    
    
        
    
    
    await requireIntentSuccess(await runIntentPipeline('UpdateCafePhotosIntent', {
    
    
    
        
    
    
      cafeId: selectedCafe.id,
    
    
    
        
    
    
      photos: selectedCafe.photos || [],
    
    
    
        
    
    
      imageUrl: photoUrl,
    
    
    
        
    
    
      coverImageUrl: photoUrl
    
    
    
        
    
    
    }));
    
    
    
      }
    
    
    
      await refreshSelectedCafe();
    
    
    
      renderAll();
    
    
    
      setOwnerSuccess(removeButton ? 'Photo removed from gallery.' : 'Cover photo updated.');
    
    
    
    } catch (error) {
    
    
    
      console.error('[ownerDashboard] Photo update failed.', error);
    
    
    
      setOwnerError('Photo update could not be saved.');
    
    
    
    }
  });

  document.getElementById('ownerCopyQrLinkBtn').addEventListener('click', async () => {
    
    
    
    try {
    
    
    
      await navigator.clipboard.writeText(getCafeQrUrl(selectedCafe));
    
    
    
      setOwnerSuccess('QR menu link copied.');
    
    
    
    } catch {
    
    
    
      setOwnerError('Copy failed. Select and copy the QR link manually.');
    
    
    
    }
  });

  ownerReviewFilter.addEventListener('change', renderReviews);

  ownerDraftTranslationsBtn.addEventListener('click', async () => {
    
    
    
    if (!selectedCafe) return;
    
    
    
    ownerDraftTranslationsBtn.disabled = true;
    
    
    
    setOwnerBusy('Drafting missing translations...');
    
    
    
    try {
    
    
    
      const menu = buildMenuDrafts(readMenuFromDom());
    
    
    
      const cafeTranslations = buildTranslationDrafts({
    
    
    
        
    
    
    name: selectedCafe.name || '',
    
    
    
        
    
    
    description: selectedCafe.description || ''
    
    
    
      }, selectedCafe.translations || {}, ['name', 'description']);
    
    
    
      await requireIntentSuccess(await runIntentPipeline('UpdateCafeTranslationsIntent', {
    
    
    
        
    
    
    cafeId: selectedCafe.id,
    
    
    
        
    
    
    menu,
    
    
    
        
    
    
    translations: cafeTranslations
    
    
    
      }));
    
    
    
      await refreshSelectedCafe();
    
    
    
      renderAll();
    
    
    
      setOwnerSuccess('Missing translation drafts created. Review and approve them before launch.');
    
    
    
    } catch (error) {
    
    
    
      console.error('[ownerDashboard] Translation draft failed.', error);
    
    
    
      setOwnerError('Translation drafts could not be saved.');
    
    
    
    } finally {
    
    
    
      ownerDraftTranslationsBtn.disabled = false;
    
    
    
    }
  });

  ownerSaveTranslationReviewBtn.addEventListener('click', async () => {
    
    
    
    if (!selectedCafe) return;
    
    
    
    ownerSaveTranslationReviewBtn.disabled = true;
    
    
    
    setOwnerBusy('Saving translation review statuses...');
    
    
    
    try {
    
    
    
      const menu = readMenuFromDom();
    
    
    
      const cafeTranslations = Object.assign({}, selectedCafe.translations || {});
    
    
    
      ownerTranslationList.querySelectorAll('[data-kind="item"]').forEach(card => {
    
    
    
        
    
    
    const categoryIndex = Number(card.dataset.categoryIndex);
    
    
    
        
    
    
    const itemIndex = Number(card.dataset.itemIndex);
    
    
    
        
    
    
    const item = menu[categoryIndex]?.items?.[itemIndex];
    
    
    
        
    
    
    if (!item) return;
    
    
    
        
    
    
    item.translations = item.translations || {};
    
    
    
        
    
    
    card.querySelectorAll('[data-translation-status]').forEach(select => {
    
    
    
        
    
    
      const languageCode = select.dataset.translationStatus;
    
    
    
        
    
    
      item.translations[languageCode] = Object.assign({}, item.translations[languageCode] || {}, {
    
    
    
        
    
    
        
    
    
    status: select.value || 'needs-review',
    
    
    
        
    
    
        
    
    
    reviewedAt: new Date().toISOString()
    
    
    
        
    
    
      });
    
    
    
        
    
    
    });
    
    
    
      });
    
    
    
      ownerTranslationList.querySelectorAll('[data-kind="cafe"] [data-translation-status]').forEach(select => {
    
    
    
        
    
    
    const languageCode = select.dataset.translationStatus;
    
    
    
        
    
    
    cafeTranslations[languageCode] = Object.assign({}, cafeTranslations[languageCode] || {}, {
    
    
    
        
    
    
      status: select.value || 'needs-review',
    
    
    
        
    
    
      reviewedAt: new Date().toISOString()
    
    
    
        
    
    
    });
    
    
    
      });
    
    
    
      await requireIntentSuccess(await runIntentPipeline('UpdateCafeTranslationsIntent', {
    
    
    
        
    
    
    cafeId: selectedCafe.id,
    
    
    
        
    
    
    menu,
    
    
    
        
    
    
    translations: cafeTranslations
    
    
    
      }));
    
    
    
      await refreshSelectedCafe();
    
    
    
      renderAll();
    
    
    
      setOwnerSuccess('Translation review statuses saved.');
    
    
    
    } catch (error) {
    
    
    
      console.error('[ownerDashboard] Translation review save failed.', error);
    
    
    
      setOwnerError('Translation review statuses could not be saved.');
    
    
    
    } finally {
    
    
    
      ownerSaveTranslationReviewBtn.disabled = false;
    
    
    
    }
  });

  ownerReviewList.addEventListener('click', async event => {
    
    
    
    const replyButton = event.target.closest('.save-owner-reply');
    
    
    
    const flagButton = event.target.closest('.flag-review-admin');
    
    
    
    if (!replyButton && !flagButton) return;
    
    
    
    const card = event.target.closest('[data-review-id]');
    
    
    
    const reviewId = card?.dataset.reviewId;
    
    
    
    if (!reviewId) return;

    
    
    
    setOwnerBusy('Updating review...');
    
    
    
    try {
    
    
    
      if (replyButton) {
    
    
    
        
    
    
    await requireIntentSuccess(await runIntentPipeline('UpdateReviewOwnerResponseIntent', {
    
    
    
        
    
    
      reviewId,
    
    
    
        
    
    
      action: 'reply',
    
    
    
        
    
    
      ownerReply: card.querySelector('.owner-reply-input')?.value.trim() || ''
    
    
    
        
    
    
    }));
    
    
    
      }
    
    
    
      if (flagButton) {
    
    
    
        
    
    
    await requireIntentSuccess(await runIntentPipeline('UpdateReviewOwnerResponseIntent', {
    
    
    
        
    
    
      reviewId,
    
    
    
        
    
    
      action: 'flag'
    
    
    
        
    
    
    }));
    
    
    
      }
    
    
    
      currentReviews = await loadCafeReviews(selectedCafe.id);
    
    
    
      renderReviews();
    
    
    
      renderMetrics();
    
    
    
      renderAnalytics();
    
    
    
      setOwnerSuccess(replyButton ? 'Owner reply saved.' : 'Review flagged for admin.');
    
    
    
    } catch (error) {
    
    
    
      console.error('[ownerDashboard] Review update failed.', error);
    
    
    
      setOwnerError('Review update could not be saved.');
    
    
    
    }
  });
}

async function initOwnerPortal(user) {
  currentUser = user;
  currentUserProfile = await loadUserProfile(user);
  ownerCafes = await loadOwnerCafes(user, currentUserProfile);

  if (!ownerCafes.length) {
    
    
    
    ownerCafeSelect.innerHTML = '<option value="">No assigned cafes</option>';
    
    
    
    setOwnerError('No cafes are assigned to this account yet. Ask an admin to set you as owner or extra admin.');
    
    
    
    return;
  }

  selectedCafeId = ownerCafes[0].id;
  renderCafeSelector();
  await selectCafe(selectedCafeId);
}

bindTabs();
bindEvents();

onAuthStateChanged(auth, async user => {
  if (!user) {
    
    
    
    setOwnerBusy('Login required. Redirecting...');
    
    
    
    redirectToLogin('/owner-dashboard.html');
    
    
    
    return;
  }

  await initOwnerPortal(user);
});




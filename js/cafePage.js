import { db } from './firebase-init.js';
import { supportedLanguages, getStoredLanguage, setStoredLanguage, getLanguageName } from './i18n.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const languageSelector = document.getElementById('languageSelector');
const cafeInfo = document.getElementById('cafeInfo');
const menuSection = document.getElementById('menuSection');
const menuCategories = document.getElementById('menuCategories');
const menuItems = document.getElementById('menuItems');
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
}

function renderCafeInfo(cafeData) {
  const cafe = getTranslatedCafe(cafeData);
  const tags = cafeData.tags || [];
  const menuUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(currentCafeId || cafeData.id || 'mano')}&qr=1`;

  document.title = `MyCafe | ${cafe.name}`;
  cafeInfo.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div>
        <p class="eyebrow">${getLanguageName(currentLanguage)}</p>
        <h1 class="text-3xl font-bold mb-2">${cafe.name}</h1>
        <p class="mb-3">${cafe.description}</p>
        <p class="text-sm text-gray-600">${cafe.address}</p>
        <div class="tag-row">
          ${tags.map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="grid gap-2 min-w-[220px]">
        <a class="primary-link" href="${menuUrl}">QR menu view</a>
        ${cafeData.qrCode ? `<a class="secondary-link" href="${cafeData.qrCode}" download>Download QR code</a>` : ''}
        ${cafeData.socials?.instagram ? `<a class="secondary-link" href="https://instagram.com/${String(cafeData.socials.instagram).replace('@', '')}">Instagram</a>` : ''}
      </div>
    </div>
  `;
}

function getCategoryName(category) {
  return category[`category_${currentLanguage}`] || category.category_en || category.name || 'Menu';
}

function getItemName(item) {
  return item.translations?.[currentLanguage]?.name || item.name || 'Item';
}

function getItemDescription(item) {
  return item.translations?.[currentLanguage]?.description || item.description || '';
}

function renderCategoryItems(category) {
  menuItems.innerHTML = '';
  const items = category.items || [];
  const itemsGrid = document.createElement('div');
  itemsGrid.className = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

  items.forEach(item => {
    const itemCard = document.createElement('article');
    itemCard.className = 'bg-white rounded-lg shadow p-4 flex flex-col';
    itemCard.innerHTML = `
      ${item.image ? `<img src="${item.image}" alt="${getItemName(item)}" class="w-full h-32 object-cover rounded mb-3">` : ''}
      <div class="flex-grow">
        <h4 class="text-lg font-semibold text-gray-800">${getItemName(item)}</h4>
        ${getItemDescription(item) ? `<p class="text-sm text-gray-600 mt-1">${getItemDescription(item)}</p>` : ''}
        ${item.available === false ? '<p class="text-sm text-red-700 mt-2">Currently unavailable</p>' : ''}
      </div>
      <p class="font-bold text-gray-900 mt-3 text-right">${item.price} сом</p>
    `;
    itemsGrid.appendChild(itemCard);
  });

  menuItems.appendChild(itemsGrid);
}

function renderMenu(menuData) {
  if (!menuData || !Array.isArray(menuData) || menuData.length === 0) {
    menuSection.classList.add('hidden');
    return;
  }

  menuSection.classList.remove('hidden');
  menuCategories.innerHTML = '';

  menuData.forEach((category, index) => {
    const categoryName = getCategoryName(category);
    const icon = categoryIcons[category.category_en] || '🍽️';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flex-shrink-0 md:w-full text-left p-3 rounded-lg flex items-center gap-3 transition duration-200 whitespace-nowrap';
    button.innerHTML = `<span>${icon}</span><span class="font-semibold">${categoryName}</span>`;
    button.dataset.index = index;
    button.classList.add(index === 0 ? 'bg-white' : 'hover:bg-gray-200', index === 0 ? 'shadow' : 'bg-transparent');
    menuCategories.appendChild(button);
  });

  menuCategories.onclick = event => {
    const clickedButton = event.target.closest('button');
    if (!clickedButton) return;

    menuCategories.querySelectorAll('button').forEach(button => {
      button.classList.remove('bg-white', 'shadow');
      button.classList.add('hover:bg-gray-200', 'bg-transparent');
    });

    clickedButton.classList.add('bg-white', 'shadow');
    clickedButton.classList.remove('hover:bg-gray-200', 'bg-transparent');
    renderCategoryItems(menuData[Number(clickedButton.dataset.index)]);
  };

  renderCategoryItems(menuData[0]);
}

function renderReviews(reviews = []) {
  if (!reviews.length) {
    reviewList.innerHTML = '<p class="text-gray-600">Approved reviews will appear here.</p>';
    return;
  }

  reviewList.innerHTML = reviews.map(review => `
    <article class="bg-white rounded-lg border p-4">
      <div class="flex justify-between gap-3">
        <strong>${review.username || review.name || 'Guest'}</strong>
        <span>${review.rating || 5} stars</span>
      </div>
      <p class="mt-2">${review.text || ''}</p>
      ${review.imageUrl ? `<img src="${review.imageUrl}" alt="Review photo" class="w-28 mt-3 rounded">` : ''}
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

function bindGuestReview() {
  guestReviewForm.addEventListener('submit', async event => {
    event.preventDefault();
    const review = {
      cafeId: currentCafeId,
      name: document.getElementById('guestName').value.trim(),
      email: document.getElementById('guestEmail').value.trim(),
      rating: Number(document.getElementById('guestRating').value),
      imageUrl: document.getElementById('guestPhotoUrl').value.trim(),
      text: document.getElementById('guestReviewText').value.trim(),
      language: currentLanguage,
      approved: false,
      flagged: false,
      createdAt: new Date()
    };

    try {
      await addDoc(collection(db, 'reviews'), review);
      guestReviewForm.reset();
      reviewList.innerHTML = '<p class="text-green-700">Review sent for approval. Check your email for edit access.</p>';
    } catch (error) {
      console.error('[cafePage] Could not submit review.', error);
      reviewList.innerHTML = '<p class="text-red-700">Review could not be sent right now.</p>';
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
  renderReviews(await loadReviews(currentCafeId));
}

languageSelector.addEventListener('change', event => {
  currentLanguage = event.target.value;
  setStoredLanguage(currentLanguage);
  if (currentCafeData) renderCafeInfo(currentCafeData);
  if (currentMenuData) renderMenu(currentMenuData);
});

populateLanguageSelector();
bindGuestReview();
renderPage();

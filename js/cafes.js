import { db } from './firebase-init.js';
import { supportedLanguages, getStoredLanguage, setStoredLanguage } from './i18n.js';
import { recordLocalLoyaltyEvent } from '../packages/domain/loyalty/loyaltyEngine.js';
import { recordAnalyticsEvent } from '../packages/domain/analytics/growthAnalytics.js';
import { escapeHtml } from '../packages/ui/renderHelpers.js';
import {
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const cafeGrid = document.getElementById('cafeGrid');
const mapMarkers = document.getElementById('mapMarkers');
const flagTrack = document.getElementById('flagTrack');
const searchInput = document.getElementById('searchInput');
const tagFilter = document.getElementById('tagFilter');
const priceFilter = document.getElementById('priceFilter');
const locationFilter = document.getElementById('locationFilter');
const phrasePracticeBtn = document.getElementById('phrasePracticeBtn');

const fallbackCafes = [
  {
    id: 'mano',
    name: 'Mano Cafe',
    description: 'Fresh breakfasts, coffee, teas, and a translated digital menu.',
    imageUrl: 'assets/mano/mano_logo.png',
    photos: ['assets/mano/mano_logo.png'],
    path_name: 'mano',
    locationArea: 'center',
    priceTier: 'mid',
    tags: ['breakfast', 'coffee', 'desserts'],
    address: 'Bishkek center'
  }
];

let cafes = [];
let currentLanguage = getStoredLanguage();
let currentLangIndex = Math.max(0, supportedLanguages.findIndex(language => language.code === currentLanguage));
let discoverySearchTimer = null;

function translateCafe(cafe) {
  const translation = cafe.translations?.[currentLanguage] || {};
  return {
    name: translation.name || cafe.name || 'Cafe',
    description: translation.description || cafe.description || ''
  };
}

function normalizeCafe(rawCafe) {
  const photos = rawCafe.photos || [];
  return {
    ...rawCafe,
    imageUrl: rawCafe.imageUrl || photos[0] || rawCafe.logoUrl || 'assets/logo.png',
    tags: rawCafe.tags || [],
    priceTier: rawCafe.priceTier || rawCafe.price || 'mid',
    locationArea: rawCafe.locationArea || rawCafe.area || '',
    address: rawCafe.address || rawCafe.location?.address || 'Bishkek'
  };
}

async function getAllCafes() {
  try {
    const snapshot = await getDocs(collection(db, 'cafes'));
    const loaded = snapshot.docs.map(doc => normalizeCafe({ id: doc.id, ...doc.data() }));
    return loaded.length ? loaded : fallbackCafes;
  } catch (error) {
    console.warn('[cafes] Firestore unavailable, rendering local cafe data.', error);
    return fallbackCafes;
  }
}

function renderLanguageCarousel() {
  flagTrack.innerHTML = '';

  for (let offset = -1; offset <= 1; offset += 1) {
    const index = (currentLangIndex + offset + supportedLanguages.length) % supportedLanguages.length;
    const language = supportedLanguages[index];
    const wrapper = document.createElement('button');
    wrapper.type = 'button';
    wrapper.className = `flag${offset === 0 ? ' selected' : ''}`;
    wrapper.dataset.code = language.code;
    wrapper.innerHTML = `
      <img src="https://flagcdn.com/w40/${language.flagCode}.png" alt="${language.name}">
      <span class="flag-label">${language.label}</span>
    `;
    wrapper.addEventListener('click', () => {
      currentLangIndex = supportedLanguages.findIndex(item => item.code === language.code);
      currentLanguage = setStoredLanguage(language.code);
      recordAnalyticsEvent(db, 'language-usage', {
        language: currentLanguage,
        source: 'cafe-discovery'
      });
      renderLanguageCarousel();
      renderCafes();
    });
    flagTrack.appendChild(wrapper);
  }

  currentLanguage = setStoredLanguage(supportedLanguages[currentLangIndex].code);
}

function buildTagOptions() {
  tagFilter.innerHTML = '<option value="">All tags</option>';
  const tags = new Set();
  cafes.forEach(cafe => cafe.tags.forEach(tag => tags.add(tag)));
  [...tags].sort().forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  });
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('mycafe:favorites') || '[]');
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem('mycafe:favorites', JSON.stringify(favorites));
}

function toggleFavorite(cafeId) {
  const favorites = getFavorites();
  const wasFavorite = favorites.includes(cafeId);
  const next = favorites.includes(cafeId)
    ? favorites.filter(id => id !== cafeId)
    : [...favorites, cafeId];
  saveFavorites(next);
  if (!wasFavorite) {
    recordLocalLoyaltyEvent('favorite', {
      cafeId,
      dedupeKey: `favorite:${cafeId}`,
      xp: 5
    });
    const cafe = cafes.find(item => item.id === cafeId);
    recordAnalyticsEvent(db, 'favorite', {
      cafeId,
      cafeName: cafe?.name || cafeId,
      language: currentLanguage,
      source: 'cafe-discovery'
    });
  }
  renderCafes();
}

function trackDiscoverySearch() {
  const search = searchInput.value.trim();
  if (search.length < 2 && !tagFilter.value && !priceFilter.value && !locationFilter.value) return;
  window.clearTimeout(discoverySearchTimer);
  discoverySearchTimer = window.setTimeout(() => {
    recordAnalyticsEvent(db, 'search', {
      language: currentLanguage,
      query: search.toLowerCase(),
      resultsCount: getFilteredCafes().length,
      source: 'cafe-discovery',
      metadata: {
        tag: tagFilter.value,
        price: priceFilter.value,
        location: locationFilter.value
      }
    });
  }, 700);
}

function getFilteredCafes() {
  const search = searchInput.value.trim().toLowerCase();
  const tag = tagFilter.value;
  const price = priceFilter.value;
  const location = locationFilter.value;

  return cafes.filter(cafe => {
    const translated = translateCafe(cafe);
    const searchTarget = `${translated.name} ${translated.description} ${(cafe.tags || []).join(' ')}`.toLowerCase();
    const matchesSearch = !search || searchTarget.includes(search);
    const matchesTag = !tag || cafe.tags.includes(tag);
    const matchesPrice = !price || cafe.priceTier === price;
    const matchesLocation = !location || cafe.locationArea === location;
    return matchesSearch && matchesTag && matchesPrice && matchesLocation;
  });
}

function renderMapMarkers(filteredCafes) {
  mapMarkers.innerHTML = '';

  if (!filteredCafes.length) {
    mapMarkers.innerHTML = '<p class="empty-state">No cafes match these filters.</p>';
    return;
  }

  filteredCafes.forEach((cafe, index) => {
    const translated = translateCafe(cafe);
    const marker = document.createElement('a');
    marker.href = `cafe.html?id=${encodeURIComponent(cafe.id)}`;
    marker.className = 'marker-item';
    marker.innerHTML = `
      <span>${index + 1}. ${escapeHtml(translated.name)}</span>
      <small>${escapeHtml(cafe.address)}</small>
    `;
    mapMarkers.appendChild(marker);
  });
}

function renderCafeCard(cafe) {
  const translated = translateCafe(cafe);
  const favorites = getFavorites();
  const isFavorite = favorites.includes(cafe.id);
  const card = document.createElement('article');
  card.className = 'cafe-card';
  card.innerHTML = `
    <a href="cafe.html?id=${encodeURIComponent(cafe.id)}">
      <img src="${escapeHtml(cafe.imageUrl)}" alt="${escapeHtml(translated.name)}" loading="lazy">
    </a>
    <div class="cafe-card-body">
      <h3>${escapeHtml(translated.name)}</h3>
      <p>${escapeHtml(translated.description || cafe.address)}</p>
      <div class="tag-row">
        ${(cafe.tags || []).map(tag => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="card-actions">
        <a class="primary-link" href="cafe.html?id=${encodeURIComponent(cafe.id)}">Open menu</a>
        <button class="favorite-btn" type="button">${isFavorite ? 'Saved' : 'Save'}</button>
      </div>
    </div>
  `;
  card.querySelector('.favorite-btn').addEventListener('click', () => toggleFavorite(cafe.id));
  return card;
}

function renderCafes() {
  const filteredCafes = getFilteredCafes();
  cafeGrid.innerHTML = '';

  if (!filteredCafes.length) {
    cafeGrid.innerHTML = '<p class="empty-state">No cafes found. Try another language, tag, or location.</p>';
  } else {
    filteredCafes.forEach(cafe => cafeGrid.appendChild(renderCafeCard(cafe)));
  }

  renderMapMarkers(filteredCafes);
}

function bindEvents() {
  document.getElementById('leftArrow').addEventListener('click', () => {
    currentLangIndex = (currentLangIndex - 1 + supportedLanguages.length) % supportedLanguages.length;
    renderLanguageCarousel();
    renderCafes();
  });

  document.getElementById('rightArrow').addEventListener('click', () => {
    currentLangIndex = (currentLangIndex + 1) % supportedLanguages.length;
    renderLanguageCarousel();
    renderCafes();
  });

  [searchInput, tagFilter, priceFilter, locationFilter].forEach(control => {
    control.addEventListener('input', () => {
      renderCafes();
      trackDiscoverySearch();
    });
    control.addEventListener('change', () => {
      renderCafes();
      trackDiscoverySearch();
    });
  });

  phrasePracticeBtn?.addEventListener('click', () => {
    phrasePracticeBtn.textContent = 'Practice saved';
    setTimeout(() => {
      phrasePracticeBtn.textContent = 'Tap to practice';
    }, 1400);
  });
}

async function init() {
  renderLanguageCarousel();
  cafeGrid.innerHTML = '<p class="empty-state">Loading cafes...</p>';
  mapMarkers.innerHTML = '<p class="empty-state">Loading map markers...</p>';
  cafes = await getAllCafes();
  buildTagOptions();
  bindEvents();
  renderCafes();
}

init();

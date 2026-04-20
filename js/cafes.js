import { db } from './firebase-init.js';
import { supportedLanguages, getStoredLanguage, setStoredLanguage } from './i18n.js';
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
      currentLanguage = language.code;
      setStoredLanguage(currentLanguage);
      renderLanguageCarousel();
      renderCafes();
    });
    flagTrack.appendChild(wrapper);
  }

  currentLanguage = supportedLanguages[currentLangIndex].code;
  setStoredLanguage(currentLanguage);
}

function buildTagOptions() {
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
  const next = favorites.includes(cafeId)
    ? favorites.filter(id => id !== cafeId)
    : [...favorites, cafeId];
  saveFavorites(next);
  renderCafes();
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
    mapMarkers.innerHTML = '<p>No cafes match these filters.</p>';
    return;
  }

  filteredCafes.forEach((cafe, index) => {
    const translated = translateCafe(cafe);
    const marker = document.createElement('a');
    marker.href = `cafe.html?id=${encodeURIComponent(cafe.id)}`;
    marker.className = 'marker-item';
    marker.innerHTML = `
      <span>${index + 1}. ${translated.name}</span>
      <small>${cafe.address}</small>
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
      <img src="${cafe.imageUrl}" alt="${translated.name}">
    </a>
    <div class="cafe-card-body">
      <h3>${translated.name}</h3>
      <p>${translated.description || cafe.address}</p>
      <div class="tag-row">
        ${(cafe.tags || []).map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
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
    cafeGrid.innerHTML = '<p>No cafes found. Try another language, tag, or location.</p>';
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
    control.addEventListener('input', renderCafes);
    control.addEventListener('change', renderCafes);
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
  cafes = await getAllCafes();
  buildTagOptions();
  bindEvents();
  renderCafes();
}

init();

import { db } from './firebase-init.js';
import {
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const cafesContainer = document.getElementById('cafesContainer');
const languageSelector = document.getElementById('languageSelector');
let currentLanguage = 'en';

languageSelector.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  renderCafeList();
});

async function getAllCafes() {
  const cafesRef = collection(db, 'cafes');
  const snapshot = await getDocs(cafesRef);
  const cafes = [];
  snapshot.forEach(doc => {
    cafes.push({ id: doc.id, ...doc.data() });
  });
  return cafes;
}

function createCafeCard(cafe) {
  const name = cafe.translations?.[currentLanguage]?.name || cafe.name;
  const description = cafe.translations?.[currentLanguage]?.description || '';
  const tags = cafe.tags || [];
  const image = cafe.photos?.[0] || '';

  const card = document.createElement('div');
  card.className = 'bg-white rounded shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer';
  card.innerHTML = `
    <a href="cafe.html?id=${cafe.id}">
      ${image ? `<img src="${image}" alt="${name}" class="w-full h-40 object-cover">` : ''}
      <div class="p-4">
        <h3 class="text-xl font-semibold mb-1">${name}</h3>
        <p class="text-sm text-gray-600 mb-2">${description}</p>
        <div class="flex flex-wrap gap-1">
          ${tags.map(tag => `<span class="text-xs bg-gray-200 px-2 py-1 rounded">${tag}</span>`).join('')}
        </div>
      </div>
    </a>
  `;
  return card;
}

async function renderCafeList() {
  cafesContainer.innerHTML = '';
  const cafes = await getAllCafes();

  cafes.forEach(cafe => {
    const card = createCafeCard(cafe);
    cafesContainer.appendChild(card);
  });

  console.log(`[renderCafeList] Loaded ${cafes.length} cafes`);
}

renderCafeList();

import { db } from './firebase-init.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const languageSelector = document.getElementById('languageSelector');
let currentLanguage = 'en';

languageSelector.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  renderCircle();
});

const params = new URLSearchParams(window.location.search);
const circleId = params.get('id');

async function getCircleData(id) {
  const ref = doc(db, 'cafeCircles', id);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

async function renderCircle() {
  const data = await getCircleData(circleId);
  if (!data) {
    document.getElementById('circleInfo').innerHTML = '<p>Circle not found.</p>';
    return;
  }

  const title = data.translations?.[currentLanguage]?.title || data.title || 'Untitled';
  const description = data.translations?.[currentLanguage]?.description || data.description || '';
  const image = data.image || '';
  const rsvpCount = data.rsvpCount || 0;
  const cost = data.cost || 'Free';
  const budget = data.budget || {};
  const date = new Date(data.date?.seconds * 1000).toLocaleDateString();
  const time = data.time || '';

  const budgetHTML = `
    <div class="mt-3">
      <h4 class="font-semibold">📊 Budget Breakdown</h4>
      <ul class="list-disc list-inside text-sm">
        ${budget.gifts ? `<li>🎁 Gifts: ${budget.gifts} сом</li>` : ''}
        ${budget.food ? `<li>🍽️ Food: ${budget.food} сом</li>` : ''}
        ${budget.salary ? `<li>💰 Host Salary: ${budget.salary} сом</li>` : ''}
      </ul>
    </div>
  `;

  document.getElementById('circleInfo').innerHTML = `
    ${image ? `<img src="${image}" alt="${title}" class="w-full h-56 object-cover rounded mb-4">` : ''}
    <h2 class="text-2xl font-bold text-green-800 mb-2">${title}</h2>
    <p class="mb-3">${description}</p>
    <div class="flex gap-4 text-sm text-gray-700 mb-2">
      <span>📅 ${date}</span>
      <span>⏰ ${time}</span>
      <span>👥 ${rsvpCount} attending</span>
    </div>
    <div class="text-green-800 font-semibold text-lg mb-2">💸 ${cost}</div>
    ${budgetHTML}
    <button class="mt-4 bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 transition">Join This Circle</button>
  `;

  console.log(`[renderCircle] Loaded circle: ${title}`);
}

renderCircle();

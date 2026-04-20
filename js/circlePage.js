import { db } from './firebase-init.js';
import { supportedLanguages, getStoredLanguage, setStoredLanguage } from './i18n.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const languageSelector = document.getElementById('languageSelector');
let currentLanguage = getStoredLanguage();

languageSelector.innerHTML = supportedLanguages.map(language => `
  <option value="${language.code}" ${language.code === currentLanguage ? 'selected' : ''}>
    ${language.label} - ${language.name}
  </option>
`).join('');

languageSelector.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  setStoredLanguage(currentLanguage);
  renderCircle();
});

const params = new URLSearchParams(window.location.search);
const circleId = params.get('id');

async function getCircleData(id) {
  try {
    const ref = doc(db, 'cafeCircles', id);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.warn('[circlePage] Firestore unavailable.', error);
    if (id === 'intro-to-motherhood') {
      return {
        id,
        title: 'Intro to Motherhood',
        description: 'A warm Circle with shared food, small gifts, and guided conversation.',
        image: 'assets/circles/intro_to_motherhood.png',
        date: { seconds: Math.floor(Date.now() / 1000) + 604800 },
        time: '16:00',
        rsvpCount: 8,
        cost: '600 som',
        budget: { gifts: 1000, food: 2500, salary: 1500, total: 5000 },
        rsvp: [{ name: 'Aida', status: 'confirmed' }, { name: 'Guzya', status: 'host' }]
      };
    }
    return null;
  }
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
  const date = data.date?.seconds ? new Date(data.date.seconds * 1000).toLocaleDateString() : 'Date soon';
  const time = data.time || '';
  const rsvps = data.rsvp || [];

  const budgetHTML = `
    <div class="mt-3">
      <h4 class="font-semibold">📊 Budget Breakdown</h4>
      <ul class="list-disc list-inside text-sm">
        ${budget.total ? `<li>Total: ${budget.total} сом</li>` : ''}
        ${budget.gifts ? `<li>🎁 Gifts: ${budget.gifts} сом</li>` : ''}
        ${budget.food ? `<li>🍽️ Food: ${budget.food} сом</li>` : ''}
        ${budget.salary ? `<li>💰 Host Salary: ${budget.salary} сом</li>` : ''}
      </ul>
    </div>
  `;

  const rsvpHTML = `
    <div class="mt-4">
      <h4 class="font-semibold">RSVP list</h4>
      <div class="grid gap-2 mt-2">
        ${rsvps.length ? rsvps.map(person => `
          <div class="bg-green-50 rounded p-2 flex justify-between">
            <span>${person.name || person.userId || 'Guest'}</span>
            <span>${person.status || 'confirmed'}</span>
          </div>
        `).join('') : '<p class="text-sm text-gray-600">No RSVP names yet.</p>'}
      </div>
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
    ${rsvpHTML}
    <div class="flex flex-wrap gap-3 mt-4">
      <button id="joinCircleBtn" class="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 transition">Join This Circle</button>
      <a href="create-circle.html" class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition">Edit Circle</a>
    </div>
  `;

  document.getElementById('joinCircleBtn').addEventListener('click', event => {
    event.currentTarget.textContent = 'RSVP saved';
  });

  console.log(`[renderCircle] Loaded circle: ${title}`);
}

renderCircle();

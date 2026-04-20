import {
  collection,
  getDocs,
  doc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { renderMenuEditor } from './adminMenuEditor.js';

import { db } from '../js/firebase-init.js';

let panelContainer = null;

export async function renderCafesPanel(container) {
  panelContainer = container;
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">🏪 Manage Cafes</h2>

    <div class="mb-4 flex flex-wrap gap-3">
      <input id="cafeSearch" type="text" placeholder="Search cafes or owners..." class="border px-3 py-2 rounded w-72">
    </div>

    <div id="cafeList" class="space-y-4 overflow-x-auto"></div>
  `;

  const cafes = await loadCafes();
  renderCafeList(cafes);

  document.getElementById('cafeSearch').addEventListener('input', () => {
    const search = document.getElementById('cafeSearch').value.toLowerCase();
    const filtered = cafes.filter(cafe =>
      `${cafe.name || ''} ${cafe.ownerId || ''} ${(cafe.extraAdmins || []).join(' ')}`.toLowerCase().includes(search)
    );
    renderCafeList(filtered);
  });
}

async function loadCafes() {
  const snapshot = await getDocs(collection(db, 'cafes'));
  const cafes = [];
  snapshot.forEach(doc => {
    cafes.push({ id: doc.id, ...doc.data() });
  });
  return cafes;
}

function renderCafeList(cafes) {
  const container = document.getElementById('cafeList');
  container.innerHTML = '';

  cafes.forEach(cafe => {
    const div = document.createElement('div');
    div.className = 'bg-white rounded shadow p-4';

    div.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 class="text-xl font-semibold">${cafe.name}</h3>
          <p class="text-sm text-gray-600">Owner: ${cafe.ownerId || 'N/A'}</p>
        </div>
        <button class="text-sm underline text-blue-600 menu-btn">🍽️ Open full menu view</button>
      </div>

      <div class="grid md:grid-cols-2 gap-3 mb-3">
        <label class="block text-sm">Current owner
          <input type="text" value="${cafe.ownerId || ''}" class="owner-input border px-2 py-1 rounded w-full mt-1">
        </label>
        <label class="block text-sm">Extra admin accounts
          <input type="text" value="${(cafe.extraAdmins || []).join(', ')}" class="extra-admins-input border px-2 py-1 rounded w-full mt-1" placeholder="uid1, uid2">
        </label>
      </div>

      <details class="mb-2">
        <summary class="cursor-pointer font-medium">💎 Premium Features</summary>
        <div class="ml-4 mt-2 grid gap-3">
          ${renderPremiumFeatureToggle('Games', cafe.premiumGamesEnabled, cafe.premiumGamesUntil, cafe.premiumGamesNote)}
          ${renderPremiumFeatureToggle('Russian Lessons', cafe.premiumLessonsEnabled, cafe.premiumLessonsUntil, cafe.premiumLessonsNote)}
          ${renderPremiumFeatureToggle('Premium Analytics', cafe.premiumAnalyticsEnabled, cafe.premiumAnalyticsUntil, cafe.premiumAnalyticsNote)}
        </div>
      </details>

      <button class="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 save-btn">💾 Save</button>
    `;

    const saveBtn = div.querySelector('.save-btn');
    saveBtn.addEventListener('click', async () => {
      const newOwnerId = div.querySelector('.owner-input').value.trim();
      const extraAdmins = div.querySelector('.extra-admins-input').value.split(',').map(item => item.trim()).filter(Boolean);
      const updated = {
        ownerId: newOwnerId,
        extraAdmins,
        premiumGamesEnabled: getEnabledFromField(div, 'Games'),
        premiumGamesUntil: getDateFromField(div, 'Games'),
        premiumGamesNote: getNoteFromField(div, 'Games'),
        premiumLessonsEnabled: getEnabledFromField(div, 'Russian Lessons'),
        premiumLessonsUntil: getDateFromField(div, 'Russian Lessons'),
        premiumLessonsNote: getNoteFromField(div, 'Russian Lessons'),
        premiumAnalyticsEnabled: getEnabledFromField(div, 'Premium Analytics'),
        premiumAnalyticsUntil: getDateFromField(div, 'Premium Analytics'),
        premiumAnalyticsNote: getNoteFromField(div, 'Premium Analytics')
      };
      await updateDoc(doc(db, 'cafes', cafe.id), updated);
      console.log(`Updated cafe ${cafe.name}`);
    });

    const menuBtn = div.querySelector('.menu-btn');
    menuBtn.addEventListener('click', () => {
      panelContainer.innerHTML = ''; // Clear main panel
      renderMenuEditor(cafe.id, panelContainer);
    });

    container.appendChild(div);
  });
}

function renderPremiumFeatureToggle(label, enabled, expirationDate, note) {
  const dateStr = getDateInputValue(expirationDate);
  return `
    <div class="border rounded p-3 bg-gray-50">
      <label class="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" data-feature-enabled="${label}" ${enabled ? 'checked' : ''}>
        ${label} active
      </label>
      <div class="grid md:grid-cols-2 gap-2 mt-2">
        <label class="text-sm">Expiration date
          <input type="date" data-feature="${label}" value="${dateStr}" class="border px-2 py-1 rounded w-full mt-1">
        </label>
        <label class="text-sm">Reason note
          <input type="text" data-feature-note="${label}" value="${note || ''}" class="border px-2 py-1 rounded w-full mt-1" placeholder="refund, promo, manual override">
        </label>
      </div>
    </div>
  `;
}

function getDateFromField(parent, label) {
  const input = parent.querySelector(`input[data-feature="${label}"]`);
  return input && input.value ? new Date(input.value) : null;
}

function getDateInputValue(value) {
  if (!value) return '';
  const date = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
}

function getEnabledFromField(parent, label) {
  return !!parent.querySelector(`input[data-feature-enabled="${label}"]`)?.checked;
}

function getNoteFromField(parent, label) {
  return parent.querySelector(`input[data-feature-note="${label}"]`)?.value.trim() || '';
}

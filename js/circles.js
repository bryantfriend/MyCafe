import { db } from './firebase-init.js';
import {
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const circlesContainer = document.getElementById('circlesContainer');
const languageSelector = document.getElementById('languageSelector');
let currentLanguage = 'en';

languageSelector.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  renderCircles();
});

async function getAllCircles() {
  const circlesRef = collection(db, 'cafeCircles');
  const snapshot = await getDocs(circlesRef);
  const circles = [];
  snapshot.forEach(doc => {
    circles.push({ id: doc.id, ...doc.data() });
  });
  return circles;
}

function createCircleCard(circle) {
  const title = circle.translations?.[currentLanguage]?.title || circle.title || 'Untitled';
  const description = circle.translations?.[currentLanguage]?.description || circle.description || '';
  const image = circle.image || '';
  const date = new Date(circle.date?.seconds * 1000).toLocaleDateString();
  const time = circle.time || '';
  const rsvpCount = circle.rsvpCount || 0;
  const cost = circle.cost || 'Free';

  const card = document.createElement('div');
  card.className = 'bg-cream rounded-xl shadow p-4 border border-green-700';
  card.innerHTML = `
    <img src="${image}" alt="${title}" class="w-full h-48 object-cover rounded mb-4">
    <h3 class="text-2xl font-bold text-green-800 mb-1">${title}</h3>
    <p class="text-sm text-gray-700 mb-2">${description}</p>
    <div class="flex justify-between text-sm text-gray-600 mb-2">
      <span>📅 ${date}</span>
      <span>⏰ ${time}</span>
      <span>👥 ${rsvpCount} attending</span>
    </div>
    <div class="text-green-800 font-semibold mb-4">💸 ${cost}</div>
    <div class="flex gap-3">
      <a href="circle.html?id=${circle.id}" class="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 transition">View Circle</a>
      <button class="bg-white border border-green-700 text-green-700 px-3 py-1 rounded hover:bg-green-50 transition">Join</button>
    </div>
  `;
  return card;
}

async function renderCircles() {
  circlesContainer.innerHTML = '';
  const circles = await getAllCircles();

  const upcomingCircles = circles.filter(c => {
    const eventTime = c.date?.seconds * 1000;
    return eventTime && eventTime > Date.now();
  });

  upcomingCircles.sort((a, b) => a.date.seconds - b.date.seconds);

  upcomingCircles.forEach(circle => {
    const card = createCircleCard(circle);
    circlesContainer.appendChild(card);
  });

  console.log(`[renderCircles] Loaded ${upcomingCircles.length} upcoming circles`);
}

renderCircles();

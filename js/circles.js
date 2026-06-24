import { db } from './firebase-init.js';
import { supportedLanguages, getStoredLanguage, setStoredLanguage } from './i18n.js';
import {
  defaultTemplates,
  getRevenueSummary,
  getSeatSummary,
  getTemplate,
  getTicketPrice,
  getRecurringLabel
} from '../packages/domain/circles/circleMarketplace.js';
import { escapeHtml, formatDateTime } from '../packages/ui/renderHelpers.js';
import {
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const circlesContainer = document.getElementById('circlesContainer');
const languageSelector = document.getElementById('languageSelector');
const templateFilter = document.getElementById('templateFilter');
const priceFilter = document.getElementById('priceFilter');
const marketplaceCount = document.getElementById('marketplaceCount');
const marketplaceSeats = document.getElementById('marketplaceSeats');
const marketplacePartners = document.getElementById('marketplacePartners');
let currentLanguage = getStoredLanguage();
let allCircles = [];

languageSelector.addEventListener('change', (e) => {
  currentLanguage = setStoredLanguage(e.target.value);
  renderCircles();
});

languageSelector.innerHTML = supportedLanguages.map(language => `
  <option value="${language.code}" ${language.code === currentLanguage ? 'selected' : ''}>
    ${language.label} - ${language.name}
  </option>
`).join('');

templateFilter.innerHTML = `
  <option value="">All templates</option>
  ${defaultTemplates.map(template => `<option value="${template.id}">${template.name}</option>`).join('')}
`;

const fallbackCircles = [
  {
    id: 'intro-to-motherhood',
    title: 'Intro to Motherhood',
    description: 'A warm Circle with shared food, small gifts, and guided conversation.',
    image: 'assets/circles/intro_to_motherhood.png',
    date: { seconds: Math.floor(Date.now() / 1000) + 604800 },
    time: '16:00',
    rsvpCount: 8,
    pricePerSeat: 600,
    capacity: 14,
    templateId: 'family-circle',
    cafePartner: { name: 'Mano Cafe', sharePercent: 18, status: 'confirmed' },
    recurrence: { enabled: true, cadence: 'weekly', count: 4 },
    postEvent: {
      photos: ['assets/circles/intro_to_motherhood.png'],
      reviews: [{ name: 'Aida', rating: 5, text: 'Warm table, good food, and a thoughtful host.' }]
    },
    status: 'upcoming',
    budget: { gifts: 1000, food: 2500, salary: 1500, total: 5000, marketing: 300 }
  }
];

function getLocalRsvpIds() {
  try {
    return JSON.parse(localStorage.getItem('mycafe:circle-rsvps') || '[]');
  } catch {
    return [];
  }
}

function saveLocalRsvp(circleId) {
  const rsvps = new Set(getLocalRsvpIds());
  rsvps.add(circleId);
  localStorage.setItem('mycafe:circle-rsvps', JSON.stringify([...rsvps]));
}

async function getAllCircles() {
  try {
    const circlesRef = collection(db, 'cafeCircles');
    const snapshot = await getDocs(circlesRef);
    const circles = [];
    snapshot.forEach(doc => {
      circles.push({ id: doc.id, ...doc.data() });
    });
    return circles.length ? circles : fallbackCircles;
  } catch (error) {
    console.warn('[circles] Firestore unavailable, using local Circle data.', error);
    return fallbackCircles;
  }
}

function createCircleCard(circle) {
  const title = circle.translations?.[currentLanguage]?.title || circle.title || 'Untitled';
  const description = circle.translations?.[currentLanguage]?.description || circle.description || '';
  const image = circle.image || '';
  const date = formatDateTime(circle.date, 'Date soon');
  const time = circle.time || '';
  const seatSummary = getSeatSummary(circle);
  const ticketPrice = getTicketPrice(circle);
  const revenue = getRevenueSummary(circle);
  const template = getTemplate(circle);
  const isJoined = getLocalRsvpIds().includes(circle.id);
  const partnerName = circle.cafePartner?.name || circle.partnerCafeName || 'Cafe partner pending';

  const card = document.createElement('div');
  card.className = 'circle-market-card';
  card.innerHTML = `
    ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" class="w-full h-48 object-cover rounded mb-4">` : ''}
    <div class="circle-market-body">
      <div class="circle-card-topline">
        <span>${escapeHtml(template.name)}</span>
        <span>${escapeHtml(circle.status || 'upcoming')}</span>
      </div>
      <h3 class="text-2xl font-bold text-green-800 mb-1">${escapeHtml(title)}</h3>
      <p class="text-sm text-gray-700 mb-2">${escapeHtml(description)}</p>
      <div class="circle-facts">
        <span>${escapeHtml(date)}</span>
        <span>${escapeHtml(time)}</span>
        <span>${seatSummary.attending}/${seatSummary.capacity || '∞'} seats</span>
      </div>
      <div class="circle-facts">
        <span>${escapeHtml(partnerName)}</span>
        <span>${escapeHtml(getRecurringLabel(circle))}</span>
      </div>
      <div class="circle-price-row">
        <strong>${ticketPrice ? `${ticketPrice} som / seat` : 'Free RSVP'}</strong>
        <small>${seatSummary.seatsLeft === null ? 'Open capacity' : `${seatSummary.seatsLeft} seats left`}</small>
      </div>
      <div class="circle-payout-row">
        <span>Est. host payout</span>
        <strong>${revenue.estimatedPayout} som</strong>
      </div>
      <div class="flex gap-3 mt-4">
        <a href="circle.html?id=${circle.id}" class="primary-link">View Circle</a>
        <button class="join-circle secondary-link" type="button" ${seatSummary.soldOut ? 'disabled' : ''}>${isJoined ? 'RSVP saved' : seatSummary.soldOut ? 'Sold out' : 'Quick RSVP'}</button>
      </div>
    </div>
  `;
  card.querySelector('.join-circle').addEventListener('click', () => {
    saveLocalRsvp(circle.id);
    card.querySelector('.join-circle').textContent = 'RSVP saved';
  });
  return card;
}

function getFilteredCircles(circles) {
  const template = templateFilter.value;
  const price = priceFilter.value;
  return circles.filter(circle => {
    const ticketPrice = getTicketPrice(circle);
    const matchesTemplate = !template || getTemplate(circle).id === template;
    const matchesPrice = !price || (price === 'free' ? ticketPrice === 0 : ticketPrice > 0);
    return matchesTemplate && matchesPrice;
  });
}

function renderMarketplaceStats(circles) {
  const partnerNames = new Set(circles.map(circle => circle.cafePartner?.name || circle.partnerCafeName).filter(Boolean));
  const seatsLeft = circles.reduce((total, circle) => {
    const summary = getSeatSummary(circle);
    return total + (summary.seatsLeft ?? 0);
  }, 0);
  marketplaceCount.textContent = String(circles.length);
  marketplaceSeats.textContent = String(seatsLeft);
  marketplacePartners.textContent = String(partnerNames.size);
}

async function renderCircles() {
  circlesContainer.innerHTML = '';
  if (!allCircles.length) {
    allCircles = await getAllCircles();
  }

  const upcomingCircles = allCircles.filter(c => {
    const eventTime = c.date?.seconds * 1000;
    return eventTime && eventTime > Date.now();
  });

  upcomingCircles.sort((a, b) => a.date.seconds - b.date.seconds);
  const filteredCircles = getFilteredCircles(upcomingCircles);
  renderMarketplaceStats(filteredCircles);

  filteredCircles.forEach(circle => {
    const card = createCircleCard(circle);
    circlesContainer.appendChild(card);
  });

  if (!filteredCircles.length) {
    circlesContainer.innerHTML = '<p class="empty-state">No upcoming Cafe Circles yet.</p>';
  }

  console.log(`[renderCircles] Loaded ${filteredCircles.length} upcoming circles`);
}

templateFilter.addEventListener('change', renderCircles);
priceFilter.addEventListener('change', renderCircles);
renderCircles();

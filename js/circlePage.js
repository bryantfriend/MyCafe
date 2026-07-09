import { db } from './firebase-init.js';
import { supportedLanguages, getStoredLanguage, setStoredLanguage } from './i18n.js';
import {
  buildLocalRsvp,
  getBudget,
  getPostEventProof,
  getRecurringLabel,
  getRevenueSummary,
  getSeatSummary,
  getTemplate,
  getTicketPrice
} from '../packages/domain/circles/circleMarketplace.js';
import { recordAnalyticsEvent } from '../packages/domain/analytics/growthAnalytics.js';
import { runIntentPipeline } from '../packages/icf/pipeline/runIntentPipeline.js';
import { escapeHtml, formatDateTime } from '../packages/ui/renderHelpers.js';
import {
  doc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const languageSelector = document.getElementById('languageSelector');
const circleInfo = document.getElementById('circleInfo');
const params = new URLSearchParams(window.location.search);
const circleId = params.get('id');

let currentLanguage = getStoredLanguage();
let currentCircle = null;

languageSelector.innerHTML = supportedLanguages.map(language => `
  <option value="${language.code}" ${language.code === currentLanguage ? 'selected' : ''}>
    ${language.label} - ${language.name}
  </option>
`).join('');

languageSelector.addEventListener('change', (event) => {
  currentLanguage = setStoredLanguage(event.target.value);
  renderCircle();
});

function getLocalRsvps(circleIdValue) {
  try {
    return JSON.parse(localStorage.getItem(`mycafe:circle-rsvp:${circleIdValue}`) || '[]');
  } catch {
    return [];
  }
}

function saveLocalRsvp(circleIdValue, rsvp) {
  const rsvps = getLocalRsvps(circleIdValue);
  localStorage.setItem(`mycafe:circle-rsvp:${circleIdValue}`, JSON.stringify([...rsvps, rsvp]));
  const rsvpIds = new Set(JSON.parse(localStorage.getItem('mycafe:circle-rsvps') || '[]'));
  rsvpIds.add(circleIdValue);
  localStorage.setItem('mycafe:circle-rsvps', JSON.stringify([...rsvpIds]));
}

async function getCircleData(id) {
  if (!id) return null;
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
        pricePerSeat: 600,
        capacity: 14,
        templateId: 'family-circle',
        cafePartner: { name: 'Mano Cafe', contact: '@mano', sharePercent: 18, status: 'confirmed' },
        recurrence: { enabled: true, cadence: 'weekly', count: 4 },
        budget: { gifts: 1000, food: 2500, salary: 1500, total: 5000, marketing: 300 },
        payout: { paid: false, amountPaid: 0, method: 'cash after event' },
        rsvp: [
          { name: 'Aida', status: 'confirmed', seats: 1, paid: true },
          { name: 'Guzya', status: 'host', seats: 1, paid: true }
        ],
        postEvent: {
          photos: ['assets/circles/intro_to_motherhood.png'],
          reviews: [{ name: 'Aida', rating: 5, text: 'Warm table, good food, and a thoughtful host.' }],
          summary: 'Guests shared food, small gifts, and conversation prompts.'
        }
      };
    }
    return null;
  }
}

function renderBudget(budget) {
  return `
    <div class="circle-panel">
      <h4>Cost breakdown</h4>
      <ul class="circle-ledger">
        ${budget.total ? `<li>Total budget <strong>${Number(budget.total)} som</strong></li>` : ''}
        ${budget.gifts ? `<li>Gifts <strong>${Number(budget.gifts)} som</strong></li>` : ''}
        ${budget.food ? `<li>Food <strong>${Number(budget.food)} som</strong></li>` : ''}
        ${budget.salary ? `<li>Host salary <strong>${Number(budget.salary)} som</strong></li>` : ''}
        ${budget.marketing ? `<li>Marketing <strong>${Number(budget.marketing)} som</strong></li>` : ''}
        ${budget.venue ? `<li>Venue <strong>${Number(budget.venue)} som</strong></li>` : ''}
      </ul>
    </div>
  `;
}

function renderAttendees(rsvps) {
  return `
    <div class="circle-panel">
      <h4>Attendee list</h4>
      <div class="grid gap-2 mt-2">
        ${rsvps.length ? rsvps.map(person => `
          <div class="circle-attendee-row">
            <span>${escapeHtml(person.name || person.userId || 'Guest')}</span>
            <span>${escapeHtml(person.status || 'confirmed')} · ${Number(person.seats || 1)} seat${Number(person.seats || 1) === 1 ? '' : 's'}${person.paid ? ' · paid' : ''}</span>
          </div>
        `).join('') : '<p class="empty-state">No RSVP names yet.</p>'}
      </div>
    </div>
  `;
}

function renderPostEventProof(proof, title) {
  return `
    <div class="circle-panel">
      <h4>Post-event proof</h4>
      ${proof.summary ? `<p>${escapeHtml(proof.summary)}</p>` : '<p>Photos and reviews appear here after the event.</p>'}
      <div class="circle-photo-row">
        ${proof.photos.map(photo => `<img src="${escapeHtml(photo)}" alt="${escapeHtml(title)} event photo">`).join('')}
      </div>
      <div class="grid gap-2 mt-3">
        ${proof.reviews.map(review => `
          <div class="circle-attendee-row">
            <span>${escapeHtml(review.name || 'Guest')} · ${Number(review.rating || 5)} stars</span>
            <span>${escapeHtml(review.text || '')}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function handleRsvpSubmit(event) {
  event.preventDefault();
  if (!currentCircle) return;

  const status = document.getElementById('rsvpStatus');
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  const rsvp = buildLocalRsvp(currentCircle.id, {
    name: document.getElementById('rsvpName').value.trim(),
    email: document.getElementById('rsvpEmail').value.trim(),
    seats: document.getElementById('rsvpSeats').value
  });

  submitButton.disabled = true;
  status.textContent = 'Saving RSVP...';
  recordAnalyticsEvent(db, 'circle-rsvp', {
    cafeId: currentCircle.cafeId || currentCircle.cafePartner?.cafeId || '',
    cafeName: currentCircle.cafePartner?.name || currentCircle.partnerCafeName || '',
    circleId: currentCircle.id,
    seats: Number(rsvp.seats || 1),
    source: 'circle-detail',
    metadata: {
      title: currentCircle.title || '',
      paid: Boolean(rsvp.paid)
    }
  });

  try {
    const rsvpResult = await runIntentPipeline('CircleRsvpIntent', {
      circleId: currentCircle.id,
      rsvp
    });
    if (!rsvpResult.ok) {
      throw new Error(rsvpResult.message || 'RSVP could not be synced.');
    }
    status.textContent = rsvpResult.message || 'RSVP saved and synced.';
  } catch (error) {
    saveLocalRsvp(currentCircle.id, rsvp);
    console.warn('[circlePage] RSVP saved locally only.', error);
    status.textContent = 'RSVP saved on this device. Log in later to sync.';
  }

  await renderCircle();
}

async function renderCircle() {
  const data = await getCircleData(circleId);
  if (!data) {
    circleInfo.innerHTML = '<p>Circle not found.</p>';
    return;
  }

  currentCircle = data;
  const localRsvps = getLocalRsvps(data.id);
  const circleWithLocal = { ...data, rsvp: [...(data.rsvp || []), ...localRsvps] };
  const title = circleWithLocal.translations?.[currentLanguage]?.title || circleWithLocal.title || 'Untitled';
  const description = circleWithLocal.translations?.[currentLanguage]?.description || circleWithLocal.description || '';
  const image = circleWithLocal.image || '';
  const budget = getBudget(circleWithLocal);
  const revenue = getRevenueSummary(circleWithLocal);
  const seatSummary = getSeatSummary(circleWithLocal);
  const ticketPrice = getTicketPrice(circleWithLocal);
  const template = getTemplate(circleWithLocal);
  const proof = getPostEventProof(circleWithLocal);
  const partner = circleWithLocal.cafePartner || {};
  const date = formatDateTime(circleWithLocal.date, 'Date soon');
  const time = circleWithLocal.time || '';
  const rsvps = circleWithLocal.rsvp || [];

  circleInfo.innerHTML = `
    <section class="circle-detail-layout">
      <article class="circle-main-panel">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" class="w-full h-72 object-cover rounded mb-4">` : ''}
        <p class="eyebrow">${escapeHtml(template.name)} · ${escapeHtml(getRecurringLabel(circleWithLocal))}</p>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(description)}</p>
        <div class="circle-facts">
          <span>${escapeHtml(date)}</span>
          <span>${escapeHtml(time)}</span>
          <span>${seatSummary.attending}/${seatSummary.capacity || 'open'} seats</span>
          <span>${ticketPrice ? `${ticketPrice} som / seat` : 'Free RSVP'}</span>
        </div>
      </article>

      <aside class="circle-panel">
        <h4>Reserve seats</h4>
        <form id="circleRsvpForm" class="grid gap-3">
          <label><span>Name</span><input id="rsvpName" type="text" required placeholder="Guest name"></label>
          <label><span>Email</span><input id="rsvpEmail" type="email" placeholder="guest@example.com"></label>
          <label><span>Seats</span><input id="rsvpSeats" type="number" min="1" max="${seatSummary.seatsLeft || 12}" value="1"></label>
          <button class="primary-link" type="submit" ${seatSummary.soldOut ? 'disabled' : ''}>${seatSummary.soldOut ? 'Sold out' : 'RSVP now'}</button>
          <p id="rsvpStatus" class="text-sm text-gray-600">${seatSummary.seatsLeft === null ? 'Open capacity.' : `${seatSummary.seatsLeft} seats left.`}</p>
        </form>
      </aside>
    </section>

    <section class="circle-detail-grid">
      ${renderBudget(budget)}
      <div class="circle-panel">
        <h4>Payout tracking</h4>
        <ul class="circle-ledger">
          <li>Gross revenue <strong>${revenue.grossRevenue} som</strong></li>
          <li>Cafe partner share <strong>${revenue.partnerShare} som</strong></li>
          <li>Platform fee <strong>${revenue.platformFee} som</strong></li>
          <li>Estimated host payout <strong>${revenue.estimatedPayout} som</strong></li>
          <li>Paid out <strong>${revenue.paidOut} som · ${escapeHtml(revenue.payoutStatus)}</strong></li>
        </ul>
      </div>
      <div class="circle-panel">
        <h4>Cafe partnership</h4>
        <p><strong>${escapeHtml(partner.name || circleWithLocal.partnerCafeName || 'Partner cafe pending')}</strong></p>
        <p>${escapeHtml(partner.contact || partner.status || 'Host can confirm venue terms.')}</p>
        <p>${Number(partner.sharePercent || circleWithLocal.partnerSharePercent || 0)}% venue share</p>
      </div>
      <div class="circle-panel">
        <h4>Host tools</h4>
        <p>Template: ${escapeHtml(template.description)}</p>
        <p>Recurring plan: ${escapeHtml(getRecurringLabel(circleWithLocal))}</p>
        <a href="create-circle.html" class="secondary-link mt-3">Open host console</a>
      </div>
      ${renderAttendees(rsvps)}
      ${renderPostEventProof(proof, title)}
    </section>
  `;

  document.getElementById('circleRsvpForm').addEventListener('submit', handleRsvpSubmit);
  console.log(`[renderCircle] Loaded circle: ${title}`);
}

renderCircle();

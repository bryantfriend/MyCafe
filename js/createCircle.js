import { auth, db } from './firebase-init.js';
import {
  defaultTemplates,
  getRevenueSummary,
  getSeatSummary
} from '../packages/domain/circles/circleMarketplace.js';
import { escapeHtml, formatDateTime, setStatus } from '../packages/ui/renderHelpers.js';
import { runIntentPipeline } from '../packages/icf/pipeline/runIntentPipeline.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const circleForm = document.getElementById('circleForm');
const circleStatus = document.getElementById('circleStatus');
const hostCircleList = document.getElementById('hostCircleList');
const upcomingCount = document.getElementById('upcomingCount');
const attendeeCount = document.getElementById('attendeeCount');
const payoutTotal = document.getElementById('payoutTotal');
const templateId = document.getElementById('templateId');

let currentUser = null;

templateId.innerHTML = defaultTemplates.map(template => `
  <option value="${template.id}">${template.name}</option>
`).join('');

function getNumber(id) {
  return Number(document.getElementById(id).value || 0);
}

function buildCirclePayload() {
  const date = document.getElementById('eventDate').value;
  const time = document.getElementById('eventTime').value;
  const eventDate = new Date(`${date}T${time || '00:00'}`);
  if (Number.isNaN(eventDate.getTime())) {
    throw new Error('Choose a valid date and time.');
  }

  const budget = {
    total: getNumber('budgetTotal'),
    gifts: getNumber('budgetGifts'),
    food: getNumber('budgetFood'),
    salary: getNumber('budgetSalary'),
    marketing: getNumber('budgetMarketing'),
    venue: getNumber('budgetVenue')
  };
  const pricePerSeat = getNumber('pricePerSeat');
  const capacity = getNumber('capacity');
  const recurrenceCadence = document.getElementById('recurrenceCadence').value;
  const postEventPhotos = document.getElementById('postEventPhotos').value
    .split(',')
    .map(photo => photo.trim())
    .filter(Boolean);

  return {
    title: document.getElementById('eventName').value.trim(),
    date: Timestamp.fromDate(eventDate),
    time,
    templateId: document.getElementById('templateId').value,
    pricePerSeat,
    capacity,
    budget,
    cost: pricePerSeat ? `${pricePerSeat} som` : 'Free',
    description: document.getElementById('eventDescription').value.trim(),
    image: document.getElementById('eventImage').value.trim(),
    cafePartner: {
      name: document.getElementById('partnerCafeName').value.trim(),
      contact: document.getElementById('partnerContact').value.trim(),
      sharePercent: getNumber('partnerSharePercent'),
      status: document.getElementById('partnerCafeName').value.trim() ? 'pending-confirmation' : 'not-set'
    },
    recurrence: {
      enabled: Boolean(recurrenceCadence),
      cadence: recurrenceCadence,
      count: getNumber('recurrenceCount')
    },
    postEvent: {
      photos: postEventPhotos,
      reviews: [],
      summary: document.getElementById('postEventSummary').value.trim()
    },
    hostId: currentUser?.uid || 'guest-host',
    hostName: currentUser?.displayName || currentUser?.email || 'Circle host',
    rsvp: [],
    rsvpCount: 0,
    status: document.getElementById('eventStatus').value,
    internalNotes: '',
    payout: { paid: false, amountPaid: 0, method: document.getElementById('payoutMethod').value.trim() },
    createdAt: Timestamp.now()
  };
}

function renderHostStats(circles) {
  const upcoming = circles.filter(circle => circle.status !== 'canceled' && (circle.date?.seconds || 0) * 1000 >= Date.now());
  const attendees = upcoming.reduce((total, circle) => total + (circle.rsvpCount || circle.rsvp?.length || 0), 0);
  const payouts = circles.reduce((total, circle) => total + getRevenueSummary(circle).estimatedPayout, 0);

  upcomingCount.textContent = String(upcoming.length);
  attendeeCount.textContent = String(attendees);
  payoutTotal.textContent = `${Math.round(payouts)} som`;
}

function renderHostCircles(circles) {
  if (!circles.length) {
    hostCircleList.innerHTML = '<p class="empty-state">No circles yet.</p>';
    return;
  }

  hostCircleList.innerHTML = circles.map(circle => {
    const date = formatDateTime(circle.date, 'No date');
    const seats = getSeatSummary(circle);
    const revenue = getRevenueSummary(circle);
    return `
      <a class="marker-item" href="circle.html?id=${circle.id}">
        <span>${escapeHtml(circle.title || 'Circle')}</span>
        <small>${escapeHtml(date)} · ${escapeHtml(circle.status || 'upcoming')} · ${seats.attending}/${seats.capacity || 'open'} seats</small>
        <small>${escapeHtml(circle.cafePartner?.name || 'No partner cafe')} · gross ${revenue.grossRevenue} som · payout ${revenue.estimatedPayout} som</small>
      </a>
    `;
  }).join('');
}

async function loadHostCircles() {
  try {
    const circlesRef = collection(db, 'cafeCircles');
    const hostQuery = currentUser
      ? query(circlesRef, where('hostId', '==', currentUser.uid))
      : circlesRef;
    const snapshot = await getDocs(hostQuery);
    const circles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderHostStats(circles);
    renderHostCircles(circles);
  } catch (error) {
    console.warn('[createCircle] Could not load circles.', error);
    renderHostStats([]);
    renderHostCircles([]);
  }
}

circleForm.addEventListener('submit', async event => {
  event.preventDefault();
  const submitButton = circleForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setStatus(circleStatus, 'Creating Circle...', 'info');

  try {
    const payload = buildCirclePayload();
    const circleResult = await runIntentPipeline('CreateCircleIntent', payload);
    if (!circleResult.ok) {
      throw new Error(circleResult.message || 'Circle could not be created right now.');
    }
    const circleId = circleResult.data && circleResult.data.circleId ? circleResult.data.circleId : '';
    setStatus(circleStatus, 'Circle created.', 'success');
    circleForm.reset();
    await loadHostCircles();
    window.location.href = `circle.html?id=${circleId}`;
  } catch (error) {
    console.error('[createCircle] Could not create circle.', error);
    setStatus(circleStatus, error.message || 'Circle could not be created right now.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (!user) {
    setStatus(circleStatus, 'Log in to attach new Circles to your host account. Guest preview is available.', 'info');
  }
  await loadHostCircles();
});

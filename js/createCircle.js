import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  addDoc,
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

let currentUser = null;

function getNumber(id) {
  return Number(document.getElementById(id).value || 0);
}

function buildCirclePayload() {
  const date = document.getElementById('eventDate').value;
  const time = document.getElementById('eventTime').value;
  const eventDate = new Date(`${date}T${time || '00:00'}`);
  const budget = {
    total: getNumber('budgetTotal'),
    gifts: getNumber('budgetGifts'),
    food: getNumber('budgetFood'),
    salary: getNumber('budgetSalary')
  };

  return {
    title: document.getElementById('eventName').value.trim(),
    date: Timestamp.fromDate(eventDate),
    time,
    budget,
    cost: `${budget.total} som`,
    description: document.getElementById('eventDescription').value.trim(),
    image: document.getElementById('eventImage').value.trim(),
    hostId: currentUser?.uid || 'guest-host',
    hostName: currentUser?.displayName || currentUser?.email || 'Circle host',
    rsvp: [],
    rsvpCount: 0,
    status: 'upcoming',
    internalNotes: '',
    payout: { paid: false, amountPaid: 0 },
    createdAt: Timestamp.now()
  };
}

function renderHostStats(circles) {
  const upcoming = circles.filter(circle => circle.status !== 'canceled' && (circle.date?.seconds || 0) * 1000 >= Date.now());
  const attendees = upcoming.reduce((total, circle) => total + (circle.rsvpCount || circle.rsvp?.length || 0), 0);
  const payouts = circles.reduce((total, circle) => total + Number(circle.payout?.amountPaid || 0), 0);

  upcomingCount.textContent = String(upcoming.length);
  attendeeCount.textContent = String(attendees);
  payoutTotal.textContent = `${payouts} som`;
}

function renderHostCircles(circles) {
  if (!circles.length) {
    hostCircleList.innerHTML = '<p>No circles yet.</p>';
    return;
  }

  hostCircleList.innerHTML = circles.map(circle => {
    const date = circle.date?.seconds ? new Date(circle.date.seconds * 1000).toLocaleString() : 'No date';
    return `
      <a class="marker-item" href="circle.html?id=${circle.id}">
        <span>${circle.title || 'Circle'}</span>
        <small>${date} · ${circle.status || 'upcoming'}</small>
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
  circleStatus.textContent = 'Creating Circle...';

  try {
    const payload = buildCirclePayload();
    const docRef = await addDoc(collection(db, 'cafeCircles'), payload);
    circleStatus.textContent = 'Circle created.';
    circleForm.reset();
    await loadHostCircles();
    window.location.href = `circle.html?id=${docRef.id}`;
  } catch (error) {
    console.error('[createCircle] Could not create circle.', error);
    circleStatus.textContent = 'Circle could not be created right now.';
  }
});

onAuthStateChanged(auth, async user => {
  currentUser = user;
  await loadHostCircles();
});

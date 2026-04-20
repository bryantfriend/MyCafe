import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db } from '../js/firebase-init.js';

export async function renderCirclesPanel(container) {
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">🪑 Cafe Circles</h2>

    <div class="mb-4 flex flex-wrap gap-4">
      <input id="eventFilter" type="text" placeholder="Search by event..." class="border px-3 py-2 rounded w-60">
      <input id="hostFilter" type="text" placeholder="Search by host..." class="border px-3 py-2 rounded w-60">
      <input id="dateFilter" type="date" class="border px-3 py-2 rounded">
      <select id="statusFilter" class="border px-3 py-2 rounded">
        <option value="">All Statuses</option>
        <option value="upcoming">Upcoming</option>
        <option value="completed">Completed</option>
        <option value="canceled">Canceled</option>
      </select>
    </div>

    <div id="circleList" class="space-y-4"></div>
  `;

  const circles = await loadAllCircles();
  renderCircleList(circles);

  document.getElementById('eventFilter').addEventListener('input', () => filterAndRender(circles));
  document.getElementById('hostFilter').addEventListener('input', () => filterAndRender(circles));
  document.getElementById('dateFilter').addEventListener('change', () => filterAndRender(circles));
  document.getElementById('statusFilter').addEventListener('change', () => filterAndRender(circles));
}

async function loadAllCircles() {
  const snap = await getDocs(collection(db, 'cafeCircles'));
  const circles = [];
  snap.forEach(doc => {
    circles.push({ id: doc.id, ...doc.data() });
  });
  return circles;
}

function renderCircleList(circles) {
  const container = document.getElementById('circleList');
  container.innerHTML = '';

  circles.forEach(circle => {
    const div = document.createElement('div');
    div.className = 'bg-white p-4 rounded shadow border';

    const date = circle.date ? new Date(circle.date.seconds * 1000).toLocaleString() : 'N/A';

    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-lg font-bold mb-2">${circle.title || 'Unnamed Event'}</h3>
          <p><strong>Host:</strong> ${circle.hostName || circle.hostId}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Status:</strong> ${circle.status}</p>
          <p><strong>Budget total:</strong> ${circle.budget?.total || circle.budget || 0} som</p>
          <p><strong>RSVPs:</strong> ${circle.rsvp?.length || 0}</p>
          <p class="text-sm mt-2 text-gray-700">${circle.description || ''}</p>
          <details class="mt-3 bg-gray-50 rounded p-3">
            <summary class="cursor-pointer font-semibold">Circle detail</summary>
            ${circle.image ? `<img src="${circle.image}" alt="${circle.title || 'Circle'}" class="w-40 rounded mt-3">` : ''}
            <div class="grid md:grid-cols-3 gap-2 mt-3 text-sm">
              <span>Gifts: ${circle.budget?.gifts || 0} som</span>
              <span>Food: ${circle.budget?.food || 0} som</span>
              <span>Host salary: ${circle.budget?.salary || 0} som</span>
            </div>
            <div class="mt-3">
              <strong>RSVP statuses</strong>
              ${(circle.rsvp || []).map(person => `<p>${person.name || person.userId || 'Guest'} · ${person.status || 'confirmed'}</p>`).join('') || '<p>No RSVPs yet.</p>'}
            </div>
            <label class="block mt-3 text-sm">Reassign host
              <input class="host-id-input border px-2 py-1 rounded w-full mt-1" value="${circle.hostId || ''}">
            </label>
            <label class="block mt-3 text-sm">Internal notes
              <textarea class="notes-input border px-2 py-1 rounded w-full mt-1" rows="3">${circle.internalNotes || ''}</textarea>
            </label>
            <div class="grid md:grid-cols-2 gap-2 mt-3">
              <label class="text-sm">Amount paid
                <input class="payout-input border px-2 py-1 rounded w-full mt-1" type="number" value="${circle.payout?.amountPaid || 0}">
              </label>
              <label class="text-sm flex items-end gap-2">
                <input class="paid-input" type="checkbox" ${circle.payout?.paid ? 'checked' : ''}>
                Paid
              </label>
            </div>
            <button class="save-detail-btn bg-blue-600 text-white px-3 py-1 rounded mt-3">Save detail</button>
          </details>
        </div>
        <div class="flex flex-col gap-2 text-right">
          <button class="bg-blue-600 text-white px-3 py-1 rounded edit-btn">✏️ Edit</button>
          <button class="bg-red-600 text-white px-3 py-1 rounded cancel-btn">🛑 Cancel</button>
        </div>
      </div>
    `;

    // ACTION: Cancel
    div.querySelector('.cancel-btn').addEventListener('click', async () => {
      if (confirm('Cancel this event?')) {
        await updateDoc(doc(db, 'cafeCircles', circle.id), {
          status: 'canceled'
        });
        div.remove();
      }
    });

    div.querySelector('.edit-btn').addEventListener('click', () => {
      div.querySelector('details')?.setAttribute('open', 'open');
    });

    div.querySelector('.save-detail-btn').addEventListener('click', async () => {
      await updateDoc(doc(db, 'cafeCircles', circle.id), {
        hostId: div.querySelector('.host-id-input').value.trim(),
        internalNotes: div.querySelector('.notes-input').value.trim(),
        payout: {
          amountPaid: Number(div.querySelector('.payout-input').value || 0),
          paid: div.querySelector('.paid-input').checked
        }
      });
    });

    container.appendChild(div);
  });
}

function filterAndRender(allCircles) {
  const event = document.getElementById('eventFilter').value.toLowerCase();
  const host = document.getElementById('hostFilter').value.toLowerCase();
  const date = document.getElementById('dateFilter').value;
  const status = document.getElementById('statusFilter').value;

  const filtered = allCircles.filter(circle => {
    const matchEvent = !event || (circle.title || '').toLowerCase().includes(event);
    const matchHost = (circle.hostName || '').toLowerCase().includes(host) || (circle.hostId || '').includes(host);
    const circleDate = circle.date?.seconds ? new Date(circle.date.seconds * 1000).toISOString().slice(0, 10) : '';
    const matchDate = !date || circleDate === date;
    const matchStatus = !status || circle.status === status;
    return matchEvent && matchHost && matchDate && matchStatus;
  });

  renderCircleList(filtered);
}

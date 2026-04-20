import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db } from '../js/firebase-init.js';

export async function renderReviewsPanel(container) {
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">📝 Review Moderation</h2>

    <div class="mb-4 flex flex-wrap gap-4">
      <select id="reviewStatusFilter" class="border px-3 py-2 rounded">
        <option value="">All Reviews</option>
        <option value="flagged">Flagged</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
      </select>
      <select id="reviewStarFilter" class="border px-3 py-2 rounded">
        <option value="">Any Rating</option>
        <option value="5">5 stars</option>
        <option value="4">4 stars</option>
        <option value="3">3 stars</option>
        <option value="2">2 stars</option>
        <option value="1">1 star</option>
      </select>
      <input id="reviewCafeFilter" type="text" placeholder="Cafe" class="border px-3 py-2 rounded">
      <input id="reviewLanguageFilter" type="text" placeholder="Language" class="border px-3 py-2 rounded">
      <input id="reviewDateFilter" type="date" class="border px-3 py-2 rounded">
    </div>

    <div id="reviewList" class="space-y-4"></div>
  `;

  const allReviews = await loadAllReviews();
  renderReviewList(allReviews);

  const applyFilters = () => {
    const status = document.getElementById('reviewStatusFilter').value;
    const rating = document.getElementById('reviewStarFilter').value;
    const cafe = document.getElementById('reviewCafeFilter').value.toLowerCase();
    const language = document.getElementById('reviewLanguageFilter').value.toLowerCase();
    const date = document.getElementById('reviewDateFilter').value;
    const filtered = allReviews.filter(r => {
      const statusMatch = !status
        || (status === 'flagged' && r.flagged)
        || (status === 'pending' && !r.approved)
        || (status === 'approved' && r.approved);
      const ratingMatch = !rating || Number(r.rating) === Number(rating);
      const cafeMatch = !cafe || `${r.cafeName || ''} ${r.cafeId || ''}`.toLowerCase().includes(cafe);
      const languageMatch = !language || String(r.language || '').toLowerCase().includes(language);
      const reviewDate = r.createdAt?.toDate?.() || r.timestamp?.toDate?.() || null;
      const dateMatch = !date || (reviewDate && reviewDate.toISOString().startsWith(date));
      return statusMatch && ratingMatch && cafeMatch && languageMatch && dateMatch;
    });
    renderReviewList(filtered);
  };

  ['reviewStatusFilter', 'reviewStarFilter', 'reviewCafeFilter', 'reviewLanguageFilter', 'reviewDateFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', applyFilters);
    document.getElementById(id).addEventListener('change', applyFilters);
  });
}

async function loadAllReviews() {
  const snap = await getDocs(collection(db, 'reviews'));
  const reviews = [];
  snap.forEach(doc => {
    reviews.push({ id: doc.id, ...doc.data() });
  });
  return reviews;
}

function renderReviewList(reviews) {
  const container = document.getElementById('reviewList');
  container.innerHTML = '';

  if (reviews.length === 0) {
    container.innerHTML = `<p class="text-gray-500">No reviews found for this filter.</p>`;
    return;
  }

  reviews.forEach(review => {
    const div = document.createElement('div');
    div.className = 'border bg-white p-4 rounded shadow';

    const snippet = (review.text || '').slice(0, 140);
    div.innerHTML = `
      <div class="flex justify-between items-start gap-4">
        <div>
          <h3 class="font-semibold">${review.username || review.name || review.userId || 'Guest'} · ${review.cafeName || review.cafeId}</h3>
          <p><strong>Rating:</strong> ${review.rating} ⭐ <strong>Language:</strong> ${review.language || 'n/a'}</p>
          <p><strong>Snippet:</strong> ${snippet}</p>
          <p><strong>Status:</strong> ${review.flagged ? 'Flagged' : review.approved ? 'Approved' : 'New / unapproved'}</p>
          ${review.flagged ? `<p class="text-red-600">⚠️ Flagged for moderation</p>` : ''}
          ${review.imageUrl ? `<img src="${review.imageUrl}" alt="review image" class="w-32 mt-2 rounded border">` : ''}
          <details class="mt-3 bg-gray-50 rounded p-3">
            <summary class="cursor-pointer font-semibold">Review detail</summary>
            <p class="mt-2">${review.text || ''}</p>
            <label class="block mt-3 text-sm">Flag reason
              <input class="flag-reason border px-2 py-1 rounded w-full mt-1" value="${review.flagReason || ''}">
            </label>
            <label class="block mt-3 text-sm">Translated versions
              <textarea class="translations-field border px-2 py-1 rounded w-full mt-1" rows="4">${JSON.stringify(review.translations || {}, null, 2)}</textarea>
            </label>
            <div class="flex flex-wrap gap-2 mt-3">
              <button class="save-detail-btn bg-blue-600 text-white px-3 py-1 rounded">Save detail</button>
              <button class="translate-btn bg-yellow-600 text-white px-3 py-1 rounded">Translate All</button>
              ${review.imageUrl ? '<button class="delete-photo-btn bg-red-100 text-red-700 px-3 py-1 rounded">Delete photo</button>' : ''}
            </div>
          </details>
        </div>
        <div class="flex flex-col gap-2">
          <button class="approve-btn bg-green-600 text-white px-3 py-1 rounded">✅ Approve</button>
          <button class="reject-btn bg-yellow-600 text-white px-3 py-1 rounded">Reject</button>
          <button class="delete-btn bg-red-600 text-white px-3 py-1 rounded">🗑️ Delete</button>
        </div>
      </div>
    `;

    div.querySelector('.approve-btn').addEventListener('click', async () => {
      await updateDoc(doc(db, 'reviews', review.id), {
        approved: true,
        flagged: false
      });
      div.remove();
    });

    div.querySelector('.reject-btn').addEventListener('click', async () => {
      await updateDoc(doc(db, 'reviews', review.id), {
        approved: false,
        flagged: true,
        flagReason: div.querySelector('.flag-reason')?.value || 'Rejected by admin'
      });
      div.remove();
    });

    div.querySelector('.save-detail-btn').addEventListener('click', async () => {
      let translations = {};
      try {
        translations = JSON.parse(div.querySelector('.translations-field').value || '{}');
      } catch {
        alert('Translations must be valid JSON.');
        return;
      }
      await updateDoc(doc(db, 'reviews', review.id), {
        flagReason: div.querySelector('.flag-reason').value.trim(),
        translations
      });
    });

    div.querySelector('.translate-btn').addEventListener('click', async () => {
      const translations = review.translations || {};
      ['ru', 'ky', 'en', 'uz', 'tg', 'zh', 'ko', 'ar', 'hi', 'ur', 'bn', 'ug', 'tr'].forEach(lang => {
        translations[lang] = translations[lang] || { text: review.text || '' };
      });
      await updateDoc(doc(db, 'reviews', review.id), { translations });
      div.querySelector('.translations-field').value = JSON.stringify(translations, null, 2);
    });

    div.querySelector('.delete-photo-btn')?.addEventListener('click', async () => {
      await updateDoc(doc(db, 'reviews', review.id), { imageUrl: '' });
      div.querySelector('img')?.remove();
    });

    div.querySelector('.delete-btn').addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this review?')) {
        await deleteDoc(doc(db, 'reviews', review.id));
        div.remove();
      }
    });

    container.appendChild(div);
  });
}

// Called on admin panel load to display emoji alerts in sidebar
export async function checkReviewAlerts() {
  const snap = await getDocs(collection(db, 'reviews'));
  let flaggedCount = 0;
  let pendingCount = 0;

  snap.forEach(doc => {
    const r = doc.data();
    if (r.flagged) flaggedCount++;
    if (!r.approved) pendingCount++;
  });

  return { flaggedCount, pendingCount };
}

import { auth, db } from './firebase-init.js';
import { supportedLanguages, getStoredLanguage, setStoredLanguage } from './i18n.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const profileForm = document.getElementById('profileForm');
const accountNotice = document.getElementById('accountNotice');
const languageSelect = document.getElementById('language');
const privacySettings = document.getElementById('privacySettings');
const questsList = document.getElementById('questsList');
const badgeGrid = document.getElementById('badgeGrid');
const userReviews = document.getElementById('userReviews');
const favoritesList = document.getElementById('favoritesList');
const photoGallery = document.getElementById('photoGallery');
const reviewSort = document.getElementById('reviewSort');

const privacyFields = [
  ['profilePublic', 'Profile'],
  ['reviewsPublic', 'Reviews'],
  ['badgesPublic', 'Badges'],
  ['xpPublic', 'XP level'],
  ['favoritesPublic', 'Favorites'],
  ['photosPublic', 'Uploaded photos']
];

function getLocalFavorites() {
  try {
    return JSON.parse(localStorage.getItem('mycafe:favorites') || '[]');
  } catch {
    return [];
  }
}

const demoUser = {
  nickname: 'Guest Explorer',
  email: '',
  profilePicUrl: '',
  bio: 'Cafe notes, favorite corners, and new menu finds.',
  language: getStoredLanguage(),
  xp: 35,
  level: 1,
  badges: ['first-review'],
  favorites: getLocalFavorites(),
  settings: {
    profilePublic: false,
    reviewsPublic: false,
    badgesPublic: true,
    xpPublic: true,
    favoritesPublic: false,
    photosPublic: false
  },
  flagged: false,
  quests: {
    active: {
      'three-cafes': { progress: 1, total: 3, deadline: 'This week' },
      'photo-review': { progress: 0, total: 1, deadline: 'Anytime' }
    },
    completed: []
  }
};

const badgeCatalog = [
  { id: 'first-review', name: 'First Review', type: 'contributor', xp: 20, requirement: 'Leave your first review' },
  { id: 'photo-friend', name: 'Photo Friend', type: 'social', xp: 20, requirement: 'Upload a review photo' },
  { id: 'explorer', name: 'Explorer', type: 'explorer', xp: 20, requirement: 'Visit three new cafes' },
  { id: 'quest-maker', name: 'Quest Maker', type: 'quest', xp: 20, requirement: 'Complete a quest' }
];

let currentUser = null;
let currentUserData = demoUser;
let currentReviews = [];

function populateLanguages() {
  languageSelect.innerHTML = supportedLanguages.map(language => `
    <option value="${language.code}">${language.label} - ${language.name}</option>
  `).join('');
}

function renderNotice() {
  accountNotice.classList.toggle('hidden', !!currentUser);
  accountNotice.textContent = currentUser
    ? ''
    : 'Guest dashboard preview. Log in to save profile changes, earn badges, and sync quests.';
}

function renderProfile(userData) {
  document.getElementById('nickname').value = userData.nickname || '';
  document.getElementById('profilePicUrl').value = userData.profilePicUrl || '';
  document.getElementById('bio').value = userData.bio || '';
  languageSelect.value = userData.language || getStoredLanguage();

  privacySettings.innerHTML = privacyFields.map(([key, label]) => `
    <label class="flex items-center justify-between gap-3 bg-white rounded p-3 border">
      <span>${label}</span>
      <input type="checkbox" data-privacy="${key}" ${userData.settings?.[key] ? 'checked' : ''}>
    </label>
  `).join('');
}

function renderLevel(userData) {
  const xp = Number(userData.xp || 0);
  const level = Math.max(1, Number(userData.level || Math.floor(xp / 100) + 1));
  const progress = Math.min(100, xp % 100);
  document.getElementById('levelLabel').textContent = `Level ${level}`;
  document.getElementById('xpLabel').textContent = `${xp} XP · ${100 - progress} XP to next level`;
  document.getElementById('xpBar').style.width = `${progress}%`;
  document.getElementById('approvalLabel').textContent = level >= 2 && !userData.flagged
    ? 'Auto-approved reviews'
    : 'Manual moderation';
  document.getElementById('trustLabel').textContent = userData.flagged ? 'Flagged for review' : 'Clean account';
}

function renderQuests(userData) {
  const active = userData.quests?.active || {};
  const entries = Object.entries(active);

  if (!entries.length) {
    questsList.innerHTML = '<p>No active quests right now.</p>';
    return;
  }

  questsList.innerHTML = entries.map(([questId, quest]) => {
    const progress = Number(quest.progress || 0);
    const total = Number(quest.total || 1);
    const percent = Math.min(100, Math.round((progress / total) * 100));
    return `
      <article class="cafe-card">
        <div class="cafe-card-body">
          <h3>${quest.name || questId.replace(/-/g, ' ')}</h3>
          <p>${quest.description || 'Complete the requirement and earn XP.'}</p>
          <div class="w-full bg-gray-200 rounded h-3 overflow-hidden my-3">
            <div class="bg-green-700 h-3" style="width: ${percent}%"></div>
          </div>
          <p class="text-sm text-gray-600">${progress}/${total} · ${quest.deadline || 'No deadline'} · ${quest.xp || '50-100'} XP</p>
        </div>
      </article>
    `;
  }).join('');
}

function renderBadges(userData) {
  const earned = new Set(userData.badges || []);
  badgeGrid.innerHTML = badgeCatalog.map(badge => {
    const unlocked = earned.has(badge.id);
    return `
      <article class="cafe-card ${unlocked ? '' : 'opacity-60'}" title="${badge.requirement}">
        <div class="cafe-card-body">
          <h3>${unlocked ? '🏅' : '🔒'} ${badge.name}</h3>
          <p>${badge.requirement}</p>
          <p class="text-sm text-gray-600">${badge.type} · ${badge.xp} XP</p>
        </div>
      </article>
    `;
  }).join('');
}

function sortReviews(reviews) {
  const sort = reviewSort.value;
  return [...reviews].sort((a, b) => {
    const aDate = a.createdAt?.seconds || 0;
    const bDate = b.createdAt?.seconds || 0;
    if (sort === 'oldest') return aDate - bDate;
    if (sort === 'liked') return (b.likes || 0) - (a.likes || 0);
    return bDate - aDate;
  });
}

function renderReviews() {
  const sorted = sortReviews(currentReviews);
  userReviews.innerHTML = sorted.length ? sorted.map(review => `
    <article class="bg-white rounded border p-3">
      <div class="flex justify-between gap-3">
        <strong>${review.cafeName || review.cafeId || 'Cafe'}</strong>
        <span>${review.rating || 5} stars</span>
      </div>
      <p>${review.text || ''}</p>
      <small>${review.likes || 0} likes · ${review.flagged ? 'Flagged' : review.approved ? 'Approved' : 'Pending'}</small>
    </article>
  `).join('') : '<p>No reviews yet.</p>';
}

function renderFavorites(userData) {
  const favorites = userData.favorites || [];
  favoritesList.innerHTML = favorites.length ? favorites.map(cafeId => `
    <article class="bg-white rounded border p-3">
      <strong>${cafeId}</strong>
      <div class="flex gap-2 mt-2">
        <button class="secondary-link" type="button">Add note</button>
        <button class="secondary-link" type="button" data-remove-favorite="${cafeId}">Remove from favorites</button>
      </div>
    </article>
  `).join('') : '<p>No favorites saved yet.</p>';
}

function renderPhotos(reviews) {
  const photos = reviews.filter(review => review.imageUrl);
  photoGallery.innerHTML = photos.length ? photos.map(review => `
    <article class="cafe-card">
      <img src="${review.imageUrl}" alt="Review photo">
      <div class="cafe-card-body">
        <h3>${review.cafeName || review.cafeId || 'Cafe photo'}</h3>
        <button class="secondary-link" type="button">Set visibility</button>
      </div>
    </article>
  `).join('') : '<p>No uploaded photos yet.</p>';
}

async function loadUserData(user) {
  if (!user) return demoUser;
  try {
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    return userSnap.exists()
      ? { ...demoUser, ...userSnap.data(), email: user.email }
      : { ...demoUser, nickname: user.displayName || '', email: user.email };
  } catch (error) {
    console.warn('[dashboard] Could not load user profile.', error);
    return { ...demoUser, email: user.email };
  }
}

async function loadUserReviews(user) {
  if (!user) return [];
  try {
    const reviewsQuery = query(collection(db, 'reviews'), where('userId', '==', user.uid));
    const snapshot = await getDocs(reviewsQuery);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.warn('[dashboard] Could not load reviews.', error);
    return [];
  }
}

function renderAll() {
  renderNotice();
  renderProfile(currentUserData);
  renderLevel(currentUserData);
  renderQuests(currentUserData);
  renderBadges(currentUserData);
  renderReviews();
  renderFavorites(currentUserData);
  renderPhotos(currentReviews);
}

profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  const settings = {};
  document.querySelectorAll('[data-privacy]').forEach(input => {
    settings[input.dataset.privacy] = input.checked;
  });

  currentUserData = {
    ...currentUserData,
    nickname: document.getElementById('nickname').value.trim(),
    profilePicUrl: document.getElementById('profilePicUrl').value.trim(),
    bio: document.getElementById('bio').value.trim(),
    language: languageSelect.value,
    settings
  };

  setStoredLanguage(currentUserData.language);

  if (currentUser) {
    await setDoc(doc(db, 'users', currentUser.uid), currentUserData, { merge: true });
    accountNotice.classList.remove('hidden');
    accountNotice.textContent = 'Profile saved.';
    setTimeout(renderNotice, 1600);
  } else {
    renderNotice();
  }
});

reviewSort.addEventListener('change', renderReviews);

onAuthStateChanged(auth, async user => {
  currentUser = user;
  currentUserData = await loadUserData(user);
  currentReviews = await loadUserReviews(user);
  renderAll();
});

populateLanguages();

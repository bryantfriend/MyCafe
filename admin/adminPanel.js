import { renderUsersPanel } from './adminUsers.js';
import { renderCafesPanel } from './adminCafes.js';
import { renderReviewsPanel, checkReviewAlerts } from './adminReviews.js';
import { renderCirclesPanel } from './adminCircles.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth, db } from '../js/firebase-init.js';

const content = document.getElementById('adminContent');
const reviewAlert = document.getElementById('reviewAlert');

function renderDashboardHome() {
  content.innerHTML = `
    <div class="grid grid-cols-1 gap-6">
      <button id="cardUsers" class="w-full text-left bg-white p-4 rounded shadow transition-all transform hover:-translate-y-1 hover:shadow-lg">
        <h2 class="text-xl font-semibold mb-1">👥 Users</h2>
        <p class="text-sm text-gray-600">Add, edit, or remove users</p>
      </button>

      <button id="cardCafes" class="w-full text-left bg-white p-4 rounded shadow transition-all transform hover:-translate-y-1 hover:shadow-lg">
        <h2 class="text-xl font-semibold mb-1">🏪 Cafes</h2>
        <p class="text-sm text-gray-600">✨ Manage cafe details and premium features</p>
      </button>

      <button id="cardReviews" class="w-full text-left bg-white p-4 rounded shadow transition-all transform hover:-translate-y-1 hover:shadow-lg">
        <h2 class="text-xl font-semibold mb-1">📝 Reviews</h2>
        <p class="text-sm text-gray-600">❗ Moderate user reviews</p>
      </button>

      <button id="cardCircles" class="w-full text-left bg-white p-4 rounded shadow transition-all transform hover:-translate-y-1 hover:shadow-lg">
        <h2 class="text-xl font-semibold mb-1">🪑 Cafe Circles</h2>
        <p class="text-sm text-gray-600">View and manage cafe circles</p>
      </button>

      <section class="bg-white p-4 rounded shadow">
        <h2 class="text-xl font-semibold mb-2">🧠 Future Panels</h2>
        <div class="grid md:grid-cols-3 gap-2 text-sm text-gray-700">
          <span>Promo Codes / Subscriptions</span>
          <span>Flagged Content Log</span>
          <span>Activity / Audit Log</span>
          <span>Notification Center</span>
          <span>Language & Translation Tools</span>
        </div>
      </section>
    </div>
  `;

  // Handlers remain the same...
  document.getElementById('cardUsers').addEventListener('click', async () => {
    content.innerHTML = '<h2 class="text-xl mb-4">Loading Users...</h2>';
    await renderUsersPanel(content);
  });

  document.getElementById('cardCafes').addEventListener('click', async () => {
    content.innerHTML = '<h2 class="text-xl mb-4">Loading Cafes...</h2>';
    await renderCafesPanel(content);
  });

  document.getElementById('cardReviews').addEventListener('click', async () => {
    content.innerHTML = '<h2 class="text-xl mb-4">Loading Reviews...</h2>';
    await renderReviewsPanel(content);
  });

  document.getElementById('cardCircles').addEventListener('click', async () => {
    content.innerHTML = '<h2 class="text-xl mb-4">Loading Cafe Circles...</h2>';
    await renderCirclesPanel(content);
  });
}

// Navigation

document.getElementById('navHome').addEventListener('click', renderDashboardHome);

document.getElementById('navUsers').addEventListener('click', async () => {
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Users...</h2>';
  await renderUsersPanel(content);
});

document.getElementById('navCafes').addEventListener('click', async () => {
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Cafes...</h2>';
  await renderCafesPanel(content);
});

document.getElementById('navReviews').addEventListener('click', async () => {
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Reviews...</h2>';
  await renderReviewsPanel(content);
});

document.getElementById('navCircles').addEventListener('click', async () => {
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Cafe Circles...</h2>';
  await renderCirclesPanel(content);
});

async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = '/' ;// redirect to homepage or login screen
  } catch (err) {
    console.log('Logout failed:', err);
  }
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', handleLogout);
document.getElementById('logoutBtnTop')?.addEventListener('click', handleLogout);

// 🟣 Mobile menu toggle
const toggleBtn = document.getElementById('mobileMenuToggle');
const mobileDrawer = document.getElementById('mobileDrawer');
const closeBtn = document.getElementById('mobileClose');

toggleBtn?.addEventListener('click', () => {
  mobileDrawer.classList.remove('hidden');
});

closeBtn?.addEventListener('click', () => {
  mobileDrawer.classList.add('hidden');
});


document.getElementById('mobileClose').addEventListener('click', () => {
  document.getElementById('mobileDrawer').classList.add('hidden');
});

// 🟢 Mobile nav events
document.getElementById('navHomeMobile').addEventListener('click', () => {
  document.getElementById('mobileDrawer').classList.add('hidden');
  renderDashboardHome();
});

document.getElementById('navUsersMobile').addEventListener('click', async () => {
  document.getElementById('mobileDrawer').classList.add('hidden');
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Users...</h2>';
  await renderUsersPanel(content);
});

document.getElementById('navCafesMobile').addEventListener('click', async () => {
  document.getElementById('mobileDrawer').classList.add('hidden');
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Cafes...</h2>';
  await renderCafesPanel(content);
});

document.getElementById('navReviewsMobile').addEventListener('click', async () => {
  document.getElementById('mobileDrawer').classList.add('hidden');
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Reviews...</h2>';
  await renderReviewsPanel(content);
});

document.getElementById('navCirclesMobile').addEventListener('click', async () => {
  document.getElementById('mobileDrawer').classList.add('hidden');
  content.innerHTML = '<h2 class="text-xl mb-4">Loading Cafe Circles...</h2>';
  await renderCirclesPanel(content);
});

document.getElementById('logoutBtnMobile').addEventListener('click', async () => {
  await handleLogout();
});


// Load alerts (e.g., flagged/new reviews)
async function initAdminPanel() {
  const { flaggedCount, pendingCount } = await checkReviewAlerts();
  let icon = '';
  if (flaggedCount > 0) icon += '🔴';
  if (pendingCount > 0) icon += '🟡';
  reviewAlert.textContent = icon;
}

initAdminPanel();
renderDashboardHome();

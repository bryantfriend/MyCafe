import {
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
  Timestamp,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth, db } from '../js/firebase-init.js';

let currentEditUserId = null;
let modalMode = 'add';
let modalWired = false;

export async function renderUsersPanel(container) {
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">👥 User Management</h2>

    <div class="mb-4 flex flex-wrap gap-4 items-center">
      <input id="searchInput" type="text" placeholder="Search by name or email" class="border px-3 py-2 rounded w-60" />
      <select id="roleFilter" class="border px-3 py-2 rounded">
        <option value="">All Roles</option>
        <option value="user">User</option>
        <option value="cafeOwner">Cafe Owner</option>
        <option value="circleHost">Circle Host</option>
        <option value="admin">Admin</option>
      </select>
      <select id="statusFilter" class="border px-3 py-2 rounded">
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="banned">Banned</option>
      </select>
      <select id="activityFilter" class="border px-3 py-2 rounded">
        <option value="">All Activity</option>
        <option value="recent">Recently Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <button id="addUserBtn" class="bg-green-600 text-white px-3 py-2 rounded">➕ Add User</button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left border bg-white rounded-lg overflow-hidden">
        <thead class="bg-gray-200 text-sm">
          <tr>
            <th class="p-3">Username</th>
            <th class="p-3">Email</th>
            <th class="p-3">Role</th>
            <th class="p-3">Reviews count</th>
            <th class="p-3">Badges earned</th>
            <th class="p-3">Last Login</th>
            <th class="p-3">Status</th>
            <th class="p-3">Action</th>
          </tr>
        </thead>
        <tbody id="userTableBody"></tbody>
      </table>
    </div>
  `;
  ensureModalExists();
  const allUsers = await loadAllUsers();
  renderUserRows(allUsers);

  document.getElementById('searchInput').addEventListener('input', () => filterAndRender(allUsers));
  document.getElementById('roleFilter').addEventListener('change', () => filterAndRender(allUsers));
  document.getElementById('statusFilter').addEventListener('change', () => filterAndRender(allUsers));
  document.getElementById('activityFilter').addEventListener('change', () => filterAndRender(allUsers));
  document.getElementById('addUserBtn').addEventListener('click', () => openUserModal('add'));
}

function ensureModalExists() {
  if (modalWired) return;
  document.getElementById('modalCloseBtn').addEventListener('click', closeUserModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeUserModal();
  });
  document.getElementById('modalSaveBtn').addEventListener('click', saveUserFromModal);
  document.getElementById('modalPasswordResetBtn')?.addEventListener('click', sendResetFromModal);
  modalWired = true;
}

function openUserModal(mode, user = {}) {
  ensureModalExists();

  const nicknameInput = document.getElementById('modalNickname');
  const emailInput = document.getElementById('modalEmail');
  const roleInput = document.getElementById('modalRole');
  const flaggedInput = document.getElementById('modalFlagged');
  const adminNotesInput = document.getElementById('modalAdminNotes');
  const assignBadgeInput = document.getElementById('modalAssignBadge');

  if (!nicknameInput) {
    console.error('❌ modalNickname not found in DOM!');
    return;
  }

  modalMode = mode;
  currentEditUserId = user.id || null;

  document.getElementById('modalTitle').textContent = mode === 'add' ? '➕ Add User' : '✏️ Edit User';
  nicknameInput.value = user.nickname || '';
  emailInput.value = user.email || '';
  roleInput.value = user.role || 'user';
  flaggedInput.checked = !!user.flagged;
  adminNotesInput.value = user.adminNotes || '';
  assignBadgeInput.value = '';

  document.getElementById('modalCreatedAt').textContent = user.createdAt ? formatDate(user.createdAt) : '-';
  document.getElementById('modalLastLogin').textContent = user.lastLogin ? formatDate(user.lastLogin) : '-';
  document.getElementById('modalBadgeCount').textContent = user.badges?.length || 0;
  document.getElementById('modalReviewCount').textContent = user.reviews?.length || 0;
  renderUserModerationTools(user);

  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeUserModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

async function saveUserFromModal() {
  const nickname = document.getElementById('modalNickname').value.trim();
  const email = document.getElementById('modalEmail').value.trim();
  const role = document.getElementById('modalRole').value;
  const flagged = document.getElementById('modalFlagged').checked;
  const adminNotes = document.getElementById('modalAdminNotes').value.trim();
  const badgeToAssign = document.getElementById('modalAssignBadge').value.trim();

  const userData = { nickname, email, role, flagged, adminNotes };
  if (badgeToAssign) {
    const existingBadges = currentEditUserId
      ? (document.getElementById('modalBadgeCount').dataset.badges || '').split(',').filter(Boolean)
      : [];
    userData.badges = [...new Set([...existingBadges, badgeToAssign])];
  }

  try {
    if (modalMode === 'add') {
      userData.createdAt = new Date();
      userData.reviews = [];
      userData.badges = [];
      await addDoc(collection(db, 'users'), userData);
    } else if (modalMode === 'edit' && currentEditUserId) {
      await updateDoc(doc(db, 'users', currentEditUserId), userData);
    }

    closeUserModal();
    renderUsersPanel(document.getElementById('adminContent'));
  } catch (err) {
    console.error('❌ Error saving user:', err);
  }
}

async function loadAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function renderUserRows(users) {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '';

  const mobileContainer = document.getElementById('userCardContainer');
  if (mobileContainer) mobileContainer.remove();

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    const cardContainer = document.createElement('div');
    cardContainer.id = 'userCardContainer';
    cardContainer.className = 'space-y-4 md:hidden';

    users.forEach(user => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded shadow border space-y-1';

      card.innerHTML = `
        <div class="font-bold text-lg">${user.nickname || '(no name)'}</div>
        <div class="text-sm text-gray-700">${user.email}</div>
        <div class="text-sm">🏅 ${user.badges?.length || 0} | 📝 ${user.reviews?.length || 0}</div>
        <div class="text-sm">⏱️ ${user.lastLogin ? formatDate(user.lastLogin) : '-'}</div>
        <div class="text-sm">👤 ${user.role || 'user'} | ${user.flagged ? '🚫 Banned' : '✅ Active'}</div>
        <div class="mt-2 space-x-2">
          <button class="edit-btn text-blue-600 hover:underline">Edit</button>
          <button class="delete-btn text-red-600 hover:underline">Delete</button>
        </div>
      `;

      card.querySelector('.edit-btn').addEventListener('click', () => openUserModal('edit', user));
      card.querySelector('.delete-btn').addEventListener('click', () => handleDeleteUser(user.id));

      cardContainer.appendChild(card);
    });

    document.getElementById('adminContent').appendChild(cardContainer);
  } else {
    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.className = 'border-b text-sm hover:bg-gray-50';
      tr.innerHTML = `
        <td class="p-3">${user.nickname || '(no name)'}</td>
        <td class="p-3">${user.email}</td>
        <td class="p-3">${user.role || 'user'}</td>
        <td class="p-3">${user.reviews?.length || 0}</td>
        <td class="p-3">${user.badges?.length || 0}</td>
        <td class="p-3">${user.lastLogin ? formatDate(user.lastLogin) : '-'}</td>
        <td class="p-3">${user.flagged ? 'Banned' : 'Active'}</td>
        <td class="p-3 space-x-2">
          <button class="edit-btn text-blue-600 hover:underline">View/Edit</button>
          <button class="delete-btn text-red-600 hover:underline">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);

      tr.querySelector('.edit-btn').addEventListener('click', () => openUserModal('edit', user));
      tr.querySelector('.delete-btn').addEventListener('click', () => handleDeleteUser(user.id));
    });
  }
}

async function handleDeleteUser(userId) {
  const confirmDelete = confirm('Are you sure you want to delete this user?');
  if (!confirmDelete) return;
  try {
    await deleteDoc(doc(db, 'users', userId));
    renderUsersPanel(document.getElementById('adminContent'));
  } catch (err) {
    console.error('❌ Error deleting user:', err);
  }
}

function filterAndRender(users) {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const role = document.getElementById('roleFilter').value;
  const status = document.getElementById('statusFilter').value;
  const activity = document.getElementById('activityFilter').value;
  const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;

  const filtered = users.filter(user => {
    const matchSearch = user.nickname?.toLowerCase().includes(search) || user.email?.toLowerCase().includes(search);
    const matchRole = !role || user.role === role;
    const matchStatus = !status || (status === 'banned' ? user.flagged : !user.flagged);
    const lastLogin = user.lastLogin?.toDate?.() || (user.lastLogin ? new Date(user.lastLogin) : null);
    const isRecent = lastLogin && lastLogin.getTime() >= recentCutoff;
    const matchActivity = !activity || (activity === 'recent' ? isRecent : !isRecent);
    return matchSearch && matchRole && matchStatus && matchActivity;
  });

  renderUserRows(filtered);
}

async function sendResetFromModal() {
  const email = document.getElementById('modalEmail').value.trim();
  if (!email) return;
  await sendPasswordResetEmail(auth, email);
  document.getElementById('modalModerationTools').innerHTML = `<p class="text-green-700">Password reset sent to ${email}.</p>`;
}

async function renderUserModerationTools(user) {
  const tools = document.getElementById('modalModerationTools');
  const badgeCount = document.getElementById('modalBadgeCount');
  badgeCount.dataset.badges = (user.badges || []).join(',');

  if (!user.id) {
    tools.innerHTML = 'Save this user before loading moderation tools.';
    return;
  }

  try {
    const reviewsSnap = await getDocs(query(collection(db, 'reviews'), where('userId', '==', user.id)));
    const reviews = reviewsSnap.docs.map(reviewDoc => ({ id: reviewDoc.id, ...reviewDoc.data() }));
    tools.innerHTML = `
      <div class="grid gap-2">
        <strong>${reviews.length} reviews</strong>
        ${reviews.map(review => `
          <div class="bg-white border rounded p-2">
            <p>${review.text || '(empty review)'}</p>
            <small>${review.imageUrl ? 'Photo attached' : 'No photo'} · ${review.flagged ? 'Flagged' : review.approved ? 'Approved' : 'Pending'}</small>
          </div>
        `).join('') || '<p>No reviews yet.</p>'}
      </div>
    `;
  } catch (error) {
    tools.innerHTML = 'Could not load reviews right now.';
  }
}

function formatDate(ts) {
  const date = ts?.toDate?.() || new Date(ts);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db } from '../js/firebase-init.js';

export async function renderMenuEditor(cafeId, container) {
  const cafeRef = doc(db, 'cafes', cafeId);
  const cafeSnap = await getDoc(cafeRef);

  if (!cafeSnap.exists()) {
    container.innerHTML = `<p class="text-red-600">Cafe not found.</p>`;
    return;
  }

  const cafe = cafeSnap.data();
  const menu = cafe.menu || {};

  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">🍽️ Edit Menu for ${cafe.name}</h2>
    <div id="menuEditor" class="space-y-6"></div>
    <button id="addCategoryBtn" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">➕ Add Category</button>
    <button id="saveMenuBtn" class="ml-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">💾 Save Menu</button>
  `;

  const editor = document.getElementById('menuEditor');
  renderCategories(editor, menu);

  document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const newCategory = prompt('Enter new category name:');
    if (newCategory && !menu[newCategory]) {
      menu[newCategory] = [];
      renderCategories(editor, menu);
    }
  });

  document.getElementById('saveMenuBtn').addEventListener('click', async () => {
    const updatedMenu = readMenuFromDOM();
    await updateDoc(cafeRef, { menu: updatedMenu });
    console.log('Menu updated');
  });
}

function renderCategories(container, menu) {
  container.innerHTML = '';

  for (const category in menu) {
    const catDiv = document.createElement('div');
    catDiv.className = 'border rounded p-4 bg-white shadow';

    const items = menu[category] || [];

    catDiv.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-semibold">${category}</h3>
        <div>
          <button class="text-green-600 text-sm underline add-item">Add Item</button>
          <button class="text-red-600 text-sm underline ml-2 delete-category">Delete</button>
        </div>
      </div>
      <div class="item-list space-y-2">
        ${items.map(item => renderItemRow(item)).join('')}
      </div>
    `;

    // Button handlers
    catDiv.querySelector('.add-item').addEventListener('click', () => {
      const itemList = catDiv.querySelector('.item-list');
      const newItem = renderItemRow({ name: '', price: '', image: '' });
      itemList.insertAdjacentHTML('beforeend', newItem);
    });

    catDiv.querySelector('.delete-category').addEventListener('click', () => {
      delete menu[category];
      renderCategories(container, menu);
    });

    container.appendChild(catDiv);
  }
}

function renderItemRow(item) {
  return `
    <div class="flex flex-wrap gap-2 item-row">
      <input type="text" placeholder="Item name" value="${item.name || ''}" class="border px-2 py-1 rounded w-48">
      <input type="number" placeholder="Price" value="${item.price || ''}" class="border px-2 py-1 rounded w-24">
      <input type="text" placeholder="Image URL (optional)" value="${item.image || item.photo || ''}" class="border px-2 py-1 rounded w-64">
      <label class="flex items-center gap-1 text-sm">
        <input type="checkbox" class="available-input" ${item.available === false ? '' : 'checked'}>
        Available
      </label>
      <label class="flex items-center gap-1 text-sm">
        <input type="checkbox" class="archived-input" ${item.archived ? 'checked' : ''}>
        Archived
      </label>
      <textarea placeholder="Translations JSON optional" class="translations-input border px-2 py-1 rounded w-64">${JSON.stringify(item.translations || {})}</textarea>
      <button class="text-red-500 remove-item">✖</button>
    </div>
  `;
}

function readMenuFromDOM() {
  const menu = {};
  const categoryDivs = document.querySelectorAll('#menuEditor > div');

  categoryDivs.forEach(catDiv => {
    const category = catDiv.querySelector('h3').textContent.trim();
    const itemRows = catDiv.querySelectorAll('.item-row');
    const items = [];

    itemRows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      const name = inputs[0].value.trim();
      const price = parseFloat(inputs[1].value);
      const image = inputs[2].value.trim();
      let translations = {};
      try {
        translations = JSON.parse(row.querySelector('.translations-input')?.value || '{}');
      } catch {
        translations = {};
      }
      if (name && !isNaN(price)) {
        items.push({
          name,
          price,
          image,
          available: row.querySelector('.available-input')?.checked !== false,
          archived: row.querySelector('.archived-input')?.checked || false,
          translations
        });
      }
    });

    menu[category] = items;
  });

  return menu;
}

// Remove item buttons
document.addEventListener('click', e => {
  if (e.target.classList.contains('remove-item')) {
    e.target.parentElement.remove();
  }
});

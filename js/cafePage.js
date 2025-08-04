// js/cafePage.js

import { db } from './firebase-init.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const languageSelector = document.getElementById('languageSelector');
let currentLanguage = 'en';
let currentCafeData = null;
let currentMenuData = null;

// An object to map category names to emojis for a nicer UI
const categoryIcons = {
  "Breakfasts": "🍳",
  "Coffee & Teas": "☕",
  "Cold Drinks": "🍹",
  "Appetizers & Salads": "🥗",
  "Burgers & Panini": "🍔",
  "Soups": "🍲",
  "Hot Dishes": "🍛",
  "Pasta": "🍝",
  "Pizza": "🍕",
  "Rolls": "🍣",
  "Baked Goods & Desserts": "🍰"
};

languageSelector.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  if (currentCafeData) renderCafeInfo(currentCafeData);
  if (currentMenuData) renderMenu(currentMenuData);
});

const urlParams = new URLSearchParams(window.location.search);
const cafeId = urlParams.get('id');

async function getCafeInfoFromFirestore(id) {
  if (!id) {
    document.body.innerHTML = '<h1>Error: Cafe ID not provided in URL.</h1>';
    return null;
  }
  const docRef = doc(db, 'cafes', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.error(`Cafe with ID '${id}' not found in Firestore.`);
    return null;
  }
}

async function getMenuFromJson(pathName) {
    if (!pathName) {
      console.error("Cannot fetch menu: 'path_name' is missing from the Firestore document.");
      return null;
    }
    const menuPath = `assets/${pathName}/menu.json`;
    try {
        const response = await fetch(menuPath);
        if (!response.ok) throw new Error(`Menu file not found at ${menuPath}`);
        return await response.json();
    } catch (error) {
        console.error("Could not fetch local menu JSON:", error);
        return null;
    }
}

function renderCafeInfo(cafeData) {
  const translations = cafeData.translations?.[currentLanguage] || {};
  const name = translations.name || cafeData.name || "Cafe";
  document.title = `MyCafe | ${name}`;
  document.getElementById('cafeInfo').innerHTML = `
    <h2 class="text-3xl font-bold mb-2">${name}</h2>
    <p class="mb-2">${translations.description || cafeData.description || ''}</p>
  `;
}

// --- NEW HELPER FUNCTION ---
// Renders only the items for a specific category into the right column
function renderCategoryItems(category) {
  const itemsContainer = document.getElementById('menuItems');
  itemsContainer.innerHTML = ''; // Clear previous items

  const itemsGrid = document.createElement('div');
  itemsGrid.className = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

  category.items.forEach(item => {
    const translatedName = item.translations?.[currentLanguage]?.name || item.name;
    const translatedDesc = item.translations?.[currentLanguage]?.description || item.description || '';
    const itemCard = document.createElement('div');
    // Styling the item cards for a cleaner look
    itemCard.className = 'bg-white rounded-lg shadow p-4 flex flex-col';
    itemCard.innerHTML = `
      <div class="flex-grow">
        <h4 class="text-lg font-semibold text-gray-800">${translatedName}</h4>
        ${translatedDesc ? `<p class="text-sm text-gray-600 mt-1">${translatedDesc}</p>` : ''}
      </div>
      <p class="font-bold text-gray-900 mt-3 text-right">${item.price} сом</p>
    `;
    itemsGrid.appendChild(itemCard);
  });
  itemsContainer.appendChild(itemsGrid);
}

// --- COMPLETELY REWRITTEN FUNCTION ---
function renderMenu(menuData) {
  const menuSection = document.getElementById('menuSection');
  if (!menuData || !Array.isArray(menuData)) {
    if (menuSection) menuSection.style.display = 'none';
    return;
  }
  if (menuSection) menuSection.style.display = 'block';

  const categoriesContainer = document.getElementById('menuCategories');
  categoriesContainer.innerHTML = ''; // Clear old categories

  // 1. Create the category buttons
  menuData.forEach((category, index) => {
    const categoryName = category[`category_${currentLanguage}`] || category.category_en;
    const icon = categoryIcons[category.category_en] || '🍽️';

    const button = document.createElement('button');
    // ** MODIFIED LINE **: 'flex-shrink-0' for mobile, 'md:w-full' for desktop
    button.className = 'flex-shrink-0 md:w-full text-left p-3 rounded-lg flex items-center gap-3 transition duration-200 whitespace-nowrap';
    button.innerHTML = `<span>${icon}</span><span class="font-semibold">${categoryName}</span>`;
    
    button.dataset.index = index;

    // Add active state for the first button
    if (index === 0) {
      button.classList.add('bg-white', 'shadow');
    } else {
      button.classList.add('hover:bg-gray-200');
    }

    categoriesContainer.appendChild(button);
  });

  // 2. Add a single event listener to the container
  categoriesContainer.addEventListener('click', (e) => {
    const clickedButton = e.target.closest('button');
    if (!clickedButton) return;

    // Remove active state from all buttons
    categoriesContainer.querySelectorAll('button').forEach(btn => {
      btn.classList.remove('bg-white', 'shadow');
      btn.classList.add('hover:bg-gray-200');
    });

    // Add active state to the clicked button
    clickedButton.classList.add('bg-white', 'shadow');
    clickedButton.classList.remove('hover:bg-gray-200');

    // Render the corresponding items
    const categoryIndex = parseInt(clickedButton.dataset.index, 10);
    renderCategoryItems(menuData[categoryIndex]);
  });
  
  // 3. Initially render the items for the first category (index 0)
  if (menuData.length > 0) {
    renderCategoryItems(menuData[0]);
  }
}

async function renderPage() {
    const cafeData = await getCafeInfoFromFirestore(cafeId);
    if (!cafeData) return;
    
    const menuData = await getMenuFromJson(cafeData.path_name);
    
    currentCafeData = cafeData;
    currentMenuData = menuData;
    
    renderCafeInfo(currentCafeData);
    renderMenu(currentMenuData);
}

// Initial page load
renderPage();

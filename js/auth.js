import { auth, db } from './firebase-init.js';
import {
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');

function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next) return '';

  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin) return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  errorMsg.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.querySelector('span').textContent = 'Logging in...';

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const next = getSafeNextPath();
    if (next) {
      window.location.href = next;
      return;
    }

    let role = 'user';
    try {
      const userSnap = await getDoc(doc(db, 'users', credential.user.uid));
      role = userSnap.exists() ? userSnap.data().role : 'user';
    } catch (profileError) {
      console.warn('Could not load user role, sending to dashboard.', profileError);
    }
    if (role === 'admin') {
      window.location.href = '/admin/adminPanel.html';
      return;
    }

    window.location.href = role === 'cafeOwner' ? '/owner-dashboard.html' : '/dashboard.html';
  } catch (err) {
    console.error('Login error:', err);
    errorMsg.textContent = 'Incorrect email or password.';
    errorMsg.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.querySelector('span').textContent = 'Log In';
  }
});

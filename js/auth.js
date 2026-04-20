import { auth, db } from './firebase-init.js';
import {
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');

loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Login successful');
    const next = new URLSearchParams(window.location.search).get('next');
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
    window.location.href = role === 'admin' ? '/admin/adminPanel.html' : '/dashboard.html';
  } catch (err) {
    console.error('Login error:', err);
    errorMsg.textContent = '⚠️ Incorrect email or password';
    errorMsg.classList.remove('hidden');
  }
});

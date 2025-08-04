import { auth } from './firebase-init.js';
import {
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');

loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Login successful');
    window.location.href = '/admin/adminPanel.html';
  } catch (err) {
    console.error('Login error:', err);
    errorMsg.textContent = '⚠️ Incorrect email or password';
    errorMsg.classList.remove('hidden');
  }
});

import { auth, db } from './firebase-init.js';
import { supportedLanguages, getStoredLanguage } from './i18n.js';
import { setStatus } from '../packages/ui/renderHelpers.js';
import { runIntentPipeline } from '../packages/icf/pipeline/runIntentPipeline.js';
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const registerForm = document.getElementById('registerForm');
const registerStatus = document.getElementById('registerStatus');
const languageSelect = document.getElementById('language');

languageSelect.innerHTML = supportedLanguages.map(language => `
  <option value="${language.code}" ${language.code === getStoredLanguage() ? 'selected' : ''}>
    ${language.label} - ${language.name}
  </option>
`).join('');

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  const submitButton = registerForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setStatus(registerStatus, 'Creating account...', 'info');

  const nickname = document.getElementById('nickname').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const language = languageSelect.value;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: nickname });
    const profileResult = await runIntentPipeline('RegisterUserProfileIntent', {
      userId: credential.user.uid,
      profile: {
        nickname,
        email,
        language
      }
    });
    if (!profileResult.ok) {
      throw new Error(profileResult.message || 'Account profile could not be created.');
    }
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('[register] Could not create account.', error);
    setStatus(registerStatus, error.message || 'Account could not be created.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});


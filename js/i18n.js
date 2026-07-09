export const supportedLanguages = [
  { code: 'ru', label: 'RU', name: 'Russian', flagCode: 'ru' },
  { code: 'ky', label: 'KG', name: 'Kyrgyz', flagCode: 'kg' },
  { code: 'en', label: 'EN', name: 'English', flagCode: 'us' },
  { code: 'uz', label: 'UZ', name: 'Uzbek', flagCode: 'uz' },
  { code: 'tg', label: 'TJ', name: 'Tajik', flagCode: 'tj' },
  { code: 'zh', label: 'ZH', name: 'Chinese', flagCode: 'cn' },
  { code: 'ko', label: 'KO', name: 'Korean', flagCode: 'kr' },
  { code: 'ar', label: 'AR', name: 'Arabic', flagCode: 'sa' },
  { code: 'hi', label: 'HI', name: 'Hindi', flagCode: 'in' },
  { code: 'ur', label: 'UR', name: 'Urdu', flagCode: 'pk' },
  { code: 'bn', label: 'BN', name: 'Bengali', flagCode: 'bd' },
  { code: 'ug', label: 'UG', name: 'Uyghur / Dungan', flagCode: 'cn' },
  { code: 'tr', label: 'TR', name: 'Turkish', flagCode: 'tr' }
];

export function normalizeLanguageCode(code) {
  return supportedLanguages.some(language => language.code === code) ? code : 'en';
}

export function getStoredLanguage() {
  return normalizeLanguageCode(localStorage.getItem('lang'));
}

export function setStoredLanguage(code) {
  const normalizedCode = normalizeLanguageCode(code);
  localStorage.setItem('lang', normalizedCode);
  document.documentElement.lang = normalizedCode;
  return normalizedCode;
}

export function getLanguageName(code) {
  const normalizedCode = normalizeLanguageCode(code);
  return supportedLanguages.find(language => language.code === normalizedCode)?.name || normalizedCode.toUpperCase();
}

setStoredLanguage(getStoredLanguage());

/// <reference path="../../types/global.d.ts" />

import './style.css';
import { showError } from './error';
import { init } from './renderer';
import {
  initLanguage,
  setLanguage,
  getLanguage,
  getSupportedLanguages,
  applyTranslations,
  t,
} from '@/utils/i18n';

function setupLanguageSelector(): void {
  const selector = document.getElementById('lang-selector') as HTMLSelectElement;
  const langs = getSupportedLanguages();

  for (const lang of langs) {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.label;
    selector.appendChild(option);
  }

  selector.value = getLanguage();

  selector.addEventListener('change', async () => {
    await setLanguage(selector.value);
    applyTranslations();
    await init();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initLanguage();
    applyTranslations();
    setupLanguageSelector();
    await init();
  } catch (err) {
    console.error('Failed to start app:', err);
    showError(t('failedApp'));
  }
});

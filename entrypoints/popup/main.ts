/// <reference path="../../types/global.d.ts" />

import './style.css';
import { showError } from './error';
import { init } from './renderer';

document.addEventListener('DOMContentLoaded', () => {
  init().catch((err) => {
    console.error('Failed to start app:', err);
    showError('Failed to start the app.');
  });
});

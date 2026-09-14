import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { App } from './App.js';
import { initI18n } from './i18n/index.js';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No #root element to mount into');
}

/* Translations load before the first paint, so nothing flashes in the wrong language. */
await initI18n();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

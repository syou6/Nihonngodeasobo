import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App.tsx';
import { initMonitoring } from './lib/monitoring';
import { initAnalytics } from './lib/analytics';
import './index.css';
import './styles/mobile.css';

initMonitoring();
initAnalytics();

// Register the service worker (production only) for offline app-shell caching +
// push. The SW is network-first for HTML so it never serves a stale app.
if ('serviceWorker' in navigator && location.hostname === 'nihongo.amorjp.com') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('SW registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

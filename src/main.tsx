import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/uix-soft-premium-system.css';
import { ErrorBoundary } from './components/ErrorBoundary';

function scheduleObservabilityBootstrap() {
  const dsn = import.meta.env.VITE_SENTRY_DSN || '';
  if (!dsn) return;

  const bootstrap = async () => {
    try {
      const Sentry = await import('@sentry/react');
      Sentry.init({
        dsn,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
        ],
        tracesSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
    } catch {
      // Observability must never block storefront startup.
    }
  };

  const scheduleIdle = () => {
    const browser = window as any;

    if (typeof browser.requestIdleCallback === 'function') {
      browser.requestIdleCallback(
        () => { void bootstrap(); },
        { timeout: 2500 },
      );
      return;
    }

    window.setTimeout(() => { void bootstrap(); }, 1500);
  };

  if (document.readyState === 'complete') {
    scheduleIdle();
  } else {
    window.addEventListener('load', scheduleIdle, { once: true });
  }
}

scheduleObservabilityBootstrap();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA registration is non-critical for checkout and storefront browsing.
    });
  });
}

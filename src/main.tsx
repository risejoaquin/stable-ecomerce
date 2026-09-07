import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/uix-soft-premium-system.css';
import { ErrorBoundary } from './components/ErrorBoundary';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN || '';

if (sentryDsn) {
  const initializeSentry = async () => {
    const Sentry = await import('@sentry/react');

    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  };

  const scheduleSentryInitialization = () => {
    const run = () => {
      void initializeSentry().catch(() => {
        // Observability must never block storefront rendering.
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      window.setTimeout(run, 1500);
    }
  };

  if (document.readyState === 'complete') {
    scheduleSentryInitialization();
  } else {
    window.addEventListener('load', scheduleSentryInitialization, { once: true });
  }
}

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

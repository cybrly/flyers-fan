import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TeamProvider } from './teamContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TeamProvider>
      <App />
    </TeamProvider>
  </StrictMode>,
)

// Register the service worker for PWA install + offline shell.
// Only in production builds — the dev server has its own asset pipeline that
// would conflict with cache-first behavior.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[sw] registration failed:', err);
    });
  });
}

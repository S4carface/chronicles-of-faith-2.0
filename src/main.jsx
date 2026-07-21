import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Persistent caching for Home-critical artwork only — see public/sw.js.
// Production-only and registered after "load" so it never competes with the
// page's own initial fetches; a failed registration is a no-op, since this
// is a progressive enhancement on top of the in-memory preload the app
// already performs (see src/lib/preloadHomeAssets.js).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

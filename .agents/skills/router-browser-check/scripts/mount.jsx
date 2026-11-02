import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './fixture';
window.addEventListener('unhandledrejection', (event) => {
  window.__unhandled = [...(window.__unhandled ?? []), String(event.reason)];
  console.error('Unhandled rejection:', String(event.reason));
});
const container = document.getElementById('root');
if (window.__hydrate) hydrateRoot(container, <App hydrate />);
else createRoot(container).render(<App />);

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    })
    .catch(() => {});
  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => {
        for (const key of keys) {
          caches.delete(key).catch(() => {});
        }
      })
      .catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(<App />);

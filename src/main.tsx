import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './lib/AuthContext';
import { NotificationProvider } from './lib/NotificationContext';
import { Toaster } from 'sonner';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <App />
        <Toaster position="top-right" expand={false} richColors />
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>,
);

// Unregister legacy service workers to prevent stale cached asset white screen issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

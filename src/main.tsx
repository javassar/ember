// Entry point rendering the React application and registering PWA service worker.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { requestPersistentStorage } from './lib/storage';

import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/global.css';

// Request persistent storage on startup so browser does not evict local IndexedDB data
requestPersistentStorage().catch(() => {});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

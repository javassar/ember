// Entry point rendering the React application and registering PWA service worker.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

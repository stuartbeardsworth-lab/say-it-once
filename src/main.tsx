import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { startAndroidBackButton } from './platform/backButton';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

// Android's own Back button, inside the phone app only.
startAndroidBackButton();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

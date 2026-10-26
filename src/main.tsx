import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { blockInterfaceZoom } from './lib/touch';

// Gest dwóch palców ma powiększać mapę, a nie interfejs aplikacji
blockInterfaceZoom();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Falha ao encontrar elemento raiz com id "root"');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

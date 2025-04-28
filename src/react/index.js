import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import './style.css';

// Create a root for React to render into
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 
import React from 'react';
import ReactDOM from 'react-dom/client';
import Dashboard from './Dashboard';
import '../../index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Dashboard />
    </React.StrictMode>
  );
}

import React from 'react';
import Dashboard from './pages/Dashboard/Dashboard';
import ErrorBoundary from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary moduleName="WebXray Dashboard">
      <Dashboard />
    </ErrorBoundary>
  );
}

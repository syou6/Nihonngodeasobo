import React, { useEffect } from 'react';
import { AppPage } from './pages/AppPage';
import { useAuthStore } from './stores/authStore';

function App() {
  const { loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return <AppPage />;
}

export default App;

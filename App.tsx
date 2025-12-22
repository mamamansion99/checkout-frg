import React, { useMemo } from 'react';
import { CarReturnForm } from './components/CarReturnForm';
import { UrlParams } from './types';

const App: React.FC = () => {
  // Extract URL parameters safely
  const params: UrlParams = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return {
      flowId: searchParams.get('flowId'),
      taskId: searchParams.get('taskId'),
      roomId: searchParams.get('roomId'),
      assetType: searchParams.get('assetType'),
    };
  }, []);

  // Simple layout wrapper
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-indigo-900">Checkout Service</h1>
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">Asset Return</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CarReturnForm params={params} />
      </main>
    </div>
  );
};

export default App;

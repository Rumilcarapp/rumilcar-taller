import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useCashStore } from './store/useCashStore';

const App: React.FC = () => {
  useEffect(() => {
    // 1. One-time legacy mock storage cleanup
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('rumilcar-expenses-storage');
      }
    } catch (_) {}

    // 2. Initial rate fetch if autoRate is enabled
    const { autoRate, fetchAutoExchangeRate } = useCashStore.getState();
    if (autoRate) {
      fetchAutoExchangeRate();
    }

    // 3. Periodic rate refresh every 15 minutes (900,000 ms)
    const interval = setInterval(() => {
      const currentAuto = useCashStore.getState().autoRate;
      if (currentAuto) {
        useCashStore.getState().fetchAutoExchangeRate();
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return <RouterProvider router={router} />;
};

export default App;
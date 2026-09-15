import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useCashStore } from './store/useCashStore';
import { useClientStore } from './store/useClientStore';
import { useVehicleStore } from './store/useVehicleStore';
import { useWorkOrderStore } from './store/useWorkOrderStore';
import { usePersonnelStore } from './store/usePersonnelStore';
import { useWorkshopStore } from './store/useWorkshopStore';
import { getAuthToken } from './services/api';

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

    // 4. Initial Postgres cloud data sync if authenticated
    if (getAuthToken()) {
      useWorkshopStore.getState().fetchWorkshop().catch(() => {});
      usePersonnelStore.getState().fetchPersonnel().catch(() => {});
      useClientStore.getState().fetchClients().catch(() => {});
      useVehicleStore.getState().fetchVehicles().catch(() => {});
      useWorkOrderStore.getState().fetchWorkOrders().catch(() => {});
    }

    return () => clearInterval(interval);
  }, []);

  return <RouterProvider router={router} />;
};

export default App;
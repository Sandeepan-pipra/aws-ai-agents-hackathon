import React, { useEffect } from 'react';
import { Activity } from 'lucide-react';
import OrderServiceControl from './components/OrderServiceControl';
import OrchestratorTrigger from './components/OrchestratorTrigger';
import OrdersMonitor from './components/OrdersMonitor';
import NotificationDropdown from './components/NotificationDropdown';
import SystemStatusDropdown from './components/SystemStatusDropdown';
import TransportBookings from './components/TransportBookings';
import QuickGuide from './components/QuickGuide';
import { validateConfig } from './utils/config';
import { toast } from 'react-toastify';

function App() {
  useEffect(() => {
    // Validate configuration on mount
    const errors = validateConfig();
    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-600 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Logistics Control Panel
                </h1>
                <p className="text-sm text-gray-600">
                  Manage orders, orchestrate workflows, and monitor transport bookings
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SystemStatusDropdown />
              <NotificationDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column - Smaller */}
          <div className="lg:col-span-3 space-y-6">
            <OrderServiceControl />
            <OrchestratorTrigger />
            <QuickGuide />
          </div>

          {/* Orders Column - Larger */}
          <div className="lg:col-span-5">
            <OrdersMonitor />
          </div>

          {/* Transport Column - Larger */}
          <div className="lg:col-span-4">
            <TransportBookings />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            Logistics Control Panel v1.0.0 | Built with React + Vite | Deployed on AWS S3
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

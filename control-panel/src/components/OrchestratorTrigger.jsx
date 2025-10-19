import React, { useState, useEffect } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { processOrder, processPendingOrders } from '../services/lambdaApi';
import { toast } from 'react-toastify';
import { useNotifications } from '../hooks/useNotifications';

export default function OrchestratorTrigger() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { notifications } = useNotifications();

  useEffect(() => {
    const completionNotification = notifications.find(
      n => (n.event_type === 'batch_shipped' || n.event_type === 'transport_booked' || n.event_type === 'no_transport_needed')
    );
    if (completionNotification && isProcessing) {
      setIsProcessing(false);
      toast.success('Order processing completed!');
    }
  }, [notifications, isProcessing]);

  const handleProcessOrder = async () => {
    setIsProcessing(true);

    try {
      processOrder().catch(error => {
        console.error('Agent invocation failed:', error);
        toast.error('Failed to trigger orchestrator');
        setIsProcessing(false);
      });

      toast.success('Order processing initiated - agents working in background');

    } catch (error) {
      console.error('Failed to trigger orchestrator:', error);
      toast.error('Failed to trigger orchestrator');
      setIsProcessing(false);
    }
  };

  return (
    <div className="panel">
      <h2 className="panel-title">
        <Zap className="w-5 h-5" />
        Orchestrator Trigger
      </h2>

      <div className="space-y-4 py-1">

        <button
          onClick={handleProcessOrder}
          disabled={isProcessing}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Process Orders
            </>
          )}
        </button>
      </div>
    </div>
  );
}

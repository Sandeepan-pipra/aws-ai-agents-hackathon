import React from 'react';
import { Info } from 'lucide-react';

export default function QuickGuide() {
  return (
    <div className="panel">
      <h2 className="panel-title">
        <Info className="w-5 h-5" />
        Quick Guide
      </h2>

      <div className="space-y-2">
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-semibold mt-0.5">•</span>
            <span>Use Order Service to generate test orders</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-semibold mt-0.5">•</span>
            <span>Trigger orchestrator to process orders</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-semibold mt-0.5">•</span>
            <span>Monitor real-time order status</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

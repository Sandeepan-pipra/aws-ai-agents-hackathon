import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SystemStatusDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <span className="status-indicator-active" />
        <span className="text-sm text-gray-600">System Online</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">System Status</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Order API:</span>
                <span className="flex items-center gap-2">
                  <span className="status-indicator-active" />
                  <span className="font-medium text-gray-900">Connected</span>
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Lambda:</span>
                <span className="flex items-center gap-2">
                  <span className="status-indicator-active" />
                  <span className="font-medium text-gray-900">Configured</span>
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Polling:</span>
                <span className="flex items-center gap-2">
                  <span className="status-indicator-active" />
                  <span className="font-medium text-gray-900">Active</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Truck, Eye, Copy, RefreshCw } from 'lucide-react';
import { useTransportBookings } from '../hooks/useTransportBookings';
import Layout3DViewer from './Layout3DViewer';

export default function TransportBookings() {
  const { data: bookings = [], isLoading, isError, refetch } = useTransportBookings();
  const [selectedBooking, setSelectedBooking] = useState(null);

  const handleViewLayout = (booking) => {
    setSelectedBooking(booking);
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Use bookings from API (or mock data from service)
  const displayBookings = bookings;

  return (
    <>
      <div className="panel">
        <h2 className="panel-title">
          <Truck className="w-5 h-5" />
          Transport Bookings
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({displayBookings.length} bookings)
          </span>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="ml-auto p-1.5 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh bookings"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </h2>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading bookings...
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 mx-auto text-red-300 mb-3" />
              <p className="text-red-500 font-medium">Failed to load bookings</p>
              <p className="text-sm text-gray-400 mt-1">Please check your connection and try again</p>
            </div>
          ) : displayBookings.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No bookings yet</p>
              <p className="text-sm text-gray-400 mt-1">Transport bookings will appear here once created</p>
            </div>
          ) : (
            displayBookings && displayBookings.length > 0 && displayBookings.map((booking) => (
              <div
                key={booking.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm uppercase">
                      ID# : {booking.id.substring(0, 8)}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(booking.id)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Copy full ID"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleViewLayout(booking)}
                    className="btn-secondary flex items-center gap-2 text-sm"
                    disabled={!booking.s3LayoutKey}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    <span>{booking.vehicle?.type || 'Vehicle'}</span>
                  </div>
                  <div className="text-xs">
                    {booking.pickupAddress} → {booking.deliveryAddress}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{formatCurrency(booking.totalPrice || 0)}</span>
                    {booking.pickupDateTime && (
                      <span className="text-xs text-gray-500">
                        {new Date(booking.pickupDateTime).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Click "View 3D" to see packing layout for each booking
          </p>
        </div>
      </div>

      {selectedBooking && (
        <Layout3DViewer
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </>
  );
}

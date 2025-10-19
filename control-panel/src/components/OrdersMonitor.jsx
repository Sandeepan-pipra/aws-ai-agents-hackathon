import React, { useState, useMemo } from 'react';
import { Package, RefreshCw, Filter } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';

const STATUS_FILTERS = ['all', 'pending', 'shipped', 'delivered', 'cancelled'];

export default function OrdersMonitor() {
  const { data: orders = [], isLoading, refetch, isFetching } = useOrders();
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'badge-pending',
      shipped: 'badge-shipped',
      delivered: 'badge-delivered',
      cancelled: 'badge-cancelled',
    };
    return classes[status] || 'badge';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4">
        <h2 className="panel-title mb-0">
          <Package className="w-5 h-5" />
          Orders Monitor
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({filteredOrders.length} orders)
          </span>
        </h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw
            className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No {statusFilter !== 'all' ? statusFilter : ''} orders found
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      Order #{order.id}
                    </span>
                    <span className={getStatusBadgeClass(order.status)}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Route:</span> {order.source || 'N/A'}{' '}
                      → {order.destination || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span> $
                      {order.total_amount?.toFixed(2) || '0.00'}
                    </div>
                    <div>
                      <span className="font-medium">Items:</span>{' '}
                      {order.order_items?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(order.order_date)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

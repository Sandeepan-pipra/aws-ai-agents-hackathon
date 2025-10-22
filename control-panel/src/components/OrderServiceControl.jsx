import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Settings } from 'lucide-react';
import { createOrder, getProducts, getCustomers } from '../services/orderApi';
import { toast } from 'react-toastify';
import { generateIntelligentOrder } from '../utils/orderGenerator';

export default function OrderServiceControl() {
  const [isRunning, setIsRunning] = useState(false);
  const [ordersPerSecond, setOrdersPerSecond] = useState(1);
  const [ordersCreated, setOrdersCreated] = useState(0);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Load products and customers
    Promise.all([getProducts(), getCustomers()])
      .then(([productsData, customersData]) => {
        setProducts(productsData);
        setCustomers(customersData);
      })
      .catch((error) => {
        console.error('Failed to load products/customers:', error);
        toast.error('Failed to load initial data');
      });
  }, []);

  const generateRandomOrder = async () => {
    if (products.length === 0 || customers.length === 0) {
      toast.error('No products or customers available');
      return;
    }

    try {
      // Use intelligent order generator
      const orderData = generateIntelligentOrder(products, customers);

      await createOrder(orderData);
      setOrdersCreated((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error(`Failed to create order: ${error.message}`);
    }
  };

  const startOrderGeneration = () => {
    if (products.length === 0 || customers.length === 0) {
      toast.error('Please wait for products and customers to load');
      return;
    }

    setIsRunning(true);
    const interval = 1000 / ordersPerSecond;

    intervalRef.current = setInterval(() => {
      generateRandomOrder();
    }, interval);

    toast.success(`Order generation started at ${ordersPerSecond} orders/sec`);
  };

  const stopOrderGeneration = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    toast.info('Order generation stopped');
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="panel">
      <h2 className="panel-title">
        <Settings className="w-5 h-5" />
        Order Service Control
      </h2>
      <div className="flex justify-center gap-3">
        <button
          onClick={ generateRandomOrder }
          className="btn-success flex items-center gap-2 w-full justify-center"
          disabled={ products.length === 0 || customers.length === 0 }
        >
          <Play className="w-4 h-4" />
          Generate Order
        </button>
      </div>

      {/* <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Orders per Second
          </label>
          <input
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            value={ ordersPerSecond }
            onChange={ (e) => setOrdersPerSecond(parseFloat(e.target.value)) }
            disabled={ isRunning }
            className="input w-full"
          />
        </div>


        <div className="flex justify-center gap-3">
          { !isRunning ? (
            <button
              onClick={ startOrderGeneration }
              className="btn-success flex items-center gap-2"
              disabled={ products.length === 0 || customers.length === 0 }
            >
              <Play className="w-4 h-4" />
              Start Generation
            </button>
          ) : (
            <button
              onClick={ stopOrderGeneration }
              className="btn-danger flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Stop Generation
            </button>
          ) }
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <span className="flex items-center gap-2">
              <span
                className={
                  isRunning
                    ? 'status-indicator-active'
                    : 'status-indicator-inactive'
                }
              />
              { isRunning ? 'Running' : 'Stopped' }
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-600">Orders Created:</span>
            <span className="font-semibold">{ ordersCreated }</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-600">Rate:</span>
            <span className="font-semibold">{ ordersPerSecond } /sec</span>
          </div>
        </div>
      </div> */}
    </div>
  );
}

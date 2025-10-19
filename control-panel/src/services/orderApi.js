import axios from 'axios';
import { config } from '../utils/config';

const api = axios.create({
  baseURL: config.orderApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Orders
export const getOrders = async () => {
  const { data } = await api.get('/orders/');
  return data;
};

export const getOrder = async (id) => {
  const { data } = await api.get(`/orders/${id}`);
  return data;
};

export const createOrder = async (orderData) => {
  const { data } = await api.post('/orders/', orderData);
  return data;
};

export const updateOrderStatus = async (id, status) => {
  const { data } = await api.put(`/orders/${id}/status`, { status });
  return data;
};

// Products
export const getProducts = async () => {
  const { data } = await api.get('/products/');
  return data;
};

// Customers
export const getCustomers = async () => {
  const { data } = await api.get('/customers/');
  return data;
};

export default api;

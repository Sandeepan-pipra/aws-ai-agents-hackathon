import axios from 'axios';
import { config } from '../utils/config';

const api = axios.create({
  baseURL: config.transportApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getBookings = async () => {
  const { data } = await api.get('/bookings');
  return data;
};

export const getBooking = async (id) => {
  const { data } = await api.get(`/bookings/${id}`);
  return data;
};

export default api;

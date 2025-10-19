import axios from 'axios';

const NOTIFICATION_API_URL = import.meta.env.VITE_NOTIFICATION_API_URL || 'http://localhost:3002/api';

export const fetchNotifications = async (limit = 50) => {
  const response = await axios.get(`${NOTIFICATION_API_URL}/notifications`, {
    params: { limit }
  });
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await axios.patch(`${NOTIFICATION_API_URL}/notifications/${notificationId}/read`);
  return response.data;
};

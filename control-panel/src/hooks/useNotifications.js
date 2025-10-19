import { useState, useEffect } from 'react';
import { fetchNotifications } from '../services/notificationApi';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewedIds, setViewedIds] = useState(() => {
    const saved = localStorage.getItem('viewedNotifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [lastClearedTime, setLastClearedTime] = useState(() => {
    const saved = localStorage.getItem('lastClearedTime');
    return saved ? parseInt(saved) : 0;
  });

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await fetchNotifications(50);
      const filtered = data.filter(n => {
        const notificationTime = new Date(n.timestamp || n.received_at).getTime();
        return notificationTime > lastClearedTime;
      });
      setNotifications(filtered);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsViewed = () => {
    const ids = notifications.map(n => n.id);
    const newViewedIds = [...viewedIds, ...ids];
    setViewedIds(newViewedIds);
    localStorage.setItem('viewedNotifications', JSON.stringify(newViewedIds));
  };

  const clearAll = () => {
    const now = Date.now();
    setLastClearedTime(now);
    localStorage.setItem('lastClearedTime', now.toString());
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !viewedIds.includes(n.id)).length;

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, [lastClearedTime]);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: loadNotifications,
    markAsViewed,
    clearAll,
  };
};


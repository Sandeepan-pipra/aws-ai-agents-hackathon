import { useQuery } from '@tanstack/react-query';
import { getBookings } from '../services/transportApi';
import { config } from '../utils/config';

export const useTransportBookings = () => {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: getBookings,
    refetchInterval: config.pollingInterval,
    retry: 2,
    onError: (error) => {
      console.error('Failed to fetch bookings:', error);
    }
  });
};

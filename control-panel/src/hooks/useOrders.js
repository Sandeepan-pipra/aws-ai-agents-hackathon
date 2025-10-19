import { useQuery } from '@tanstack/react-query';
import { getOrders } from '../services/orderApi';
import { config } from '../utils/config';

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
    refetchInterval: config.pollingInterval,
  });
};

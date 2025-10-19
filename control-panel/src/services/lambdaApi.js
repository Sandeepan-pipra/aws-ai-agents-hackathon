import axios from 'axios';
import { config } from '../utils/config';

const api = axios.create({
  baseURL: config.lambdaApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const invokeOrchestrator = async (prompt) => {
  const { data } = await api.post('/', {
    prompt,
    agentRuntimeArn: config.orchestratorArn,
  });
  return data;
};

export const processOrder = async () => {
  return invokeOrchestrator(`Process all pending orders`);
};

export const processPendingOrders = async (limit = 10) => {
  return invokeOrchestrator(`Process the next ${limit} pending orders`);
};

export default api;

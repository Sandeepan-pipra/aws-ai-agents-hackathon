// Configuration from environment variables
export const config = {
  // API URLs
  orderApiUrl: import.meta.env.VITE_ORDER_API_URL || 'http://YOUR_EC2_IP/api/orders',
  lambdaApiUrl: import.meta.env.VITE_LAMBDA_API_URL || 'https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com',
  transportApiUrl: import.meta.env.VITE_TRANSPORT_API_URL || 'http://YOUR_EC2_IP/api/transport',

  // AWS Configuration
  orchestratorArn: import.meta.env.VITE_ORCHESTRATOR_ARN || 'arn:aws:bedrock-agentcore:us-east-1:YOUR_ACCOUNT_ID:runtime/orchestrator_agent-YOUR_RUNTIME_ID',
  s3BucketUrl: import.meta.env.VITE_S3_BUCKET_URL || '',
  layoutApiUrl: import.meta.env.VITE_LAYOUT_API_URL || 'https://qfp20jgp2i.execute-api.us-east-1.amazonaws.com/prod',

  // Polling Configuration
  pollingInterval: parseInt(import.meta.env.VITE_POLLING_INTERVAL || '5000', 10),

  // Feature Flags
  enable3DViewer: import.meta.env.VITE_ENABLE_3D_VIEWER !== 'false',
};

// Validate required config
export const validateConfig = () => {
  const errors = [];

  if (!config.orderApiUrl) {
    errors.push('VITE_ORDER_API_URL is required');
  }

  if (!config.lambdaApiUrl) {
    console.warn('VITE_LAMBDA_API_URL not set - orchestrator trigger will not work');
  }

  return errors;
};

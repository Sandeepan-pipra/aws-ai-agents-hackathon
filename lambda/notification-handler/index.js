const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.NOTIFICATIONS_BUCKET || 'logistics-notifications';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));

    if (event.Records && event.Records[0]?.EventSource === 'aws:sns') {
      return await handleSNSNotification(event);
    }

    if (event.httpMethod) {
      return await handleAPIRequest(event);
    }

    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid event type' }) };
  } catch (error) {
    console.error('Unhandled error:', error);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};

async function handleSNSNotification(event) {
  try {
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const timestamp = new Date().toISOString();
    const notificationId = `${timestamp}-${snsMessage.order_id || snsMessage.batch_id || Date.now()}`;

    const notification = {
      id: notificationId,
      ...snsMessage,
      received_at: timestamp,
    };

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `notifications/${notificationId}.json`,
      Body: JSON.stringify(notification),
      ContentType: 'application/json',
    }));

    console.log('Notification stored:', notificationId);
    return { statusCode: 200, body: JSON.stringify({ success: true, id: notificationId }) };
  } catch (error) {
    console.error('Error storing notification:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}

async function handleAPIRequest(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod === 'GET') {
    try {
      const limit = parseInt(event.queryStringParameters?.limit || '50');
      
      const listResponse = await s3Client.send(new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: 'notifications/',
        MaxKeys: limit,
      }));

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify([]) };
      }

      // Sort by last modified (newest first) and get objects
      const sortedKeys = listResponse.Contents
        .sort((a, b) => b.LastModified - a.LastModified)
        .slice(0, limit)
        .map(obj => obj.Key);

      const notifications = await Promise.all(
        sortedKeys.map(async (key) => {
          const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
          }));
          const body = await response.Body.transformToString();
          return JSON.parse(body);
        })
      );

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(notifications) };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
}

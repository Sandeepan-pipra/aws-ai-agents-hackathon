const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.LAYOUTS_BUCKET || 'logistics-packing-layouts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  try {
    return await handleRequest(event);
  } catch (error) {
    console.error('Unhandled error:', error);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };
  }
};

async function handleRequest(event) {
  const headers = corsHeaders;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    try {
      const s3Key = event.queryStringParameters?.key;
      
      if (!s3Key) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing key parameter' }),
        };
      }

      const response = await s3Client.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      }));

      const body = await response.Body.transformToString();
      
      return {
        statusCode: 200,
        headers,
        body: body,
      };
    } catch (error) {
      console.error('Error fetching layout:', error);
      
      if (error.name === 'NoSuchKey') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Layout not found' }),
        };
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
}

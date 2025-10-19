const { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } = require('@aws-sdk/client-bedrock-agentcore');

const client = new BedrockAgentCoreClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Helper function to read stream response from Bedrock Agent Runtime
async function readStreamResponse(stream) {
  let finalResponse = '';
  let completion = '';

  for await (const event of stream) {
    // Handle different event types from the stream
    if (event.chunk) {
      // Chunk events contain the actual response content
      if (event.chunk.bytes) {
        const chunkText = Buffer.from(event.chunk.bytes).toString('utf-8');
        finalResponse += chunkText;
      }
    } else if (event.trace) {
      // Trace events contain debug information (optional)
      console.log('Trace:', JSON.stringify(event.trace));
    } else if (event.returnControl) {
      // Return control events for actions requiring additional input
      console.log('Return control:', JSON.stringify(event.returnControl));
    } else if (event.internalServerException || event.validationException || event.resourceNotFoundException) {
      // Handle exceptions
      const errorType = Object.keys(event)[0];
      throw new Error(`Agent error: ${errorType} - ${JSON.stringify(event[errorType])}`);
    }
  }

  return finalResponse;
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

exports.handler = async (event) => {
  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { prompt, agentRuntimeArn } = body;

    if (!prompt || !agentRuntimeArn) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields: prompt, agentRuntimeArn' })
      };
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const payload = JSON.stringify({ prompt });

    const command = new InvokeAgentRuntimeCommand({
      agentRuntimeArn,
      runtimeSessionId: sessionId,
      payload
    });

    // Invoke agent asynchronously - don't wait for completion
    client.send(command).catch(err => {
      console.error('Agent invocation error:', err);
    });

    // Return immediately
    return {
      statusCode: 202,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Agent invocation started',
        sessionId: sessionId,
        status: 'processing'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};

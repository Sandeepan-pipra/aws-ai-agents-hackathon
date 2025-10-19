# Lambda Agent Trigger

Serverless function to trigger Bedrock agents from UI controls.

## Architecture

```
UI → API Gateway → Lambda → Bedrock Agent Runtime → Agent
```

## Quick Deploy

```bash
cd lambda/agent-trigger
./deploy.sh
```

This creates:
- Lambda function: `logistics-agent-trigger`
- API Gateway HTTP API: `logistics-agent-api`
- IAM role with Bedrock permissions

## API Usage

**Endpoint:** `https://{api-id}.execute-api.{region}.amazonaws.com`

**Request:**
```bash
curl -X POST https://<YOUR_API_GATEWAY_ID>.execute-api.us-east-1.amazonaws.com \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Check available vehicles for 2024-12-25",
    "agentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:<YOUR_ACCOUNT_ID>:runtime/<YOUR_AGENT_NAME>"
  }'
```

**Response:**
```json
{
  "response": "I've found available trucks...",
  "sessionId": "session-1234567890"
}
```

## UI Integration

### React Example
```javascript
const triggerAgent = async (prompt) => {
  const response = await fetch('https://<YOUR_API_GATEWAY_ID>.execute-api.us-east-1.amazonaws.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      agentRuntimeArn: process.env.REACT_APP_AGENT_RUNTIME_ARN
    })
  });
  return await response.json();
};
```

### HTML/JavaScript
See `ui-example.html` for a complete working example.

## Cost Estimate (10 users)

- Lambda: ~$0.20/month (1000 invocations)
- API Gateway: ~$1/month
- Bedrock: Pay per token usage

**Total: ~$1-5/month**

## Environment Variables

Set in Lambda console if needed:
- `AWS_REGION`: Default is us-east-1
- `AGENT_ID`: Optional default agent ID
- `AGENT_ALIAS_ID`: Optional default alias ID

## Permissions

Lambda role has:
- CloudWatch Logs write access
- Bedrock InvokeAgent permission

## Testing

```bash
# After deployment, test with:
curl -X POST $(aws apigatewayv2 get-apis --query "Items[?Name=='logistics-agent-api'].ApiEndpoint" --output text) \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"test","agentId":"YOUR_ID","agentAliasId":"YOUR_ALIAS"}'
```

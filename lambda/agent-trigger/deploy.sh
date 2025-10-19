#!/bin/bash
set -e

FUNCTION_NAME="logistics-agent-trigger"
REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "📦 Installing dependencies..."
npm install --production

echo "📦 Creating deployment package..."
zip -r function.zip index.js node_modules/ package.json

echo "🔐 Creating IAM role..."
cat > /tmp/lambda-trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name LogisticsAgentLambdaRole \
  --assume-role-policy-document file:///tmp/lambda-trust.json \
  2>/dev/null || echo "Role already exists"

cat > /tmp/lambda-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/lambda/${FUNCTION_NAME}:*"
    },
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeAgent"],
      "Resource": "arn:aws:bedrock:${REGION}:${ACCOUNT_ID}:agent/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name LogisticsAgentLambdaRole \
  --policy-name LogisticsAgentLambdaPolicy \
  --policy-document file:///tmp/lambda-policy.json

sleep 10

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/LogisticsAgentLambdaRole"

echo "🚀 Creating Lambda function..."
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime nodejs20.x \
  --role $ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 256 \
  --region $REGION \
  2>/dev/null || \
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://function.zip \
  --region $REGION

echo "🌐 Creating API Gateway..."
API_ID=$(aws apigatewayv2 create-api \
  --name logistics-agent-api \
  --protocol-type HTTP \
  --target "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}" \
  --query ApiId --output text 2>/dev/null || \
  aws apigatewayv2 get-apis --query "Items[?Name=='logistics-agent-api'].ApiId" --output text)

aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
  2>/dev/null || echo "Permission already exists"

API_ENDPOINT="https://${API_ID}.execute-api.${REGION}.amazonaws.com"

echo ""
echo "✅ Deployment complete!"
echo "📍 API Endpoint: ${API_ENDPOINT}"
echo ""
echo "Test with:"
echo "curl -X POST ${API_ENDPOINT} \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"prompt\":\"Book a truck\",\"agentId\":\"YOUR_AGENT_ID\",\"agentAliasId\":\"YOUR_ALIAS_ID\"}'"

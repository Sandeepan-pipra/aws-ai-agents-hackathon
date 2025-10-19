#!/bin/bash

set -e

FUNCTION_NAME="logistics-notification-handler"
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/lambda-s3-sns-role"
BUCKET_NAME="logistics-notifications"
SNS_TOPIC_ARN="arn:aws:sns:$REGION:$ACCOUNT_ID:logistics-notifications"

echo "=== Logistics Notification Handler Setup ==="
echo ""

# Verify SNS topic exists
echo "Verifying SNS topic..."
if aws sns get-topic-attributes --topic-arn $SNS_TOPIC_ARN --region $REGION > /dev/null 2>&1; then
  echo "✓ SNS topic exists: $SNS_TOPIC_ARN"
else
  echo "⚠ SNS topic does not exist. Creating..."
  aws sns create-topic --name logistics-notifications --region $REGION
  echo "✓ SNS topic created"
fi
echo ""

# Step 1: Create S3 bucket
echo "Step 1: Creating S3 bucket..."
if aws s3 ls "s3://$BUCKET_NAME" 2>/dev/null; then
  echo "✓ Bucket already exists"
else
  aws s3 mb "s3://$BUCKET_NAME" --region $REGION
  echo "✓ Bucket created"
fi

# Step 2: Deploy Lambda
echo ""
echo "Step 2: Deploying Lambda function..."
npm install
zip -r function.zip index.js node_modules/ package.json

if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION > /dev/null
  echo "✓ Lambda function updated"
else
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs20.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --memory-size 256 \
    --environment "Variables={NOTIFICATIONS_BUCKET=$BUCKET_NAME}" \
    --region $REGION > /dev/null
  echo "✓ Lambda function created"
fi

LAMBDA_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)

# Step 3: Subscribe Lambda to SNS
echo ""
echo "Step 3: Subscribing Lambda to SNS topic..."
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id sns-invoke \
  --action lambda:InvokeFunction \
  --principal sns.amazonaws.com \
  --source-arn $SNS_TOPIC_ARN \
  --region $REGION 2>/dev/null || echo "✓ Permission already exists"

aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol lambda \
  --notification-endpoint $LAMBDA_ARN \
  --region $REGION > /dev/null
echo "✓ Lambda subscribed to SNS"

# Step 4: Create API Gateway
echo ""
echo "Step 4: Setting up API Gateway..."

API_ID=$(aws apigateway get-rest-apis --query "items[?name=='Logistics Notifications API'].id" --output text)

if [ -z "$API_ID" ]; then
  API_ID=$(aws apigateway create-rest-api \
    --name "Logistics Notifications API" \
    --description "API for fetching logistics notifications" \
    --query 'id' --output text)
  echo "✓ API created"
else
  echo "✓ API already exists"
fi

ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)

RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/notifications'].id" --output text)

if [ -z "$RESOURCE_ID" ]; then
  RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part notifications \
    --query 'id' --output text)
fi

aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE 2>/dev/null || true

aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE 2>/dev/null || true

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" 2>/dev/null || true

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" 2>/dev/null || true

aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true,"method.response.header.Access-Control-Allow-Origin":true}' 2>/dev/null || true

aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":true}' 2>/dev/null || true

aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod > /dev/null 2>&1 || true

aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/notifications" \
  --region $REGION 2>/dev/null || echo "✓ API Gateway permission already exists"

API_ENDPOINT="https://$API_ID.execute-api.$REGION.amazonaws.com/prod"

echo "✓ API Gateway configured"
echo ""
echo "=== Setup Complete! ==="
echo ""
echo "API Endpoint: $API_ENDPOINT/notifications"
echo ""
echo "Update your control-panel/.env file with:"
echo "VITE_NOTIFICATION_API_URL=$API_ENDPOINT"
echo ""
echo "Test the setup:"
echo "curl \"$API_ENDPOINT/notifications?limit=10\""

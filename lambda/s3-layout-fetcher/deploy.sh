#!/bin/bash

FUNCTION_NAME="s3-layout-fetcher"
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/lambda-s3-sns-role"
BUCKET_NAME="logistics-packing-layouts"

echo "Installing dependencies..."
npm install

echo "Creating deployment package..."
zip -r function.zip index.js node_modules/ package.json

if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "Updating Lambda..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION
else
  echo "Creating Lambda..."
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs20.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --memory-size 256 \
    --environment "Variables={LAYOUTS_BUCKET=$BUCKET_NAME}" \
    --region $REGION
fi

LAMBDA_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)

# Create/Update API Gateway
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='Logistics API'].id" --output text)

if [ -z "$API_ID" ]; then
  API_ID=$(aws apigateway create-rest-api \
    --name "Logistics API" \
    --query 'id' --output text)
fi

ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)

# Create /layouts resource
RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/layouts'].id" --output text)

if [ -z "$RESOURCE_ID" ]; then
  RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part layouts \
    --query 'id' --output text)
fi

# Add GET method
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

# Integrate with Lambda
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

# Deploy
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod > /dev/null 2>&1 || true

# Add permission
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/layouts" \
  --region $REGION 2>/dev/null || true

API_ENDPOINT="https://$API_ID.execute-api.$REGION.amazonaws.com/prod"

echo ""
echo "=== Deployment Complete ==="
echo "API Endpoint: $API_ENDPOINT/layouts?key=layouts/batch-123.json"
echo ""
echo "Update control-panel/.env:"
echo "VITE_LAYOUT_API_URL=$API_ENDPOINT"

#!/bin/bash

FUNCTION_NAME="logistics-notification-handler"
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/lambda-execution-role"
BUCKET_NAME="logistics-notifications"

echo "Installing dependencies..."
npm install

echo "Creating deployment package..."
zip -r function.zip index.js node_modules/ package.json

echo "Checking if Lambda function exists..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION
else
  echo "Creating new Lambda function..."
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs20.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --memory-size 256 \
    --environment "Variables={NOTIFICATIONS_BUCKET=$BUCKET_NAME,AWS_REGION=$REGION}" \
    --region $REGION
fi

echo "Updating environment variables..."
aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --environment "Variables={NOTIFICATIONS_BUCKET=$BUCKET_NAME,AWS_REGION=$REGION}" \
  --region $REGION

echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Create S3 bucket: aws s3 mb s3://$BUCKET_NAME"
echo "2. Subscribe Lambda to SNS: aws sns subscribe --topic-arn <SNS_TOPIC_ARN> --protocol lambda --notification-endpoint <LAMBDA_ARN>"
echo "3. Add Lambda permission: aws lambda add-permission --function-name $FUNCTION_NAME --statement-id sns-invoke --action lambda:InvokeFunction --principal sns.amazonaws.com --source-arn <SNS_TOPIC_ARN>"
echo "4. Create API Gateway endpoint for GET /notifications"

#!/bin/bash

FUNCTION_NAME="agent-trigger"

echo "Packaging Lambda function..."
zip -r function.zip index.js node_modules/

echo "Updating Lambda function code..."
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://function.zip

echo "Waiting for update to complete..."
aws lambda wait function-updated --function-name $FUNCTION_NAME

echo "Lambda function updated successfully!"
rm function.zip

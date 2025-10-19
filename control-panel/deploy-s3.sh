#!/bin/bash

# S3 Static Website Deployment Script
# Usage: ./deploy-s3.sh <bucket-name>

BUCKET_NAME=${1:-logistics-control-panel}

echo "Building React app..."
npm run build

echo "Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region us-east-1 2>/dev/null || echo "Bucket exists"

echo "Configuring bucket for static website hosting..."
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

echo "Setting bucket policy for public read access..."
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
  }]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/bucket-policy.json

echo "Uploading files to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete --cache-control "max-age=31536000,public" --exclude "index.html"
aws s3 cp dist/index.html s3://$BUCKET_NAME/index.html --cache-control "max-age=0,no-cache,no-store,must-revalidate"

echo "Deployment complete!"
echo "Website URL: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"

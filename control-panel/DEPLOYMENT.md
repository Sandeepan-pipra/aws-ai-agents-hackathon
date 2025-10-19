# Control Panel S3 Deployment Guide

## Quick Deploy

```bash
chmod +x deploy-s3.sh
./deploy-s3.sh logistics-control-panel-ui
```

## Manual Steps

### 1. Build the app
```bash
npm run build
```

### 2. Create S3 bucket
```bash
aws s3 mb s3://logistics-control-panel-ui --region us-east-1
```

### 3. Enable static website hosting
```bash
aws s3 website s3://logistics-control-panel-ui \
  --index-document index.html \
  --error-document index.html
```

### 4. Set bucket policy (public access)
```bash
aws s3api put-bucket-policy --bucket logistics-control-panel-ui --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::logistics-control-panel-ui/*"
  }]
}'
```

### 5. Upload files
```bash
aws s3 sync dist/ s3://logistics-control-panel-ui --delete
```

### 6. Access your site
```
http://logistics-control-panel-ui.s3-website-us-east-1.amazonaws.com
```

## CloudFront (Optional - for HTTPS & CDN)

### 1. Create CloudFront distribution
```bash
aws cloudfront create-distribution \
  --origin-domain-name logistics-control-panel-ui.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html
```

### 2. Configure custom error responses
- 403 → /index.html (for SPA routing)
- 404 → /index.html (for SPA routing)

## Environment Variables

Update `src/utils/config.js` before building:
```javascript
export const config = {
  apiBaseUrl: 'http://<YOUR_EC2_IP>/api/',
  s3BucketUrl: 'https://<YOUR_S3_BUCKET>.s3.amazonaws.com'
};
```

## CORS Configuration

If API is on different domain, configure CORS on API Gateway/ALB:

```json
{
  "AllowOrigins": ["http://<YOUR_S3_BUCKET>.s3-website-us-east-1.amazonaws.com"],
  "AllowMethods": ["GET", "POST", "PUT", "PATCH", "DELETE"],
  "AllowHeaders": ["Content-Type", "Authorization"]
}
```

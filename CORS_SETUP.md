# CORS Configuration for EC2 APIs

## What's Configured

CORS is enabled at 3 levels for maximum compatibility:

### 1. Transport API (Node.js/Express)
**File:** `transport_api/src/app.js`

Install cors package:
```bash
cd transport_api
npm install cors
```

Already added in code:
```javascript
const cors = require('cors');
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 2. Order API (Python/FastAPI)
**File:** `order_api/main.py`

Already added in code:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Nginx (Reverse Proxy)
**File:** `/etc/nginx/sites-available/logistics`

Already added in deployment workflow:
```nginx
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

if ($request_method = 'OPTIONS') {
    return 204;
}
```

## Deploy to EC2

```bash
# 1. Install cors package
ssh -i ~/.ssh/<YOUR_KEY_NAME>.pem ubuntu@<YOUR_EC2_IP>
cd /home/ubuntu/logistics/transport_api
npm install cors

# 2. Restart services
pm2 restart all

# 3. Update Nginx config (already in DEPLOYMENT_WORKFLOW.md Step 13)
sudo nano /etc/nginx/sites-available/logistics
# Add CORS headers as shown above
sudo nginx -t
sudo systemctl restart nginx

# 4. Test CORS
curl -H "Origin: http://<YOUR_S3_BUCKET>.s3-website-us-east-1.amazonaws.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://<YOUR_EC2_IP>/api/orders/ -v
```

## Verify CORS

```bash
# Should see Access-Control-Allow-Origin header
curl -I http://<YOUR_EC2_IP>/api/orders/
curl -I http://<YOUR_EC2_IP>/api/transport/vehicles
```

## Restrict Origins (Production)

Change `*` to specific S3 URL:

```javascript
// transport_api/src/app.js
origin: 'http://<YOUR_S3_BUCKET>.s3-website-us-east-1.amazonaws.com'
```

```python
# order_api/main.py
allow_origins=["http://<YOUR_S3_BUCKET>.s3-website-us-east-1.amazonaws.com"]
```

```nginx
# /etc/nginx/sites-available/logistics
add_header 'Access-Control-Allow-Origin' 'http://<YOUR_S3_BUCKET>.s3-website-us-east-1.amazonaws.com' always;
```

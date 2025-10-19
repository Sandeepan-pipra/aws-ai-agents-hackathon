# Logistics Control Panel

A modern, responsive control panel for managing logistics operations, built with React and designed to be deployed as a static site on AWS S3.

## Features

### 1. Order Service Control
- Generate test orders at configurable rates (orders/sec)
- Start/Stop order generation
- Real-time statistics (orders created, current rate)
- Auto-generates realistic order data with products, customers, and routes

### 2. Orchestrator Trigger
- Manually trigger the orchestrator agent via Lambda + API Gateway
- Process single orders by ID
- Batch process pending orders
- View real-time orchestrator responses

### 3. Orders Monitor
- Live-updating list of all orders (auto-refresh every 5s)
- Filter by status (pending, shipped, delivered, cancelled)
- View order details (items, route, amount, timestamp)
- Visual status indicators

### 4. Notifications Panel
- Real-time notification feed
- Event types: transport_booked, no_transport_needed, errors
- Auto-scroll to latest notifications
- Detailed event information

### 5. Transport Bookings
- View all transport bookings
- Booking details (vehicle type, route, cost)
- Associated order IDs
- Click to view 3D packing layout

### 6. 3D Layout Viewer
- Interactive 3D visualization of packing layouts
- Three.js powered rendering
- Rotate, pan, and zoom controls
- Fullscreen mode
- Loads layouts from S3 or displays mock data

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **React Query** - Server state management and auto-refresh
- **Axios** - HTTP client
- **Three.js** - 3D visualization
- **Lucide React** - Icon library
- **React Toastify** - Toast notifications

## Prerequisites

- Node.js 18+ and npm/pnpm
- Access to Order API (FastAPI backend)
- Lambda + API Gateway endpoint for orchestrator
- (Optional) Transport API endpoint
- (Optional) S3 bucket with 3D layout data

## Getting Started

### 1. Install Dependencies

```bash
cd control-panel
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# API Endpoints
VITE_ORDER_API_URL=http://localhost:8000/api
VITE_LAMBDA_API_URL=https://your-api-gateway.execute-api.us-east-1.amazonaws.com/prod
VITE_TRANSPORT_API_URL=http://your-transport-api/api

# AWS Configuration
VITE_ORCHESTRATOR_ARN=arn:aws:bedrock-agentcore:us-east-1:YOUR_ACCOUNT:runtime/orchestrator_agent-XXX
VITE_S3_BUCKET_URL=https://your-bucket.s3.amazonaws.com

# Polling Configuration
VITE_POLLING_INTERVAL=5000

# Feature Flags
VITE_ENABLE_3D_VIEWER=true
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Building for Production

### Build the Application

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment to AWS S3

### Option 1: Manual Deployment

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Create S3 bucket:**
   ```bash
   aws s3 mb s3://logistics-control-panel
   ```

3. **Enable static website hosting:**
   ```bash
   aws s3 website s3://logistics-control-panel \
     --index-document index.html \
     --error-document index.html
   ```

4. **Upload files:**
   ```bash
   aws s3 sync dist/ s3://logistics-control-panel/ --delete
   ```

5. **Set bucket policy for public access:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::logistics-control-panel/*"
       }
     ]
   }
   ```

   Apply policy:
   ```bash
   aws s3api put-bucket-policy \
     --bucket logistics-control-panel \
     --policy file://bucket-policy.json
   ```

6. **Access your app:**
   ```
   http://logistics-control-panel.s3-website-us-east-1.amazonaws.com
   ```

### Option 2: Deploy with CloudFront (Recommended)

CloudFront provides HTTPS, custom domain, and better performance.

1. **Create CloudFront distribution:**
   - Origin: Your S3 bucket website endpoint
   - Default Root Object: `index.html`
   - Error Pages: 404 → `/index.html` (for SPA routing)

2. **Update bucket policy** to allow CloudFront access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "CloudFrontAccess",
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity YOUR_OAI_ID"
         },
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::logistics-control-panel/*"
       }
     ]
   }
   ```

3. **Configure custom domain (optional):**
   - Add CNAME record in Route 53 or your DNS provider
   - Add SSL certificate via AWS Certificate Manager

### Option 3: Automated Deployment

Use the npm script:

```bash
npm run deploy
```

This builds and syncs to S3 in one command (requires AWS CLI configured).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Control Panel (S3)                       │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Order      │  │ Orchestrator │  │   Orders     │    │
│  │   Service    │  │   Trigger    │  │   Monitor    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Notifications│  │  Transport   │  │  3D Layout   │    │
│  │    Panel     │  │  Bookings    │  │   Viewer     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
    Order API       Lambda/API Gateway   Transport API
```

## Project Structure

```
control-panel/
├── src/
│   ├── components/           # React components
│   │   ├── OrderServiceControl.jsx
│   │   ├── OrchestratorTrigger.jsx
│   │   ├── OrdersMonitor.jsx
│   │   ├── NotificationsPanel.jsx
│   │   ├── TransportBookings.jsx
│   │   └── Layout3DViewer.jsx
│   ├── services/            # API clients
│   │   ├── orderApi.js
│   │   ├── lambdaApi.js
│   │   └── transportApi.js
│   ├── hooks/               # Custom React hooks
│   │   ├── useOrders.js
│   │   ├── useTransportBookings.js
│   │   └── useNotifications.js
│   ├── utils/               # Utilities
│   │   └── config.js
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html               # HTML template
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## API Integration

### Order API Endpoints
- `GET /orders` - List all orders
- `GET /orders/{id}` - Get order details
- `POST /orders` - Create new order
- `PUT /orders/{id}/status` - Update order status
- `GET /products` - List products
- `GET /customers` - List customers

### Lambda API Gateway
- `POST /` - Invoke orchestrator agent
  ```json
  {
    "prompt": "Process order 123",
    "agentRuntimeArn": "arn:aws:bedrock-agentcore:..."
  }
  ```

### Transport API (Optional)
- `GET /bookings` - List transport bookings
- `GET /bookings/{id}` - Get booking details

## Configuration Options

### Polling Interval
Adjust auto-refresh rate in `.env`:
```env
VITE_POLLING_INTERVAL=5000  # milliseconds
```

### Disable 3D Viewer
If Three.js is not needed:
```env
VITE_ENABLE_3D_VIEWER=false
```

## CORS Configuration

Ensure all backend APIs have CORS enabled for your deployment domain:

**FastAPI (Order API):**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Lambda API Gateway:**
- Enable CORS in API Gateway console
- Add `Access-Control-Allow-Origin: *` header

## Troubleshooting

### Orders not loading
- Check Order API URL in `.env`
- Verify API is accessible and CORS is enabled
- Check browser console for errors

### Orchestrator not working
- Verify Lambda API Gateway URL
- Check orchestrator ARN is correct
- Ensure Lambda has proper IAM permissions

### 3D Viewer not working
- Check `VITE_ENABLE_3D_VIEWER=true`
- Verify S3 bucket URL is correct
- Check layout JSON format matches expected schema

### Build fails
- Clear node_modules: `rm -rf node_modules package-lock.json`
- Reinstall: `npm install`
- Check Node.js version (18+ required)

## Development Tips

### Hot Module Replacement
Vite provides instant HMR - changes appear immediately without full reload.

### React DevTools
Install React DevTools browser extension for debugging.

### API Testing
Use browser console to test API calls:
```javascript
fetch('http://your-api/orders').then(r => r.json()).then(console.log)
```

### Mock Data
Components gracefully handle missing APIs with mock data for development.

## Performance

- **Bundle Size**: ~500KB (gzipped)
- **Load Time**: < 2s on 3G
- **Auto-refresh**: Configurable polling interval
- **Caching**: React Query handles intelligent caching

## Security Notes

- No sensitive data stored in frontend
- API keys should be handled by backend services
- CORS properly configured on all APIs
- S3 bucket policy limits to read-only access

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Advanced filtering and search
- [ ] Export data to CSV/Excel
- [ ] User authentication
- [ ] Dashboard analytics
- [ ] Mobile app version

## License

MIT

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review backend API logs
3. Check browser console for errors
4. Verify environment configuration

---

**Built with ❤️ for logistics management**

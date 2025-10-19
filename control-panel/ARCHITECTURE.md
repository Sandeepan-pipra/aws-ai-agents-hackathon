# Logistics Control Panel - Architecture

## Overview
This is a static web application designed to be deployed to AWS S3, providing a control interface for the logistics management system.

## Technology Stack
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Axios** - HTTP client
- **React Query** - Server state management and polling
- **Lucide React** - Icons
- **Three.js** - 3D visualization (for viewing packing layouts)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│        Control Panel (S3) - Sticky Header with 🔔          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │ Order  │  │     Orders       │  │   Transport     │   │
│  │Service │  │     Monitor      │  │   Bookings      │   │
│  │Control │  │    (Larger)      │  │   (Larger)      │   │
│  │        │  │                  │  │                 │   │
│  ├────────┤  └──────────────────┘  └─────────────────┘   │
│  │Orch.   │         (5/12)              (4/12)            │
│  │Trigger │                                                │
│  └────────┘                                                │
│   (3/12)                                                   │
│                                                             │
│  Modal: 3D Layout Viewer (Integrated Three.js)            │
└─────────────────────────────────────────────────────────────┘
         │                  │                  │
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Order API     │  │ Lambda +        │  │  Transport API  │
│   (FastAPI)     │  │ API Gateway     │  │  (Node.js)      │
│   + Mock Data   │  │                 │  │  + Mock Data    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   SQLite DB     │  │  Orchestrator   │  │   Prisma DB     │
│                 │  │     Agent       │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │     SNS     │
                     │ Notifications│
                     └─────────────┘
```

## Components

### 1. Order Service Control
**Purpose**: Generate orders at a configurable rate for load testing
**Features**:
- Rate configuration (orders/sec)
- Start/Stop control
- Status display (orders created, rate)
- Source/destination selection
**API**: POST to Order API `/orders`

### 2. Orchestrator Trigger
**Purpose**: Manually trigger the orchestrator agent
**Features**:
- Single order processing
- Batch order processing
- Order ID input
- Response display
**API**: POST to Lambda via API Gateway

### 3. Orders Monitor
**Purpose**: Real-time view of incoming orders
**Features**:
- Auto-refreshing list (polling every 5s)
- Filter by status (pending, shipped, delivered, cancelled)
- Order details display
- Visual status indicators
**API**: GET from Order API `/orders`

### 4. Notifications Dropdown
**Purpose**: Display orchestrator work completion notifications
**Features**:
- Dropdown in top navigation bar (sticky header)
- Bell icon with unread count badge
- Live notification feed
- Event types (transport_booked, no_transport_needed, errors)
- Timestamp display
- Auto-scroll to latest
**Location**: Header (always accessible)
**Data Source**: Mock notifications (can be extended to poll endpoint)

### 5. Transport Bookings List
**Purpose**: Show all transport bookings
**Features**:
- Booking details (vehicle, route, cost)
- Associated order ID
- Clickable to view 3D layout
- Status indicators
**API**: GET from Transport API `/bookings` (or store in Order API)

### 6. 3D Layout Viewer
**Purpose**: Visualize packing layout for an order
**Features**:
- Modal viewer with integrated Three.js
- Load layout from S3 or use sample data
- Interactive rotation/zoom (OrbitControls)
- Package dimensions display
- Fullscreen mode
- Reset view button
**Integration**: Native React component (ThreeJSViewer) - fully integrated, no iframe
**Sample Data**: Uses `/public/sample-layout.json` from AI packing algorithm

## API Endpoints

### Order API
- `GET /orders` - List all orders
- `GET /orders/{id}` - Get order details
- `POST /orders` - Create new order
- `PUT /orders/{id}/status` - Update order status

### Lambda API Gateway
- `POST /invoke-agent` - Trigger orchestrator agent
  - Body: `{ prompt: string, agentRuntimeArn: string }`

### Transport API (TBD - need endpoint)
- `GET /bookings` - List all bookings
- `GET /bookings/{id}` - Get booking details

### S3 (for 3D layouts)
- Pattern: `s3://bucket-name/layouts/order-{id}.json`

## Configuration

Environment variables needed (stored in `.env` file):
```env
VITE_ORDER_API_URL=http://YOUR_EC2_IP/api/orders
VITE_LAMBDA_API_URL=https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com/prod/invoke-agent
VITE_TRANSPORT_API_URL=http://YOUR_EC2_IP/api
VITE_ORCHESTRATOR_ARN=arn:aws:bedrock-agentcore:us-east-1:YOUR_ACCOUNT_ID:runtime/orchestrator_agent-YOUR_RUNTIME_ID
VITE_S3_BUCKET_URL=https://YOUR_S3_BUCKET.s3.amazonaws.com
VITE_POLLING_INTERVAL=5000
```

## Deployment

### Build for production
```bash
npm run build
```

### Deploy to S3
```bash
aws s3 sync dist/ s3://your-bucket-name/ --delete
aws s3 website s3://your-bucket-name/ --index-document index.html
```

### CloudFront (optional, recommended)
- Create CloudFront distribution pointing to S3 bucket
- Enable CORS
- Set custom error responses (404 -> index.html for SPA routing)

## Development

### Run locally
```bash
npm install
npm run dev
```

### Folder Structure
```
control-panel/
├── src/
│   ├── components/
│   │   ├── OrderServiceControl.jsx
│   │   ├── OrchestratorTrigger.jsx
│   │   ├── OrdersMonitor.jsx
│   │   ├── NotificationDropdown.jsx    (was NotificationsPanel)
│   │   ├── TransportBookings.jsx
│   │   ├── Layout3DViewer.jsx
│   │   └── ThreeJSViewer.jsx           (new - integrated 3D renderer)
│   ├── services/
│   │   ├── orderApi.js                 (with mock data fallback)
│   │   ├── lambdaApi.js
│   │   └── transportApi.js             (with mock data fallback)
│   ├── hooks/
│   │   ├── useOrders.js
│   │   ├── useNotifications.js
│   │   └── useTransportBookings.js
│   ├── utils/
│   │   └── config.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
│   ├── sample-layout.json              (AI-generated packing layout)
│   └── README.md
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── ARCHITECTURE.md
├── CHANGELOG.md
└── README.md
```

## Layout Structure

The UI uses a responsive 3-column layout:
- **Left Column (3/12 width)**: Controls (Order Service + Orchestrator Trigger)
- **Middle Column (5/12 width)**: Orders Monitor (larger, emphasized)
- **Right Column (4/12 width)**: Transport Bookings (larger, emphasized)

Header is sticky with notifications dropdown in the top right.

## Mock Data

All services include comprehensive mock data fallbacks:
- **Orders**: 7 mock orders (3 pending, 2 shipped, 1 delivered, 1 cancelled)
- **Products**: 5 mock products (Laptop, Mouse, Keyboard, Monitor, Webcam)
- **Customers**: 5 mock customers with realistic data
- **Transport Bookings**: 6 mock bookings with various vehicle types and statuses
- **3D Layout**: Real AI-generated packing layout from `/public/sample-layout.json`

This allows the UI to function fully even without backend APIs running.

## Notes
- Since this is a static site, we rely on polling for "live" updates (every 5s)
- WebSocket support would require a backend service (not suitable for S3 deployment)
- SNS notifications currently use mock data (can be extended to poll endpoint)
- CORS must be enabled on all backend APIs
- All APIs gracefully fall back to mock data on failure

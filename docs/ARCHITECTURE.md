# Logistics Manager - System Architecture

## Overview

A serverless logistics management system using Amazon Bedrock Agentcore for AI-powered order processing, vehicle selection, and 3D packing optimization.

**Monthly Cost: $39-69** (60-70% cheaper than traditional architecture)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React UI (Vite + Three.js)                               │  │
│  │  - Order Management                                        │  │
│  │  - 3D Packing Visualization                               │  │
│  │  - Booking Dashboard                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
│  ┌────────────────┐           ┌────────────────┐               │
│  │ Order API      │           │ Transport API  │               │
│  │ (FastAPI)      │           │ (Express.js)   │               │
│  │ Port: 8000     │           │ Port: 3001     │               │
│  └────────────────┘           └────────────────┘               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  API Gateway (Lambda URLs)                             │    │
│  │  - /invoke-agent → agent-trigger Lambda               │    │
│  │  - /layouts → s3-layout-fetcher Lambda                │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   AI AGENT ORCHESTRATION LAYER                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         AMAZON BEDROCK AGENTCORE                          │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Orchestrator Agent (Nova Premier v1)             │  │  │
│  │  │  - Workflow Coordination                           │  │  │
│  │  │  - Order Batching                                  │  │  │
│  │  │  - Agent Invocation                                │  │  │
│  │  │  - Status Updates                                  │  │  │
│  │  │  - Notifications                                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │           ↓                              ↓                 │  │
│  │  ┌───────────────────┐        ┌──────────────────────┐   │  │
│  │  │ Analyser Agent    │        │ Transport Agent      │   │  │
│  │  │ (Nova Premier v1) │        │ (Nova Premier v1)    │   │  │
│  │  │ - Load Planning   │        │ - Vehicle Selection  │   │  │
│  │  │ - 3D Packing      │        │ - Cost Calculation   │   │  │
│  │  │ - S3 Storage      │        │ - Booking Creation   │   │  │
│  │  └───────────────────┘        └──────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATA & STORAGE LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Amazon S3   │  │  SQLite      │  │  PostgreSQL  │          │
│  │              │  │  (Dev)       │  │  (Prod)      │          │
│  │              │  │              │  │              │          │
│  │ - Layouts    │  │ - Orders     │  │ - Vehicles   │          │
│  │ - React UI   │  │ - Customers  │  │ - Bookings   │          │
│  │ - Knowledge  │  │ - Products   │  │ - Customers  │          │
│  │   Base       │  │              │  │              │          │
│  │              │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGING & EVENTS LAYER                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Amazon SNS (logistics-notifications)                     │  │
│  │  ↓                                                         │  │
│  │  Lambda: notification-handler                             │  │
│  │  ↓                                                         │  │
│  │  Email / SMS / Webhooks                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                 MONITORING & OBSERVABILITY LAYER                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  CloudWatch                                                 │ │
│  │  - Logs (Agent execution, API traces)                      │ │
│  │  - Metrics (Invocation count, latency, errors)             │ │
│  │  - Dashboards (Order metrics, cost tracking)               │ │
│  │  - Alarms (Error rate, latency thresholds)                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow: Order Processing

### Step 1: Order Creation
```
User → Order API (FastAPI) → SQLite/PostgreSQL
```

### Step 2: Agent Trigger
```
User → API Gateway → Lambda (agent-trigger) → Bedrock Agentcore (Orchestrator Agent)
```

### Step 3: Orchestration
```
Orchestrator Agent:
  1. fetch_pending_orders()
  2. group_orders_by_route()
  3. Select batch to process
  4. invoke_analyser_agent(order_ids)
       ↓
     Analyser Agent:
       - fetch_order_details()
       - calculate_load_requirements()
       - generate_batch_packing_layout() (3D bin packing)
       - save_layout_to_s3()
       - Return: {weight, volume, s3_key}
  5. invoke_transport_agent(weight, volume, route)
       ↓
     Transport Agent:
       - check_vehicle_availability()
       - calculate_transport_cost()
       - book_vehicle()
       - Return: {booking_id, vehicle_id, price}
  6. update_orders_batch_status()
  7. send_batch_notification()
```

### Step 4: Notification
```
SNS Topic → Lambda (notification-handler) → Email/SMS to Customer
```

### Step 5: Visualization
```
User → API Gateway (/layouts) → Lambda (s3-layout-fetcher) → S3 Bucket → React UI (Three.js 3D Viewer)
```

---

## Agent Tool Inventory

### Orchestrator Agent (9 Tools)

**Order Management**
- `fetch_pending_orders()` - Get all orders with status "pending"
- `fetch_order_details(order_id)` - Get complete order information
- `update_order_status(order_id, status)` - Update single order status
- `update_orders_batch_status(order_ids, status)` - Batch status update

**Customer Management**
- `get_or_create_transport_customer(customer_id)` - Map customer between APIs

**Route Optimization**
- `group_orders_by_route()` - Group orders by (source, destination)

**Agent Coordination**
- `invoke_analyser_agent(order_ids)` - Trigger packing analysis
- `invoke_transport_agent(weight, volume, route)` - Trigger vehicle booking

**Notifications**
- `send_notification(order_id, event_type, details)` - Single notification
- `send_batch_notification(order_ids, event_type, details)` - Batch notification

### Analyser Agent (5 Tools)

**Data Retrieval**
- `fetch_order_details(order_id)` - Get order with items
- `fetch_multiple_order_details(order_ids)` - Batch order fetching

**Analysis**
- `calculate_load_requirements(items)` - Total weight, volume, dimensions

**Optimization**
- `generate_packing_layout(order_id)` - Single order 3D packing
- `generate_batch_packing_layout(order_ids)` - Multi-order consolidation

**Storage**
- Automatic S3 save on layout generation

### Transport Agent (5 Tools)

**Vehicle Management**
- `check_vehicle_availability(date, filters)` - Query available vehicles
- `get_booking_details(booking_id)` - Fetch booking information

**Cost Calculation**
- `calculate_transport_cost(vehicle_id, distance)` - Get pricing

**Booking Operations**
- `book_vehicle(order_ids, vehicle_id, date)` - Create booking
- `update_booking_status(booking_id, status)` - Update booking state

---

## Database Architecture

### SQLite (Development)
**File:** `database.db`
**Tables:**
- `orders` - Order management
- `customers` - Customer information
- `products` - Product catalog
- `order_items` - Order line items

**Features:**
- Zero configuration
- File-based storage
- Perfect for local development

### PostgreSQL (Production)
**ORM:** Prisma
**Tables:**
- `Vehicle` - Vehicle fleet management
- `Customer` - Customer records
- `Booking` - Transport bookings

**Features:**
- ACID compliance
- Complex queries with indexes
- Connection pooling
- Ready for RDS migration

---

## AWS Services Used

### AI & Machine Learning (3)
1. **Amazon Bedrock** - Foundation model hosting
2. **Amazon Bedrock Agentcore** - Managed agent runtime with 3 agents
3. **Amazon Nova Premier v1** - Advanced reasoning LLM

### Compute (2)
4. **AWS Lambda** - 3 serverless functions (agent-trigger, notification-handler, s3-layout-fetcher)
5. **Amazon EC2** - t3.small instance hosting Order and Transport APIs

### Storage (1)
6. **Amazon S3** - Packing layouts, React UI hosting, knowledge base

### Integration & Messaging (2)
7. **Amazon SNS** - Event-driven notifications
8. **Amazon API Gateway** - RESTful endpoints with Lambda URLs

### Monitoring (1)
9. **Amazon CloudWatch** - Logs, metrics, dashboards, alarms

### Security (1)
10. **AWS IAM** - Role-based access control

**Total AWS Services: 10**

---

## Security Architecture

### IAM Roles

**AgentRuntimeRole**
- Trust: bedrock-agentcore.amazonaws.com
- Permissions:
  - Bedrock: InvokeModel (Nova Premier)
  - AgentCore: InvokeAgentRuntime (agent-to-agent)
  - S3: PutObject, GetObject
  - SNS: Publish
  - CloudWatch: Logs, Metrics

**EC2LogisticsRole**
- Trust: ec2.amazonaws.com
- Permissions:
  - CloudWatch: Logs
  - AgentCore: InvokeAgentRuntime (orchestrator only)

**LambdaExecutionRole**
- Trust: lambda.amazonaws.com
- Permissions:
  - Logs: CreateLogGroup, PutLogEvents
  - S3: GetObject (layout fetcher)
  - Bedrock: InvokeAgent (agent trigger)
  - SNS: Publish (notification handler)

### Network Security

**EC2 Security Group**
```
Inbound:
  - Port 80 (HTTP): 0.0.0.0/0
  - Port 443 (HTTPS): 0.0.0.0/0
  - Port 22 (SSH): YOUR_IP/32

Outbound:
  - All traffic: 0.0.0.0/0
```

**Agent Network:** PUBLIC mode (AWS-managed, no VPC required)

---

## Infrastructure Components

### Compute
- **Lambda Functions**: 3 functions (agent-trigger, notification-handler, s3-layout-fetcher)
  - Memory: 256-512MB
  - Timeout: 30-120s
- **Bedrock Agentcore**: 3 agents (managed, auto-scaling)
- **EC2**: t3.small (2 vCPU, 2GB RAM) hosting Order and Transport APIs

### Storage
- **S3**: 1 bucket (logistics-packing-layouts)
- **SQLite**: Development database (order_api)
- **PostgreSQL**: Production database (transport_api)

### Monitoring
- **CloudWatch**: Logs, metrics, dashboards, alarms

---

## Cost Breakdown

### Development Scale (~$39-69/month)
- EC2: $15-20 (45%)
- Bedrock Nova: $15-30 (40%)
- Bedrock Agentcore: $5-20 (12%)
- CloudWatch + Lambda + API Gateway: $2-5 (2%)
- S3 + SNS: $1-2 (1%)

---

## Performance Metrics

### Target Performance
- Order processing time: < 10 seconds (end-to-end)
- Packing utilization: > 80% average
- Booking success rate: > 95%
- API latency: < 2 seconds (p95)

### Cost Efficiency
- Cost per order: < $0.20
- Monthly infrastructure: < $69
- 60-70% savings vs traditional architecture

### Reliability
- System availability: > 99.5%
- Agent success rate: > 98%
- Lambda cold start: < 2 seconds

---

## Scalability Design

### Current Capacity (10 users)
- EC2: t3.small handles 10 concurrent users
- PostgreSQL: 100 max connections
- PM2: 2 instances per API (load balanced)
- Agents: Serverless, auto-scales

### Scaling Path (50+ users)
1. Upgrade EC2 to t3.medium
2. Move PostgreSQL to RDS (Multi-AZ)
3. Add Application Load Balancer
4. Add Auto Scaling Group (2-4 instances)
5. Use ElastiCache for session management

---

## Disaster Recovery

### Backup Strategy
- **PostgreSQL:** Daily pg_dump to S3
- **SQLite:** File-based, backed up with application
- **S3 Layouts:** Versioning enabled
- **EC2:** AMI snapshot weekly
- **Code:** Git repository

### Recovery Objectives
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 1 day

---

## Monitoring & Alerting

### CloudWatch Log Groups
- `/aws/ec2/logistics-transport-api`
- `/aws/ec2/logistics-order-api`
- `/aws/bedrock-agentcore/logistics-transport`
- `/aws/bedrock-agentcore/logistics-analyser`
- `/aws/bedrock-agentcore/logistics-orchestrator`

### Key Metrics
- Agent invocation count
- Agent latency (p50, p95, p99)
- API response times
- Error rates
- Database connections
- EC2 CPU/Memory utilization

### Alarms
- Agent error rate > 5% → Email/SNS alert
- API latency p95 > 10s → Email notification
- Lambda throttling → Auto-scale trigger
- Database connection pool exhaustion → Scale RDS

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 18 + Vite | Modern UI framework |
| **3D Rendering** | Three.js | Packing visualization |
| **Order API** | FastAPI + Uvicorn | Order microservice |
| **Transport API** | Express.js + Prisma | Booking microservice |
| **AI Framework** | Bedrock Agentcore | Agent orchestration |
| **Foundation Model** | Amazon Nova Premier v1 | AI reasoning engine |
| **Databases** | SQLite + PostgreSQL | Development and production |
| **Object Storage** | Amazon S3 | Layout and asset storage |
| **Messaging** | Amazon SNS | Event notifications |
| **Compute** | AWS Lambda + EC2 | Serverless and VM compute |
| **Observability** | CloudWatch | Monitoring and logging |

---

**Architecture designed for the AWS AI Agent Global Hackathon**

# Production Architecture - Logistics Manager

## System Overview

Production-ready logistics management system with AI agents on AWS, supporting 10 concurrent users.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USERS (10 concurrent)                    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         EC2 t3.small (Ubuntu 22.04) + Elastic IP            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Nginx Reverse Proxy (Port 80/443)                     │  │
│  │  ├─ /api/transport → localhost:3000                   │  │
│  │  └─ /api/orders → localhost:8000                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ PM2 Process Manager                                   │  │
│  │  ├─ Transport API (Node.js/Express) × 2 instances     │  │
│  │  └─ Order API (FastAPI/Uvicorn) × 2 instances         │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ PostgreSQL 14                                         │  │
│  │  ├─ transport_db (Port 5432)                          │  │
│  │  └─ order_db (Port 5432, different user)              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  IAM Role: EC2LogisticsRole                                 │
│  Security Group: logistics-sg (80, 443, 22)                 │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (via public IP)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        Amazon Bedrock AgentCore (3 Agent Runtimes)          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Orchestrator Agent (logistics-orchestrator)           │  │
│  │  • Coordinates end-to-end workflow                    │  │
│  │  • Invokes Analyser and Transport agents              │  │
│  │  • Updates order status                               │  │
│  │  • Sends SNS notifications                            │  │
│  └──────────────┬─────────────────────┬──────────────────┘  │
│                 │                     │                     │
│                 ▼                     ▼                     │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │ Analyser Agent       │  │ Transport Agent      │         │
│  │ (logistics-analyser) │  │ (logistics-transport)│         │
│  │  • Fetch order       │  │  • Check vehicles    │         │
│  │  • Calculate load    │  │  • Calculate cost    │         │
│  │  • Packing algorithm │  │  • Book vehicle      │         │
│  │  • Save to S3        │  │  • Update status     │         │
│  └──────────────────────┘  └──────────────────────┘         │
│                                                             │
│  IAM Role: AgentRuntimeRole (shared)                        │
│  Model: us.amazon.nova-premier-v1:0                         │
│  Network: PUBLIC (AWS-managed)                              │
└────────┬──────────┬──────────┬───────────────────┘
         │          │          │
         ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌──────────┐
    │   S3   │ │  SNS   │ │CloudWatch│
    │ Bucket │ │ Topic  │ │   Logs   │
    └────────┘ └────────┘ └──────────┘
```

## Components

### 1. EC2 Instance (t3.small)
- **OS:** Ubuntu 22.04 LTS
- **vCPU:** 2
- **RAM:** 2 GB
- **Storage:** 20 GB gp3
- **Network:** Elastic IP (static)
- **Role:** EC2LogisticsRole

**Installed Software:**
- Node.js 20.x (Transport API)
- Python 3.11 (Order API)
- PostgreSQL 14 (2 databases)
- Nginx (reverse proxy)
- PM2 (process manager)

### 2. Bedrock AgentCore (3 Agents)

#### Transport Agent
- **Runtime:** logistics-transport
- **Model:** us.amazon.nova-premier-v1:0
- **Tools:** 5 (check availability, calculate cost, book, update status, get details)
- **Calls:** Transport API, Order API

#### Analyser Agent
- **Runtime:** logistics-analyser
- **Model:** us.amazon.nova-premier-v1:0
- **Tools:** 4 (fetch order, calculate load, packing algorithm, save to S3)
- **Calls:** Order API, S3

#### Orchestrator Agent
- **Runtime:** logistics-orchestrator
- **Model:** us.amazon.nova-premier-v1:0
- **Tools:** 5 (fetch orders, invoke agents, update status, send notification)
- **Calls:** Analyser Agent, Transport Agent, Order API, SNS

### 3. Supporting Services

| Service | Resource | Purpose |
|---------|----------|---------|
| **S3** | logistics-packing-layouts | Store packing layout JSON files |
| **SNS** | logistics-notifications | Send order processing notifications |
| **CloudWatch Logs** | /aws/ec2/logistics-*, /aws/bedrock-agentcore/logistics-* | Centralized logging |
| **CloudWatch Metrics** | AWS/BedrockAgentCore | Agent performance metrics |

## Data Flow

### Order Processing Workflow

```
1. User → Nginx → Order API
   └─ POST /orders (create order)

2. Order API → Orchestrator Agent
   └─ Trigger: "Process order #123"

3. Orchestrator → Analyser Agent
   └─ Request: "Analyze order #123"

4. Analyser → Order API
   └─ GET /orders/123 (fetch details)

5. Analyser → Analyser (internal)
   └─ Run packing algorithm

6. Analyser → S3
   └─ PUT /logistics-packing-layouts/order-123.json

7. Analyser → Orchestrator
   └─ Return: {weight: 150kg, volume: 2m³, ...}

8. Orchestrator → Transport Agent
   └─ Request: "Book vehicle for 150kg, 2m³"

9. Transport → Transport API
   └─ GET /vehicles/available?date=2024-12-25

10. Transport → Transport API
    └─ POST /bookings/calculate-price

11. Transport → Transport API
    └─ POST /bookings (create booking)

12. Transport → Orchestrator
    └─ Return: {booking_id, vehicle_id, cost, ...}

13. Orchestrator → Order API
    └─ PATCH /orders/123 (update status)

14. Orchestrator → SNS
    └─ Publish notification

15. SNS → User
    └─ Email/SMS notification
```

## Security

### IAM Roles

#### AgentRuntimeRole
**Trust:** bedrock-agentcore.amazonaws.com  
**Permissions:**
- Bedrock: InvokeModel (Nova Premier)
- AgentCore: InvokeAgentRuntime (agent-to-agent)
- S3: PutObject, GetObject (packing layouts)
- SNS: Publish (notifications)
- CloudWatch: Logs, Metrics

#### EC2LogisticsRole
**Trust:** ec2.amazonaws.com  
**Permissions:**
- CloudWatch: Logs
- AgentCore: InvokeAgentRuntime (orchestrator only)

### Network Security

**Security Group: logistics-sg**
```
Inbound:
  - Port 80 (HTTP): 0.0.0.0/0
  - Port 443 (HTTPS): 0.0.0.0/0
  - Port 22 (SSH): YOUR_IP/32

Outbound:
  - All traffic: 0.0.0.0/0
```

**Agent Network:** PUBLIC mode (AWS-managed, no VPC required)

## Scalability

### Current Capacity (10 users)
- **EC2:** t3.small handles 10 concurrent users
- **PostgreSQL:** 100 max connections (sufficient)
- **PM2:** 2 instances per API (load balanced)
- **Agents:** Serverless, auto-scales

### Scaling Path (50+ users)
1. Upgrade EC2 to t3.medium
2. Move PostgreSQL to RDS (Multi-AZ)
3. Add Application Load Balancer
4. Add Auto Scaling Group (2-4 instances)
5. Use ElastiCache for session management

## Monitoring

### CloudWatch Log Groups
- `/aws/ec2/logistics-transport-api`
- `/aws/ec2/logistics-order-api`
- `/aws/bedrock-agentcore/logistics-transport`
- `/aws/bedrock-agentcore/logistics-analyser`
- `/aws/bedrock-agentcore/logistics-orchestrator`

### Key Metrics
- Agent invocation count
- Agent latency (p50, p99)
- API response times
- Error rates
- Database connections
- EC2 CPU/Memory utilization

### Alarms (Recommended)
- Agent error rate > 5%
- API latency > 2s
- EC2 CPU > 80%
- Database connections > 80

## Cost Estimate

| Component | Monthly Cost |
|-----------|--------------|
| EC2 t3.small (730 hrs) | $15.18 |
| Elastic IP (attached) | $0.00 |
| Bedrock Nova Premier (10 users) | $15-30 |
| AgentCore (3 agents, ~1000 sessions) | $5-20 |
| S3 (1GB, 1000 requests) | $0.03 |
| SNS (1000 notifications) | $0.50 |
| CloudWatch Logs (5GB) | $2.50 |
| Data Transfer (10GB out) | $0.90 |
| **Total** | **$39-69/month** |

## Disaster Recovery

### Backup Strategy
- **PostgreSQL:** Daily pg_dump to S3
- **S3 Layouts:** Versioning enabled
- **EC2:** AMI snapshot weekly
- **Code:** Git repository

### Recovery Time Objective (RTO)
- **EC2 failure:** 15 minutes (launch from AMI)
- **Database corruption:** 30 minutes (restore from backup)
- **Agent failure:** 0 minutes (serverless, auto-recovery)

### Recovery Point Objective (RPO)
- **Database:** 24 hours (daily backups)
- **S3 data:** 0 (versioned)
- **Code:** 0 (Git)

## Maintenance

### Regular Tasks
- **Daily:** Check CloudWatch logs for errors
- **Weekly:** Review agent performance metrics
- **Monthly:** Update dependencies, security patches
- **Quarterly:** Review costs, optimize resources

### Update Procedure
1. Test changes locally
2. Deploy to staging (if available)
3. Update agents: `agentcore launch` (zero-downtime)
4. Update APIs: `pm2 reload ecosystem.config.js`
5. Monitor logs for 30 minutes

## Environment Variables

### Transport Agent
```bash
TRANSPORT_API_URL=http://EC2_PUBLIC_IP/api/transport
ORDER_API_URL=http://EC2_PUBLIC_IP/api/orders
AWS_REGION=us-east-1
```

### Analyser Agent
```bash
ORDER_API_URL=http://EC2_PUBLIC_IP/api/orders
TRANSPORT_API_URL=http://EC2_PUBLIC_IP/api/transport
S3_LAYOUTS_BUCKET=logistics-packing-layouts
AWS_REGION=us-east-1
```

### Orchestrator Agent
```bash
ORDER_API_URL=http://EC2_PUBLIC_IP/api/orders
ANALYSER_AGENT_ARN=arn:aws:bedrock-agentcore:REGION:ACCOUNT:runtime/logistics-analyser
TRANSPORT_AGENT_ARN=arn:aws:bedrock-agentcore:REGION:ACCOUNT:runtime/logistics-transport
SNS_TOPIC_ARN=arn:aws:sns:REGION:ACCOUNT:logistics-notifications
AWS_REGION=us-east-1
```

## API Endpoints

### Transport API (Port 3000)
- `GET /api/vehicles` - List all vehicles
- `GET /api/vehicles/available?date=YYYY-MM-DD` - Check availability
- `POST /api/bookings` - Create booking
- `POST /api/bookings/calculate-price` - Calculate cost
- `PATCH /api/bookings/:id/status` - Update status
- `GET /api/bookings/:id` - Get booking details

### Order API (Port 8000)
- `GET /orders` - List orders
- `POST /orders` - Create order
- `GET /orders/:id` - Get order details
- `PATCH /orders/:id` - Update order
- `GET /customers/:id` - Get customer details

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Three.js, Vite (future) |
| **Backend APIs** | Node.js/Express, FastAPI |
| **Database** | PostgreSQL 14 |
| **AI Agents** | Strands Agents, Bedrock AgentCore |
| **LLM** | Amazon Nova Premier |
| **Infrastructure** | AWS EC2, S3, SNS |
| **Monitoring** | CloudWatch Logs, Metrics |
| **Process Manager** | PM2 |
| **Reverse Proxy** | Nginx |
| **Deployment** | agentcore CLI, AWS CLI |

# Actual Project Directory Structure

## Current Directory Structure

This document reflects the **actual current structure** of the logistics-manager project.

```
logistics-manager/
├── agents/                           # Bedrock Agentcore AI agents
│   ├── orchestrator/
│   │   ├── agent.py                  # Orchestrator agent definition
│   │   └── requirements.txt          # Python dependencies
│   ├── analyser/
│   │   ├── agent.py                  # Analyser agent definition
│   │   ├── README.md
│   │   └── requirements.txt
│   ├── transport/
│   │   ├── agent.py                  # Transport agent definition
│   │   └── requirements.txt
│   └── requirements.txt              # Shared agent dependencies
│
├── lambda/                           # AWS Lambda functions
│   ├── agent-trigger/                # Triggers Orchestrator Agent
│   │   ├── index.js                  # Lambda handler
│   │   ├── package.json
│   │   ├── deploy.sh                 # Deployment script
│   │   ├── update-lambda.sh
│   │   ├── function.zip              # Packaged function
│   │   ├── README.md
│   │   ├── test-commands.txt
│   │   └── ui-example.html
│   ├── notification-handler/         # Processes SNS notifications
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── deploy.sh
│   │   ├── setup-complete.sh
│   │   └── function.zip
│   └── s3-layout-fetcher/            # Fetches layouts from S3
│       ├── index.js
│       ├── package.json
│       ├── deploy.sh
│       └── function.zip
│
├── order_api/                        # Order Management API (FastAPI)
│   ├── main.py                       # FastAPI application entry
│   ├── database.py                   # SQLite database connection
│   ├── models.py                     # SQLAlchemy models
│   ├── schemas.py                    # Pydantic schemas
│   ├── crud.py                       # Database operations
│   ├── seed_data.py                  # Sample data seeding
│   ├── requirements.txt              # Python dependencies
│   └── routers/
│       ├── orders.py                 # Order endpoints
│       ├── customers.py              # Customer endpoints
│       ├── products.py               # Product endpoints
│       └── __init__.py
│
├── transport_api/                    # Transport Management API (Express.js)
│   ├── src/
│   │   ├── server.js                 # Express server entry
│   │   ├── app.js                    # Express app configuration
│   │   ├── swagger.js                # API documentation
│   │   ├── routes/                   # API routes
│   │   ├── controllers/              # Request handlers
│   │   ├── services/                 # Business logic
│   │   ├── middleware/               # Express middleware
│   │   └── utils/                    # Utility functions
│   ├── prisma/
│   │   ├── schema.prisma             # Prisma ORM schema
│   │   ├── seed.js                   # Database seeding
│   │   └── migrations/               # Database migrations
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── README.md
│   └── SRS.md                        # Software Requirements Spec
│
├── control-panel/                    # React UI (Main UI)
│   ├── src/
│   │   ├── main.jsx                  # React app entry
│   │   ├── App.jsx                   # Main app component
│   │   ├── index.css                 # Global styles
│   │   ├── components/               # React components
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── services/                 # API clients
│   │   └── utils/                    # Utility functions
│   ├── public/
│   │   ├── sample-layout.json        # Sample packing layout
│   │   └── README.md
│   ├── dist/                         # Built static files
│   │   ├── index.html
│   │   ├── assets/
│   │   ├── sample-layout.json
│   │   └── README.md
│   ├── index.html                    # HTML template
│   ├── vite.config.js                # Vite configuration
│   ├── tailwind.config.js            # Tailwind CSS config
│   ├── postcss.config.js             # PostCSS config
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── deploy-s3.sh                  # S3 deployment script
│   ├── README.md
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
│
├── ui/                               # Alternative Three.js UI
│   ├── src/
│   │   ├── main.js                   # Three.js entry
│   │   ├── scene/                    # 3D scene setup
│   │   ├── objects/                  # 3D objects
│   │   ├── ui/                       # UI controls
│   │   ├── data/                     # Sample data
│   │   └── config/                   # Configuration
│   ├── styles/
│   │   └── main.css
│   ├── public/
│   │   └── data/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── README.md
│
├── ai/                               # Legacy AI/packing algorithm code
│   ├── logistics_algorithm.py        # Packing algorithm
│   ├── visualize_packing.py          # Visualization script
│   ├── pack_and_visualize.py
│   ├── my_agent/                     # Agent prototype
│   │   ├── agent.py
│   │   ├── __init__.py
│   │   └── tools/
│   ├── input_packing.json            # Sample input
│   ├── output_packing.json           # Sample output
│   ├── output/                       # Generated outputs
│   ├── requirements.txt
│   ├── requirements_minimal.txt
│   └── readme.md
│
├── docs/                             # Documentation
│   ├── ARCHITECTURE.md               # System architecture
│   ├── PRODUCTION_ARCHITECTURE.md    # Production deployment
│   ├── DIRECTORY_STRUCTURE.md        # This file
│   └── images/                       # Architecture diagrams
│       ├── architecture.png
│       └── flow.png
│
├── venv/                             # Python virtual environment
│   ├── bin/                          # Python executables
│   ├── lib/                          # Python packages
│   └── pyvenv.cfg
│
├── database.db                       # SQLite database (order_api)
│
├── README.md                         # Project overview
├── HACKATHON_SUBMISSION.md           # Hackathon submission doc
├── AWS_SERVICES_REFERENCE.md         # AWS services breakdown
├── ARCHITECTURE_OVERVIEW.md          # Architecture reference
├── DEPLOYMENT_WORKFLOW.md            # Deployment guide
├── DIAGRAM_GUIDE.md                  # Diagram creation guide
├── CORS_SETUP.md                     # CORS configuration
│
├── architecture-reference.html       # Visual architecture reference
├── architecture-flow-diagram.html    # Flow diagram
└── architecture-layered-diagram.html # Layered diagram
```

---

## Key Directories

### Agents (`agents/`)
Contains the three Bedrock Agentcore AI agents that power the logistics orchestration:
- **orchestrator/** - Coordinates workflow, batches orders, invokes other agents
- **analyser/** - Load planning, 3D packing optimization, S3 storage
- **transport/** - Vehicle selection, cost calculation, booking creation

### Lambda Functions (`lambda/`)
Serverless functions that support the system:
- **agent-trigger/** - API Gateway → Bedrock Agent invocation
- **notification-handler/** - SNS event processing and notifications
- **s3-layout-fetcher/** - Serves packing layouts from S3

### Order API (`order_api/`)
FastAPI-based microservice for order management:
- SQLite database for development
- RESTful endpoints for orders, customers, products
- Pydantic schemas for validation

### Transport API (`transport_api/`)
Express.js microservice for transport bookings:
- PostgreSQL database with Prisma ORM
- Vehicle availability and booking management
- Swagger API documentation

### Control Panel (`control-panel/`)
Primary React UI with Three.js 3D visualization:
- Order creation and management
- Transport booking dashboard
- Interactive 3D packing layout viewer
- Notification display

### UI (`ui/`)
Alternative Three.js-focused UI:
- Pure 3D visualization
- Minimal framework overhead
- Experimental features

---

## File Naming Conventions

### Python Files
- `snake_case.py` for modules
- `main.py` for application entry points
- `requirements.txt` for dependencies

### JavaScript/TypeScript Files
- `camelCase.js` for modules
- `PascalCase.jsx` for React components
- `package.json` for dependencies

### Configuration Files
- `kebab-case.config.js` for build configs
- `.json` for data and schemas
- `.sh` for shell scripts

### Documentation
- `UPPERCASE.md` for main documentation
- `lowercase.md` for specific guides

---

## Database Files

### SQLite (Development)
- **Location:** `/database.db` (root directory)
- **Used by:** order_api
- **Tables:** orders, customers, products, order_items

### PostgreSQL (Production)
- **Used by:** transport_api
- **Connection:** Configured via environment variables
- **Schema:** Managed by Prisma migrations in `transport_api/prisma/`

---

## Build & Deployment Artifacts

### Compiled/Built Files
- `control-panel/dist/` - React production build
- `lambda/*/function.zip` - Packaged Lambda functions

### Package Managers
- `package-lock.yaml` - npm lock file
- `pnpm-lock.yaml` - pnpm lock file
- `requirements.txt` - pip dependencies

---

## Configuration Files

### Frontend
- `vite.config.js` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS settings
- `postcss.config.js` - PostCSS plugins

### Backend
- `prisma/schema.prisma` - Database schema (Prisma)
- No explicit config files (uses environment variables)

---

## Deployment Scripts

### Lambda Functions
- `lambda/agent-trigger/deploy.sh` - Deploy agent trigger
- `lambda/agent-trigger/update-lambda.sh` - Update existing Lambda
- `lambda/notification-handler/deploy.sh` - Deploy notification handler
- `lambda/s3-layout-fetcher/deploy.sh` - Deploy layout fetcher

### Frontend
- `control-panel/deploy-s3.sh` - Deploy React UI to S3

---

## Environment Variables

### Order API
```bash
DATABASE_URL=sqlite:///./database.db
PORT=8000
```

### Transport API
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/transport_db
PORT=3001
```

### Lambda Functions
```bash
ORCHESTRATOR_AGENT_ID=<agent-id>
ORCHESTRATOR_AGENT_ALIAS_ID=<alias-id>
AWS_REGION=us-east-1
```

---

## Development vs Production

### Development
- **Order API:** SQLite database (`database.db`)
- **Transport API:** Local PostgreSQL
- **Frontend:** Development server (Vite)
- **Agents:** Deploy to dev alias

### Production
- **Order API:** SQLite (can migrate to RDS)
- **Transport API:** PostgreSQL on EC2 (migrate to RDS)
- **Frontend:** S3 + CloudFront
- **Agents:** Deploy to prod alias

---

## Notable Patterns

### API Structure
Both APIs follow similar patterns:
- `routers/` or `routes/` - Endpoint definitions
- `controllers/` - Request handlers
- `services/` - Business logic
- `models/` or `schemas/` - Data structures

### Agent Structure
All agents share:
- `agent.py` - Agent definition with tools
- `requirements.txt` - Dependencies
- No separate tool files (tools defined inline)

### Frontend Structure
Both UIs use:
- Vite for building
- Three.js for 3D rendering
- Modular component structure

---

## Missing/Future Directories

The following directories from ideal architecture are **not yet implemented**:

- `infrastructure/` - IaC (CDK/Terraform)
- `tests/` - Comprehensive test suites
- `knowledge-bases/` - Agent knowledge documents
- `monitoring/` - CloudWatch dashboards as code
- `scripts/` - Utility scripts
- `shared/` - Shared schemas across services

---

## Migration Notes

This is the **current working structure**. For recommended future structure, see the "Recommended Directory Structure" section (archived from previous version).

The current structure prioritizes:
- Rapid development and iteration
- Minimal configuration overhead
- Clear separation between agents, APIs, and UIs
- Easy deployment to AWS services

Future improvements should focus on:
- Adding comprehensive tests
- Infrastructure as code
- Shared type definitions
- Better documentation organization

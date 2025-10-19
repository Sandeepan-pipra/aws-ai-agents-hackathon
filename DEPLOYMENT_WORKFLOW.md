# Production Deployment Workflow

Complete step-by-step guide to deploy Logistics Manager on AWS for 10 users.

**Estimated Time:** 60 minutes  
**Cost:** $39-69/month

---

## Prerequisites

- AWS account with permissions (see `agents/PERMISSION_REQUEST.md`)
- AWS CLI configured: `aws configure`
- SSH key pair created in AWS Console
- Local machine with: Node.js, Python, Docker (for testing)

---

## Phase 1: AWS Resources Setup (15 min)

### Step 1: Set Environment Variables

```bash
export AWS_REGION=us-east-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export KEY_NAME=logistics-key  # Your SSH key name
export MY_IP=$(curl -s ifconfig.me)

echo "Region: $AWS_REGION"
echo "Account: $ACCOUNT_ID"
echo "Your IP: $MY_IP"
echo "Key: $KEY_NAME"
```

### Step 2: Run Resource Setup Script

```bash
cd agents
./setup-aws-resources.sh $AWS_REGION
```

**This creates:**
- S3 bucket: `logistics-packing-layouts`
- SNS topic: `logistics-notifications`
- ECR repos: `logistics-transport`, `logistics-analyser`, `logistics-orchestrator`
- IAM role: `AgentRuntimeRole`

**Save the output:**
```bash
export SNS_TOPIC_ARN=<from_output>
export AGENT_RUNTIME_ROLE_ARN=<from_output>
```

### Step 3: Create EC2 IAM Role

```bash
# Trust policy
cat > /tmp/ec2-trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ec2.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Create role
aws iam create-role \
  --role-name EC2LogisticsRole \
  --assume-role-policy-document file:///tmp/ec2-trust.json

# Permissions
cat > /tmp/ec2-perms.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/ec2/logistics-*"
    },
    {
      "Effect": "Allow",
      "Action": ["bedrock-agentcore:InvokeAgentRuntime"],
      "Resource": "arn:aws:bedrock-agentcore:*:*:runtime/logistics-orchestrator"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name EC2LogisticsRole \
  --policy-name EC2LogisticsPermissions \
  --policy-document file:///tmp/ec2-perms.json

# Create instance profile
aws iam create-instance-profile --instance-profile-name EC2LogisticsProfile
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2LogisticsProfile \
  --role-name EC2LogisticsRole

echo "✅ EC2LogisticsRole created"
```

### Step 4: Create Security Group

```bash
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text)

SG_ID=$(aws ec2 create-security-group \
  --group-name logistics-sg \
  --description "Logistics Manager security group" \
  --vpc-id $VPC_ID \
  --query GroupId --output text)

# Allow HTTP, HTTPS, SSH
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr $MY_IP/32

echo "✅ Security Group: $SG_ID"
export SG_ID
```

---

## Phase 2: EC2 Instance Setup (20 min)

### Step 5: Launch EC2 Instance (Console)

**Go to AWS Console → EC2 → Launch Instance:**

1. **Name:** `logistics-manager`
2. **AMI:** Ubuntu Server 22.04 LTS (64-bit x86)
3. **Instance type:** t3.small
4. **Key pair:** Select `$KEY_NAME`
5. **Network settings:**
   - VPC: Default
   - Subnet: Any
   - Auto-assign public IP: Enable
   - Security group: Select `logistics-sg`
6. **Storage:** 20 GB gp3
7. **Advanced details:**
   - IAM instance profile: `EC2LogisticsProfile`
8. **Launch instance**

### Step 6: Allocate Elastic IP (Console)

1. **EC2 → Elastic IPs → Allocate Elastic IP**
2. Click **Allocate**
3. Select IP → **Actions → Associate Elastic IP**
4. Instance: `logistics-manager`
5. Click **Associate**

**Save the IP:**
```bash
export EC2_PUBLIC_IP=<YOUR_ELASTIC_IP>
echo "EC2 Public IP: $EC2_PUBLIC_IP"
```

### Step 7: SSH and Install Dependencies

```bash
ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$EC2_PUBLIC_IP
```

**Run on EC2:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Verify
node --version && python3.11 --version && psql --version && nginx -v && pm2 --version
```

### Step 8: Setup PostgreSQL

```bash
# Create databases and users
sudo -u postgres psql <<EOF
CREATE DATABASE transport_db;
CREATE DATABASE order_db;
CREATE USER transport_user WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
CREATE USER order_user WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE transport_db TO transport_user;
GRANT ALL PRIVILEGES ON DATABASE order_db TO order_user;
\q
EOF

echo "✅ PostgreSQL databases created"
```

### Step 9: Deploy Application Code

**Option A: Using Git (if repo is ready)**
```bash
sudo mkdir -p /opt/logistics
sudo chown ubuntu:ubuntu /opt/logistics
cd /opt/logistics
git clone <YOUR_REPO_URL> .
```

**Option B: Copy from local machine (run on your local machine)**
```bash
cd ~/Developer/logistics-manager
rsync -avz -e "ssh -i ~/.ssh/$KEY_NAME.pem" \
  --exclude 'node_modules' \
  --exclude 'venv' \
  --exclude '.git' \
  --exclude '__pycache__' \
  transport_api/ order_api/ \
  ubuntu@$EC2_PUBLIC_IP:/opt/logistics/
```

### Step 10: Setup Transport API

**On EC2:**
```bash
cd /opt/logistics/transport_api

# Create .env
cat > .env <<'EOF'
DATABASE_URL="postgresql://transport_user:YOUR_SECURE_PASSWORD_HERE@localhost:5432/transport_db"
PORT=3000
BASE_CHARGE=500
NODE_ENV=production
EOF

# Install and setup
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# Test
npm start &
sleep 5
curl http://localhost:3000/api/vehicles
kill %1

echo "✅ Transport API ready"
```

### Step 11: Setup Order API

```bash
cd /opt/logistics/order_api

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv

# Create .env
cat > .env <<'EOF'
DATABASE_URL="postgresql://order_user:YOUR_SECURE_PASSWORD_HERE@localhost:5432/order_db"
EOF

# Run seed data
python seed_data.py

# Test
uvicorn order_api.main:app --host 0.0.0.0 --port 8000 &
sleep 5
curl http://localhost:8000/
kill %1

echo "✅ Order API ready"
```

### Step 12: Configure PM2

```bash
cd /opt/logistics

cd /home/ubuntu  # or wherever your code is

cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [
    {
      name: 'transport-api',
      cwd: '/home/ubuntu/logistics/transport_api',
      script: 'src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'order-api',
      cwd: '/home/ubuntu/logistics',
      script: 'venv/bin/python',
      args: '-m uvicorn order_api.main:app --host 0.0.0.0 --port 8000 --workers 2',
      interpreter: 'none',
      instances: 1
    }
  ]
};
EOF

pm2 delete all
pm2 start ecosystem.config.js
pm2 save
pm2 status


# Start apps
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Run the command it outputs

# Verify
pm2 status
pm2 logs --lines 20

echo "✅ PM2 configured"
```

### Step 13: Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/logistics <<'EOF'
server {
    listen 80;
    server_name _;

    location /api/transport {
        proxy_pass http://localhost:3000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/orders/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/logistics /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/defaultcurl http://localhost/api/orders/
sudo nginx -t
sudo systemctl restart nginx

# Test
curl http://localhost/api/transport/vehicles
curl http://localhost/api/orders/

echo "✅ Nginx configured"
```

**Exit SSH:**
```bash
exit
```

---

## Phase 3: Deploy AI Agents (20 min)

### Step 14: Update Agent Code (Local Machine)

```bash
cd ~/Developer/logistics-manager/agents

# Update Transport Agent
sed -i.bak "s|http://172.17.0.1:3000|http://$EC2_PUBLIC_IP/api/transport|g" transport/agent.py
sed -i.bak "s|http://172.17.0.1:8000|http://$EC2_PUBLIC_IP/api/orders|g" transport/agent.py

# Update Analyser Agent
sed -i.bak "s|http://localhost:8000|http://$EC2_PUBLIC_IP/api/orders|g" analyser/agent.py
sed -i.bak "s|http://localhost:3000|http://$EC2_PUBLIC_IP/api/transport|g" analyser/agent.py

# Update Orchestrator Agent
sed -i.bak "s|http://localhost:8000|http://$EC2_PUBLIC_IP/api/orders|g" orchestrator/agent.py

echo "✅ Agent code updated with EC2 IP"
```

### Step 15: Deploy Transport Agent

```bash
cd transport

agentcore configure --entrypoint agent.py

# When prompted:
# Region: us-east-1
# Role ARN: $AGENT_RUNTIME_ROLE_ARN
# Environment variables:
#   TRANSPORT_API_URL=http://$EC2_PUBLIC_IP/api/transport
#   ORDER_API_URL=http://$EC2_PUBLIC_IP/api/orders
#   AWS_REGION=us-east-1

agentcore launch

# Save ARN from output
export TRANSPORT_AGENT_ARN=<ARN_FROM_OUTPUT>
echo "Transport Agent ARN: $TRANSPORT_AGENT_ARN"
```

### Step 16: Deploy Analyser Agent

```bash
cd ../analyser

agentcore configure --entrypoint agent.py

# Environment variables:
#   ORDER_API_URL=http://$EC2_PUBLIC_IP/api/orders
#   TRANSPORT_API_URL=http://$EC2_PUBLIC_IP/api/transport
#   S3_LAYOUTS_BUCKET=logistics-packing-layouts
#   AWS_REGION=us-east-1

agentcore launch

export ANALYSER_AGENT_ARN=<ARN_FROM_OUTPUT>
echo "Analyser Agent ARN: $ANALYSER_AGENT_ARN"
```

### Step 17: Deploy Orchestrator Agent

```bash
cd ../orchestrator

agentcore configure --entrypoint agent.py

# Environment variables:
#   ORDER_API_URL=http://$EC2_PUBLIC_IP/api/orders
#   ANALYSER_AGENT_ARN=$ANALYSER_AGENT_ARN
#   TRANSPORT_AGENT_ARN=$TRANSPORT_AGENT_ARN
#   SNS_TOPIC_ARN=$SNS_TOPIC_ARN
#   AWS_REGION=us-east-1

agentcore launch

export ORCHESTRATOR_AGENT_ARN=<ARN_FROM_OUTPUT>
echo "Orchestrator Agent ARN: $ORCHESTRATOR_AGENT_ARN"
```

---

## Phase 4: Testing & Validation (5 min)

### Step 18: Test APIs

```bash
# Test Transport API
curl http://$EC2_PUBLIC_IP/api/transport/vehicles | jq .

# Test Order API
curl http://$EC2_PUBLIC_IP/api/orders/ | jq .
```

### Step 19: Test Agents

```bash
# Test Transport Agent
aws bedrock-agentcore invoke-agent-runtime \
  --agent-runtime-arn $TRANSPORT_AGENT_ARN \
  --runtime-session-id "test-$(date +%s)-12345678901234567890123456789012" \
  --payload '{"prompt":"Check available vehicles for 2025-10-25. The weight of the cargo is 579 Kg and volume is 12 cubic meters"}' \
  --region $AWS_REGION \
  --query 'response' --output text | jq .

# Test Analyser Agent
aws bedrock-agentcore invoke-agent-runtime \
  --agent-runtime-arn $ANALYSER_AGENT_ARN \
  --runtime-session-id "test-$(date +%s)-12345678901234567890123456789012" \
  --payload '{"prompt":"Analyze order 1"}' \
  --region $AWS_REGION \
  --query 'response' --output text | jq .

# Test Orchestrator (end-to-end)
aws bedrock-agentcore invoke-agent-runtime \
  --agent-runtime-arn $ORCHESTRATOR_AGENT_ARN \
  --runtime-session-id "test-$(date +%s)-12345678901234567890123456789012" \
  --payload '{"prompt":"Process order 1"}' \
  --region $AWS_REGION \
  --query 'response' --output text | jq .
```

### Step 20: Verify S3 and SNS

```bash
# Check S3 for packing layouts
aws s3 ls s3://logistics-packing-layouts/

# Check SNS topic
aws sns get-topic-attributes --topic-arn $SNS_TOPIC_ARN
```

### Step 21: Test Lambda Agent Trigger from UI

```bash
# Test Transport Agent via Lambda
curl -X POST https://<YOUR_API_GATEWAY_ID>.execute-api.us-east-1.amazonaws.com \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Check available vehicles for 2024-12-25",
    "agentRuntimeArn": "'$TRANSPORT_AGENT_ARN'"
  }' | jq .

# Test Analyser Agent via Lambda
curl -X POST https://<YOUR_API_GATEWAY_ID>.execute-api.us-east-1.amazonaws.com \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Analyze order 1 and generate packing layout",
    "agentRuntimeArn": "'$ANALYSER_AGENT_ARN'"
  }' | jq .

# Test Orchestrator Agent via Lambda (end-to-end workflow)
curl -X POST https://<YOUR_API_GATEWAY_ID>.execute-api.us-east-1.amazonaws.com \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Process order 4 end-to-end",
    "agentRuntimeArn": "'$ORCHESTRATOR_AGENT_ARN'"
  }' | jq .
```

---

## Deployment Summary

**Save these values for future reference:**

```bash
cat > deployment-summary.txt <<EOF
=== LOGISTICS MANAGER DEPLOYMENT SUMMARY ===

Date: $(date)
Region: $AWS_REGION
Account: $ACCOUNT_ID

--- EC2 ---
Public IP: $EC2_PUBLIC_IP
Instance Profile: EC2LogisticsProfile
Security Group: $SG_ID

--- APIs ---
Transport API: http://$EC2_PUBLIC_IP/api/transport
Order API: http://$EC2_PUBLIC_IP/api/orders

--- Agents ---
Transport Agent: $TRANSPORT_AGENT_ARN
Analyser Agent: $ANALYSER_AGENT_ARN
Orchestrator Agent: $ORCHESTRATOR_AGENT_ARN

--- Resources ---
S3 Bucket: s3://logistics-packing-layouts
SNS Topic: $SNS_TOPIC_ARN
IAM Role (Agents): $AGENT_RUNTIME_ROLE_ARN
IAM Role (EC2): arn:aws:iam::$ACCOUNT_ID:role/EC2LogisticsRole

--- Monitoring ---
CloudWatch Logs: /aws/ec2/logistics-*, /aws/bedrock-agentcore/logistics-*
CloudWatch Metrics: AWS/BedrockAgentCore

--- Estimated Cost ---
$39-69/month for 10 users

=== DEPLOYMENT COMPLETE ===
EOF

cat deployment-summary.txt
```

---

## Post-Deployment

### Enable CloudWatch Alarms

```bash
# CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name logistics-ec2-high-cpu \
  --alarm-description "Alert when EC2 CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Agent error alarm
aws cloudwatch put-metric-alarm \
  --alarm-name logistics-agent-errors \
  --alarm-description "Alert on agent errors" \
  --metric-name Errors \
  --namespace AWS/BedrockAgentCore \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### Subscribe to SNS Notifications

```bash
# Add your email
aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint your-email@example.com

# Confirm subscription via email
```

### Setup Backup Script (Optional)

```bash
# On EC2, create backup script
ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$EC2_PUBLIC_IP

sudo tee /opt/logistics/backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump -U transport_user transport_db | gzip > /tmp/transport_db_$DATE.sql.gz
pg_dump -U order_user order_db | gzip > /tmp/order_db_$DATE.sql.gz
aws s3 cp /tmp/transport_db_$DATE.sql.gz s3://logistics-packing-layouts/backups/
aws s3 cp /tmp/order_db_$DATE.sql.gz s3://logistics-packing-layouts/backups/
rm /tmp/*_db_$DATE.sql.gz
EOF

sudo chmod +x /opt/logistics/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/logistics/backup.sh") | crontab -
```

---

## Troubleshooting

### APIs not responding
```bash
ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$EC2_PUBLIC_IP
pm2 status
pm2 logs
sudo systemctl status nginx
```

### Agents failing
```bash
# Check CloudWatch logs
aws logs tail /aws/bedrock-agentcore/logistics-transport --follow

# Re-deploy agent
cd agents/transport
agentcore launch
```

### Database connection issues
```bash
ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$EC2_PUBLIC_IP
sudo -u postgres psql -l
sudo systemctl status postgresql
```

---

## Maintenance

### Update Agent Code
```bash
cd agents/transport
# Make changes to agent.py
agentcore launch  # Zero-downtime update
```

### Update API Code
```bash
# On local machine
rsync -avz -e "ssh -i ~/.ssh/$KEY_NAME.pem" \
  transport_api/ ubuntu@$EC2_PUBLIC_IP:/opt/logistics/transport_api/

# On EC2
ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$EC2_PUBLIC_IP
cd /opt/logistics/transport_api
npm install  # If dependencies changed
pm2 reload ecosystem.config.js
```

### View Logs
```bash
# EC2 logs
ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$EC2_PUBLIC_IP
pm2 logs

# Agent logs
aws logs tail /aws/bedrock-agentcore/logistics-orchestrator --follow
```

---

## Cleanup (If Needed)

```bash
# Delete agents
agentcore delete --agent-runtime-arn $TRANSPORT_AGENT_ARN
agentcore delete --agent-runtime-arn $ANALYSER_AGENT_ARN
agentcore delete --agent-runtime-arn $ORCHESTRATOR_AGENT_ARN

# Terminate EC2
aws ec2 terminate-instances --instance-ids <INSTANCE_ID>

# Delete resources
aws s3 rb s3://logistics-packing-layouts --force
aws sns delete-topic --topic-arn $SNS_TOPIC_ARN
aws ecr delete-repository --repository-name logistics-transport --force
aws ecr delete-repository --repository-name logistics-analyser --force
aws ecr delete-repository --repository-name logistics-orchestrator --force
aws iam delete-role --role-name AgentRuntimeRole
aws iam delete-role --role-name EC2LogisticsRole
aws ec2 delete-security-group --group-id $SG_ID
```

---

**Deployment Complete! 🎉**

Your logistics management system is now live at: `http://$EC2_PUBLIC_IP`

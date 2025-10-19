# Analyser Agent

## Overview

The Analyser Agent is responsible for analyzing orders, selecting optimal vehicles, and generating 3D packing layouts for logistics operations.

## Responsibilities

1. **Order Analysis**: Fetch and analyze order details
2. **Vehicle Selection**: Choose the most cost-effective vehicle that meets requirements
3. **Packing Optimization**: Generate 3D packing layout using bin packing algorithm
4. **Validation**: Ensure packing meets safety and efficiency standards
5. **Storage**: Save packing layout to S3 for UI visualization

## Directory Structure

```
analyser/
├── config/
│   └── agent.yaml           # Agent configuration
├── schemas/
│   └── analyser-api.json    # OpenAPI schema for tools
├── instructions/
│   └── base.txt             # Agent instructions
├── knowledge-base/
│   └── packing-guidelines.md # Packing best practices
├── tests/
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
├── agent.py                 # Agent definition
└── README.md                # This file
```

## Configuration

Agent configuration is defined in `config/agent.yaml`:

- **Model**: Claude 3 Sonnet
- **Timeout**: 180 seconds
- **Memory**: Disabled (stateless)
- **Knowledge Base**: Packing guidelines and procedures

## Tools

### 1. fetch_order_details
Fetches order details from DynamoDB.

**Input**: `order_id`  
**Output**: Order with items, customer, addresses

### 2. choose_optimal_vehicle
Selects the best vehicle based on capacity and cost.

**Input**: `items`, `available_vehicles`  
**Output**: Selected vehicle with reason

### 3. generate_packing_layout
Generates 3D packing layout using bin packing algorithm.

**Input**: `items`, `vehicle`  
**Output**: Packing layout with positions

### 4. validate_packing
Validates packing for safety and efficiency.

**Input**: `layout`  
**Output**: Validation result with issues

### 5. save_layout_to_s3
Saves packing layout JSON to S3.

**Input**: `order_id`, `layout`  
**Output**: S3 key and URL

## Usage

### Local Testing

```python
from analyser.agent import analyser_agent

response = analyser_agent(
    "Analyze order ORD-12345 with vehicles: VEH-001, VEH-002"
)
print(response)
```

### Deployment

```bash
# Deploy to Bedrock Agentcore
cd agents/analyser
python deploy.py --environment production
```

### Invocation via Orchestrator

```python
import boto3

bedrock = boto3.client('bedrock-agent-runtime')

response = bedrock.invoke_agent(
    agentId='ANALYSER_AGENT_ID',
    agentAliasId='production',
    sessionId='order-12345',
    inputText='Analyze order ORD-12345 with available vehicles'
)
```

## Packing Algorithm

The agent uses a 3D bin packing algorithm with the following features:

- **Shelf packing**: Layer-by-layer placement
- **Weight-based sorting**: Heavy items at bottom
- **Fragility handling**: Fragile items on top/front
- **Space optimization**: Maximize utilization
- **Multi-container support**: Splits across vehicles if needed

## Performance

- **Average processing time**: 3-5 seconds
- **Packing efficiency**: 80-90% utilization
- **Success rate**: >95%
- **Cost per invocation**: ~$0.01

## Testing

### Run Unit Tests

```bash
cd agents/analyser
pytest tests/unit/ -v
```

### Run Integration Tests

```bash
pytest tests/integration/ -v
```

### Test Coverage

```bash
pytest --cov=analyser tests/
```

## Monitoring

### CloudWatch Metrics

- `AnalyserInvocations`: Total invocations
- `AnalyserLatency`: Processing time
- `AnalyserErrors`: Error count
- `PackingUtilization`: Average utilization %

### CloudWatch Logs

- Log group: `/aws/bedrock/agents/analyser`
- Retention: 7 days
- Insights queries available in `monitoring/queries/`

## Troubleshooting

### Common Issues

**Issue**: No vehicle fits all items  
**Solution**: Agent suggests splitting shipment or upgrading vehicle

**Issue**: Packing validation fails  
**Solution**: Agent retries with different arrangement

**Issue**: S3 upload fails  
**Solution**: Check IAM permissions and bucket policy

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Contributing

1. Create feature branch
2. Add tests for new functionality
3. Update documentation
4. Submit pull request

## Related Documentation

- [Architecture](../../docs/ARCHITECTURE.md)
- [Packing Algorithm](../../ai/logistics_algorithm.py)
- [API Reference](../../docs/API_REFERENCE.md)

## Owner

**Team**: Logistics  
**Primary Contact**: Ashish  
**Slack Channel**: #logistics-agents

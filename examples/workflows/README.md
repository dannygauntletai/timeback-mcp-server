# TimeBack MCP Server - Integration Workflows

This directory contains example workflows that demonstrate how to combine multiple integration patterns to create comprehensive educational technology solutions.

## Available Workflows

### 1. Complete Student Lifecycle Workflow
**File**: `student-lifecycle-workflow.json`
**Description**: End-to-end student management from enrollment to graduation
**Patterns Used**: Server Chaining, Tool Composition, Event-Driven
**Duration**: ~5-10 minutes

### 2. Assessment Creation and Analytics Pipeline
**File**: `assessment-analytics-pipeline.json`
**Description**: Create assessments, track student interactions, and generate analytics
**Patterns Used**: Server Chaining, Shared Resources, SSE Integration
**Duration**: ~3-5 minutes

### 3. Standards Alignment and Mastery Tracking
**File**: `standards-mastery-workflow.json`
**Description**: Align content with CASE standards and track mastery progress
**Patterns Used**: Tool Composition, Event-Driven, Shared Resources
**Duration**: ~2-3 minutes

### 4. Real-time Learning Dashboard
**File**: `realtime-dashboard-workflow.json`
**Description**: Live dashboard showing student progress and system health
**Patterns Used**: SSE Integration, Event-Driven, Shared Resources
**Duration**: Continuous

## Running Workflows

### Prerequisites
1. TimeBack MCP Server running with integration features enabled
2. Required downstream MCP servers connected
3. Valid TimeBack API credentials configured

### Execution
```bash
# Navigate to workflows directory
cd examples/workflows

# Run a specific workflow
node run-workflow.js student-lifecycle-workflow.json

# Run with custom parameters
node run-workflow.js assessment-analytics-pipeline.json --class-id="math-101" --subject="algebra"

# Monitor workflow execution
node monitor-workflow.js workflow-id-12345
```

### Configuration
Each workflow can be customized by editing the JSON configuration files. Common parameters include:
- **Server endpoints**: URLs and connection details for downstream MCP servers
- **API credentials**: Authentication tokens and client IDs
- **Workflow parameters**: Class IDs, student lists, assessment types, etc.
- **Execution settings**: Timeouts, retry policies, parallel execution limits

## Workflow Structure

All workflows follow a consistent structure:

```json
{
  "name": "workflow-name",
  "description": "Workflow description",
  "version": "1.0.0",
  "patterns": ["server_chaining", "tool_composition"],
  "steps": [
    {
      "id": "step-1",
      "server": "server-name",
      "tool": "tool-name",
      "params": {},
      "dependsOn": [],
      "timeout": 30000
    }
  ],
  "errorHandling": {
    "strategy": "continue-on-error",
    "maxRetries": 3
  },
  "notifications": {
    "onComplete": true,
    "onError": true
  }
}
```

## Best Practices

1. **Start Simple**: Begin with single-pattern workflows before combining multiple patterns
2. **Test Incrementally**: Test each step individually before running the complete workflow
3. **Monitor Performance**: Use the SSE dashboard to monitor workflow execution in real-time
4. **Handle Errors Gracefully**: Configure appropriate error handling and retry policies
5. **Document Dependencies**: Clearly document which MCP servers and APIs are required

## Troubleshooting

### Common Issues
- **Connection Timeouts**: Increase timeout values or check server connectivity
- **Authentication Failures**: Verify API credentials and token expiration
- **Dependency Errors**: Ensure all required MCP servers are connected and healthy
- **Resource Conflicts**: Check for concurrent workflows accessing the same resources

### Debug Mode
Enable debug logging to troubleshoot workflow issues:
```bash
DEBUG=timeback:workflow node run-workflow.js workflow-name.json
```

### Health Checks
Verify system health before running workflows:
```bash
curl http://localhost:3001/events/health
curl http://localhost:3000/integration/status
```

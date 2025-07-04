# MCP Server Chaining Pattern Example

This example demonstrates how to chain multiple MCP servers to create a complete student assessment workflow.

## Workflow Overview

```
OneRoster Server → TimeBack MCP Server → Analytics Server
     (Students)      (Assessment Creation)    (Tracking Setup)
```

## Use Case

Create a complete educational workflow that:
1. Fetches student roster from OneRoster API
2. Creates personalized assessments using TimeBack QTI
3. Sets up analytics tracking using Caliper
4. Configures mastery tracking in PowerPath

## Configuration

```env
INTEGRATION_ENABLED=true
INTEGRATION_SERVER_CHAINING=true
INTEGRATION_EVENT_DRIVEN=true
```

## Example Workflow

See [workflow-config.json](./workflow-config.json) for the complete workflow definition.

## Running the Example

1. **Setup Environment**:
   ```bash
   cp ../../configurations/.env.integration .env
   # Edit .env with your credentials
   ```

2. **Start TimeBack MCP Server**:
   ```bash
   npm start
   ```

3. **Execute Workflow**:
   ```bash
   node run-example.js
   ```

## Expected Output

The workflow will:
- Connect to downstream OneRoster and Analytics servers
- Execute each step with dependency resolution
- Provide real-time status updates
- Return comprehensive results with data flow tracking

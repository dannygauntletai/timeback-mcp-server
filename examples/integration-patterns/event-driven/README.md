# Event-Driven Integration Pattern Example

This example demonstrates real-time event notifications for integration status changes, server connections, and workflow completions.

## Overview

The Event-Driven Integration Pattern enables real-time communication between MCP servers through event emission and subscription, allowing systems to react immediately to changes in integration status, server health, and workflow execution.

## Use Case: Real-time Integration Monitoring

Create a responsive educational system that:
1. **Monitors Server Health** - Get notified when MCP servers connect/disconnect
2. **Tracks Workflow Progress** - Receive real-time updates on integration workflow execution
3. **Handles Integration Events** - React to changes in TimeBack integration status
4. **Coordinates Multi-Server Operations** - Synchronize actions across multiple MCP servers

## Configuration

```env
INTEGRATION_ENABLED=true
INTEGRATION_EVENT_DRIVEN=true
INTEGRATION_SSE=true
```

## Event Types

### Server Events
- `server_connected` - New MCP server connected to TimeBack
- `server_disconnected` - MCP server disconnected from TimeBack
- `server_health_changed` - Server health status changed

### Workflow Events  
- `workflow_started` - Integration workflow execution began
- `workflow_step_completed` - Individual workflow step finished
- `workflow_completed` - Complete workflow finished successfully
- `workflow_failed` - Workflow encountered an error

### Integration Events
- `integration_status_changed` - Overall integration status changed
- `pattern_enabled` - New integration pattern was enabled
- `pattern_disabled` - Integration pattern was disabled

## Example Usage

```javascript
// Subscribe to events
integrationManager.addEventListener((event) => {
  switch (event.type) {
    case 'server_connected':
      console.log(`New server connected: ${event.data.connection.name}`);
      break;
    case 'workflow_completed':
      console.log(`Workflow ${event.data.workflowId} completed successfully`);
      break;
    case 'server_disconnected':
      console.log(`Server disconnected: ${event.serverId}`);
      break;
  }
});
```

## Running the Example

1. **Setup Environment**:
   ```bash
   cp ../../configurations/.env.integration .env
   ```

2. **Start TimeBack MCP Server**:
   ```bash
   npm start
   ```

3. **Run Event-Driven Example**:
   ```bash
   node run-example.js
   ```

## Benefits

- **Real-time Responsiveness**: Immediate reaction to system changes
- **Loose Coupling**: Servers don't need direct connections to coordinate
- **Scalability**: Easy to add new event listeners and producers
- **Reliability**: Event history and replay capabilities for missed events

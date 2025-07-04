# Shared Resource Pattern Example

This example demonstrates how to share resources like documentation, schemas, and integration patterns across multiple MCP servers.

## Overview

The Shared Resource Pattern allows multiple MCP servers to access and utilize TimeBack's comprehensive API documentation, integration templates, and server connection information as shared resources.

## Use Case: Multi-Server Documentation Access

Enable multiple educational MCP servers to access:
1. **TimeBack API Documentation** - Complete indexed documentation from all TimeBack APIs
2. **Integration Patterns** - Best practices and templates for common integration scenarios  
3. **Server Connection Info** - Real-time information about connected MCP servers and their capabilities

## Configuration

```env
INTEGRATION_ENABLED=true
INTEGRATION_SHARED_RESOURCES=true
CRAWLER_ENABLED=true
```

## Available Shared Resources

### 1. `timeback://integration/patterns`
Access to integration patterns and best practices

### 2. `timeback://integration/servers` 
Information about connected MCP servers and their capabilities

### 3. `timeback://documentation/indexed`
Complete indexed TimeBack API documentation

## Example Usage

```javascript
// Any MCP server can access TimeBack's shared resources
const patterns = await mcpClient.readResource('timeback://integration/patterns');
const servers = await mcpClient.readResource('timeback://integration/servers');
const docs = await mcpClient.readResource('timeback://documentation/indexed');
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

3. **Run Shared Resource Example**:
   ```bash
   node run-example.js
   ```

## Benefits

- **Centralized Knowledge**: Single source of truth for TimeBack integration information
- **Reduced Duplication**: Multiple servers can share the same documentation and patterns
- **Real-time Updates**: Shared resources are automatically updated as the system changes
- **Cross-Server Collaboration**: Servers can discover and interact with each other through shared connection info

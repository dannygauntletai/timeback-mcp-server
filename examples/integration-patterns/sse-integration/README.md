# SSE-Based Integration Pattern Example (MCP Hive Compatible)

This example demonstrates Server-Sent Events endpoints for real-time integration with MCP Hive and other SSE-compatible systems.

## Overview

The SSE-Based Integration Pattern provides real-time communication through Server-Sent Events, making the TimeBack MCP Server compatible with MCP Hive and other web-based integration systems that require live data streams.

## Use Case: Real-time Dashboard Integration

Create a live dashboard that displays:
1. **Real-time Integration Status** - Live updates on server connections and health
2. **Workflow Execution Monitoring** - Real-time progress of integration workflows
3. **Event Stream Processing** - Live processing of TimeBack integration events
4. **MCP Hive Compatibility** - Full compatibility with MCP Hive event formats

## Configuration

```env
INTEGRATION_ENABLED=true
INTEGRATION_SSE=true
INTEGRATION_SSE_ENABLED=true
INTEGRATION_SSE_PORT=3001
INTEGRATION_SSE_CORS_ORIGINS=*
```

## SSE Endpoints

### Main Event Stream
- `GET /events` - Primary SSE event stream for real-time updates

### Health and Statistics
- `GET /events/health` - Health check endpoint
- `GET /events/stats` - Integration statistics endpoint

### Event Broadcasting
- `POST /events/broadcast` - Broadcast custom events to all connected clients

## MCP Hive Compatibility

This implementation follows MCP Hive standards:
- **Standard SSE Format**: Compatible event structure and headers
- **CORS Support**: Configurable cross-origin resource sharing
- **Health Endpoints**: Standard health check and statistics endpoints
- **Event Schema**: Compatible with MCP Hive event formats

## Example Usage

### JavaScript Client
```javascript
// Connect to SSE stream
const eventSource = new EventSource('http://localhost:3001/events');

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Integration event:', data);
};

// Handle specific event types
eventSource.addEventListener('server_connected', function(event) {
  const data = JSON.parse(event.data);
  console.log('New server connected:', data.connection.name);
});
```

### cURL Examples
```bash
# Connect to event stream
curl -N -H "Accept: text/event-stream" http://localhost:3001/events

# Check health
curl http://localhost:3001/events/health

# Get statistics
curl http://localhost:3001/events/stats

# Broadcast custom event
curl -X POST http://localhost:3001/events/broadcast \
  -H "Content-Type: application/json" \
  -d '{"type": "custom_event", "data": {"message": "Hello World"}}'
```

## Running the Example

1. **Setup Environment**:
   ```bash
   cp ../../configurations/.env.mcp-hive .env
   ```

2. **Start TimeBack MCP Server**:
   ```bash
   npm start
   ```

3. **Run SSE Integration Example**:
   ```bash
   node run-example.js
   ```

4. **Open Browser Dashboard** (optional):
   ```bash
   open dashboard.html
   ```

## Benefits

- **Real-time Updates**: Instant notifications of integration changes
- **Web Compatibility**: Works with any web browser or HTTP client
- **MCP Hive Integration**: Full compatibility with existing MCP Hive systems
- **Scalable**: Supports multiple concurrent SSE connections
- **Standard Protocol**: Uses standard Server-Sent Events specification

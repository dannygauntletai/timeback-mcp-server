# TimeBack MCP Server Integration Examples

This directory contains practical examples demonstrating how to use the TimeBack MCP Server's integration patterns with other MCP servers.

## Integration Patterns

### 1. MCP Server Chaining Pattern
- **Example**: [Student Assessment Workflow](./server-chaining/)
- **Use Case**: Chain OneRoster → TimeBack → Analytics servers for complete student assessment pipeline

### 2. Tool Composition Pattern  
- **Example**: [Student Onboarding Composite](./tool-composition/)
- **Use Case**: Combine user creation, enrollment, and assessment setup into single tool

### 3. Shared Resource Pattern
- **Example**: [Documentation Sharing](./shared-resources/)
- **Use Case**: Share TimeBack API documentation across multiple educational MCP servers

### 4. Event-Driven Integration Pattern
- **Example**: [Real-time Notifications](./event-driven/)
- **Use Case**: Real-time notifications for integration status and workflow completion

### 5. SSE-Based Integration Pattern
- **Example**: [MCP Hive Integration](./sse-integration/)
- **Use Case**: Real-time dashboard integration with MCP Hive-compatible systems

## Quick Start

1. **Enable Integration Features**:
   ```bash
   cp examples/configurations/.env.integration .env
   ```

2. **Start TimeBack MCP Server**:
   ```bash
   npm start
   ```

3. **Run Example Workflow**:
   ```bash
   # Choose an example from the patterns above
   cd examples/integration-patterns/server-chaining
   node run-example.js
   ```

## Configuration Templates

See the [configurations](../configurations/) directory for ready-to-use environment variable templates for different integration scenarios.

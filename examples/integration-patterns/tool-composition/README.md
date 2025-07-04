# Tool Composition Pattern Example

This example demonstrates how to compose tools from multiple MCP servers into unified operations that appear as single tools to clients.

## Overview

The Tool Composition Pattern allows you to create "super tools" that combine functionality from multiple MCP servers, presenting them as a single, cohesive operation to end users.

## Use Case: Complete Student Onboarding

Create a single `complete-student-onboarding` tool that:
1. Creates user account (OneRoster Server)
2. Enrolls in classes (OneRoster Server) 
3. Sets up initial assessment profile (TimeBack QTI)
4. Configures analytics tracking (Analytics Server)
5. Initializes mastery learning path (TimeBack PowerPath)

## Configuration

```env
INTEGRATION_ENABLED=true
INTEGRATION_TOOL_COMPOSITION=true
INTEGRATION_SHARED_RESOURCES=true
```

## Example Usage

```javascript
// Instead of calling 5 separate tools across 3 servers:
// ❌ Complex multi-step process

// Use the composed tool:
// ✅ Single tool call
await mcpClient.callTool('complete-student-onboarding', {
  student: {
    name: 'Alice Johnson',
    email: 'alice.johnson@school.edu',
    grade: 6
  },
  classes: ['math-101', 'science-101'],
  assessmentProfile: 'adaptive-learning',
  trackingLevel: 'detailed'
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

3. **Run Composition Example**:
   ```bash
   node run-example.js
   ```

## Benefits

- **Simplified Client Code**: Single tool call instead of complex orchestration
- **Atomic Operations**: All-or-nothing execution with rollback capabilities
- **Consistent Interface**: Unified parameter structure and error handling
- **Performance**: Optimized execution with parallel operations where possible

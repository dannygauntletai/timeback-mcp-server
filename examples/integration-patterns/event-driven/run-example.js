#!/usr/bin/env node

/**
 * Event-Driven Integration Pattern Example
 * 
 * This example demonstrates real-time event notifications for
 * integration status changes and multi-server coordination.
 */

const EventEmitter = require('events');

class MockIntegrationEventManager extends EventEmitter {
  constructor() {
    super();
    this.eventHistory = [];
    this.subscribers = new Map();
  }

  emitIntegrationEvent(event) {
    const timestampedEvent = {
      ...event,
      timestamp: Date.now(),
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.eventHistory.push(timestampedEvent);
    
    this.emit('integration_event', timestampedEvent);
    
    console.log(`📡 Event emitted: ${event.type} (${timestampedEvent.id})`);
    return timestampedEvent;
  }

  subscribe(serverId, callback) {
    if (!this.subscribers.has(serverId)) {
      this.subscribers.set(serverId, []);
    }
    this.subscribers.get(serverId).push(callback);
    
    this.on('integration_event', callback);
    
    console.log(`🔔 Server ${serverId} subscribed to events`);
  }

  unsubscribe(serverId, callback) {
    if (this.subscribers.has(serverId)) {
      const callbacks = this.subscribers.get(serverId);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        this.removeListener('integration_event', callback);
        console.log(`🔕 Server ${serverId} unsubscribed from events`);
      }
    }
  }

  getEventHistory(filter = {}) {
    let filtered = this.eventHistory;
    
    if (filter.type) {
      filtered = filtered.filter(event => event.type === filter.type);
    }
    
    if (filter.serverId) {
      filtered = filtered.filter(event => event.serverId === filter.serverId);
    }
    
    if (filter.since) {
      filtered = filtered.filter(event => event.timestamp >= filter.since);
    }
    
    return filtered;
  }
}

class MockReactiveMcpServer {
  constructor(serverId, name) {
    this.serverId = serverId;
    this.name = name;
    this.status = 'disconnected';
    this.eventManager = null;
    this.eventCallback = null;
    this.actionsPerformed = [];
  }

  connect(eventManager) {
    this.eventManager = eventManager;
    this.status = 'connected';
    
    this.eventCallback = (event) => this.handleIntegrationEvent(event);
    this.eventManager.subscribe(this.serverId, this.eventCallback);
    
    this.eventManager.emitIntegrationEvent({
      type: 'server_connected',
      serverId: this.serverId,
      data: {
        connection: {
          id: this.serverId,
          name: this.name,
          transport: 'mock',
          capabilities: {
            tools: [`${this.name.toLowerCase()}-tool-1`, `${this.name.toLowerCase()}-tool-2`],
            resources: [`${this.name.toLowerCase()}://data`],
            prompts: [`${this.name.toLowerCase()}-prompt`]
          }
        }
      }
    });
    
    console.log(`✅ ${this.name} connected to integration event system`);
  }

  disconnect() {
    if (this.eventManager && this.eventCallback) {
      this.eventManager.unsubscribe(this.serverId, this.eventCallback);
      
      this.eventManager.emitIntegrationEvent({
        type: 'server_disconnected',
        serverId: this.serverId,
        data: { reason: 'manual_disconnect' }
      });
    }
    
    this.status = 'disconnected';
    console.log(`❌ ${this.name} disconnected from integration event system`);
  }

  handleIntegrationEvent(event) {
    if (event.serverId === this.serverId) {
      return;
    }

    console.log(`🔔 [${this.name}] Received event: ${event.type} from ${event.serverId || 'system'}`);

    switch (event.type) {
      case 'server_connected':
        this.onServerConnected(event);
        break;
      case 'server_disconnected':
        this.onServerDisconnected(event);
        break;
      case 'workflow_started':
        this.onWorkflowStarted(event);
        break;
      case 'workflow_completed':
        this.onWorkflowCompleted(event);
        break;
      case 'workflow_failed':
        this.onWorkflowFailed(event);
        break;
      case 'integration_status_changed':
        this.onIntegrationStatusChanged(event);
        break;
    }
  }

  onServerConnected(event) {
    const action = `Discovered new server: ${event.data.connection.name}`;
    this.actionsPerformed.push(action);
    console.log(`   🤝 [${this.name}] ${action}`);
    
    const tools = event.data.connection.capabilities.tools;
    if (tools.some(tool => tool.includes('student') || tool.includes('assessment'))) {
      const integrationAction = `Identified potential integration with ${event.data.connection.name}`;
      this.actionsPerformed.push(integrationAction);
      console.log(`   🔗 [${this.name}] ${integrationAction}`);
    }
  }

  onServerDisconnected(event) {
    const action = `Server ${event.serverId} disconnected - updating integration mappings`;
    this.actionsPerformed.push(action);
    console.log(`   ⚠️  [${this.name}] ${action}`);
  }

  onWorkflowStarted(event) {
    const action = `Monitoring workflow: ${event.data.workflowId}`;
    this.actionsPerformed.push(action);
    console.log(`   👀 [${this.name}] ${action}`);
  }

  onWorkflowCompleted(event) {
    const action = `Workflow ${event.data.workflowId} completed - processing results`;
    this.actionsPerformed.push(action);
    console.log(`   ✅ [${this.name}] ${action}`);
    
    if (event.data.results && event.data.results.length > 0) {
      const followUpAction = `Triggered follow-up actions based on workflow results`;
      this.actionsPerformed.push(followUpAction);
      console.log(`   🚀 [${this.name}] ${followUpAction}`);
    }
  }

  onWorkflowFailed(event) {
    const action = `Workflow ${event.data.workflowId} failed - initiating recovery`;
    this.actionsPerformed.push(action);
    console.log(`   🚨 [${this.name}] ${action}`);
  }

  onIntegrationStatusChanged(event) {
    const action = `Integration status changed to ${event.data.status} - adapting behavior`;
    this.actionsPerformed.push(action);
    console.log(`   🔄 [${this.name}] ${action}`);
  }

  getActionsSummary() {
    return {
      serverId: this.serverId,
      name: this.name,
      status: this.status,
      totalActions: this.actionsPerformed.length,
      actions: this.actionsPerformed
    };
  }
}

async function runEventDrivenExample() {
  console.log('🚀 TimeBack MCP Server - Event-Driven Integration Pattern Example');
  console.log('=' .repeat(70));

  try {
    const eventManager = new MockIntegrationEventManager();
    console.log('📡 Integration Event Manager initialized');
    console.log('');

    const servers = [
      new MockReactiveMcpServer('lms-server-001', 'LMS Integration Server'),
      new MockReactiveMcpServer('analytics-server-002', 'Analytics Server'),
      new MockReactiveMcpServer('assessment-server-003', 'Assessment Server')
    ];

    console.log('🖥️  Created 3 reactive MCP servers:');
    servers.forEach(server => {
      console.log(`   • ${server.name} (${server.serverId})`);
    });
    console.log('');

    console.log('🔗 Connecting servers to event-driven integration system...');
    console.log('');
    
    for (const server of servers) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Stagger connections
      server.connect(eventManager);
    }

    console.log('');
    console.log('📊 Event-driven integration system active!');
    console.log(`   • Connected servers: ${servers.length}`);
    console.log(`   • Event subscribers: ${eventManager.subscribers.size}`);
    console.log('');

    console.log('🎭 Simulating integration events...');
    console.log('=' .repeat(50));

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('');
    console.log('1️⃣  Simulating workflow start...');
    eventManager.emitIntegrationEvent({
      type: 'workflow_started',
      serverId: 'timeback-server',
      data: {
        workflowId: 'student-assessment-workflow-001',
        name: 'Student Assessment Pipeline',
        steps: ['fetch-students', 'create-assessments', 'setup-tracking']
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('');
    console.log('2️⃣  Simulating integration status change...');
    eventManager.emitIntegrationEvent({
      type: 'integration_status_changed',
      serverId: 'timeback-server',
      data: {
        status: 'healthy',
        previousStatus: 'degraded',
        connectedServers: 5,
        activeWorkflows: 2
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('');
    console.log('3️⃣  Simulating workflow completion...');
    eventManager.emitIntegrationEvent({
      type: 'workflow_completed',
      serverId: 'timeback-server',
      data: {
        workflowId: 'student-assessment-workflow-001',
        executionTime: '2.3 seconds',
        results: [
          { step: 'fetch-students', success: true, count: 25 },
          { step: 'create-assessments', success: true, count: 25 },
          { step: 'setup-tracking', success: true, profiles: 25 }
        ]
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('');
    console.log('4️⃣  Simulating server disconnection...');
    servers[2].disconnect(); // Assessment server disconnects

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('');
    console.log('5️⃣  Simulating workflow failure...');
    eventManager.emitIntegrationEvent({
      type: 'workflow_failed',
      serverId: 'timeback-server',
      data: {
        workflowId: 'grade-sync-workflow-002',
        error: 'Connection timeout to LMS server',
        failedStep: 'sync-grades',
        retryAttempts: 3
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('');
    console.log('📊 Event-Driven Integration Results:');
    console.log('=' .repeat(50));

    const eventHistory = eventManager.getEventHistory();
    console.log(`📚 Total events processed: ${eventHistory.length}`);
    console.log('');

    console.log('🤖 Server Reactions Summary:');
    servers.forEach(server => {
      const summary = server.getActionsSummary();
      const statusIcon = summary.status === 'connected' ? '🟢' : '🔴';
      console.log(`   ${statusIcon} ${summary.name}:`);
      console.log(`      Status: ${summary.status}`);
      console.log(`      Actions performed: ${summary.totalActions}`);
      if (summary.actions.length > 0) {
        summary.actions.forEach(action => {
          console.log(`      • ${action}`);
        });
      }
      console.log('');
    });

    const eventTypes = {};
    eventHistory.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });

    console.log('📈 Event Type Breakdown:');
    Object.entries(eventTypes).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count} events`);
    });

    console.log('');
    console.log('🔍 Recent Event History (last 3 events):');
    eventHistory.slice(-3).forEach(event => {
      const timeAgo = Math.round((Date.now() - event.timestamp) / 1000);
      console.log(`   • ${event.type} (${timeAgo}s ago) - ${event.id}`);
    });

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('🏁 Event-Driven Integration Pattern Example Complete');
  console.log('');
  console.log('💡 Key Benefits Demonstrated:');
  console.log('   ✅ Real-time responsiveness to system changes');
  console.log('   ✅ Loose coupling between MCP servers');
  console.log('   ✅ Automatic coordination and reaction to events');
  console.log('   ✅ Event history and replay capabilities');
  console.log('   ✅ Scalable event-driven architecture');
  console.log('');
  console.log('🔧 Integration Patterns Shown:');
  console.log('   • Server discovery and capability detection');
  console.log('   • Workflow monitoring and follow-up actions');
  console.log('   • Failure detection and recovery initiation');
  console.log('   • Status change adaptation and behavior modification');
}

if (require.main === module) {
  runEventDrivenExample().catch(console.error);
}

module.exports = { runEventDrivenExample };

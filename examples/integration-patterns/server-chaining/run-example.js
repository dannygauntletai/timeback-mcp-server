#!/usr/bin/env node

/**
 * MCP Server Chaining Pattern Example
 * 
 * This example demonstrates how to use the TimeBack MCP Server's
 * server chaining capabilities to create complex educational workflows.
 */

const fs = require('fs');
const path = require('path');

class MockMcpClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.connected = false;
  }

  async connect() {
    console.log(`🔗 Connecting to TimeBack MCP Server at ${this.serverUrl}`);
    this.connected = true;
    return { success: true };
  }

  async callTool(toolName, args) {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    console.log(`🛠️  Calling tool: ${toolName}`);
    console.log(`📋 Arguments:`, JSON.stringify(args, null, 2));

    await new Promise(resolve => setTimeout(resolve, 1000));

    switch (toolName) {
      case 'compose-integration-workflow':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              workflowId: `workflow_${Date.now()}`,
              status: 'completed',
              results: {
                'fetch-class-roster': {
                  success: true,
                  students: [
                    { id: 'student-1', name: 'Alice Johnson', grade: 6 },
                    { id: 'student-2', name: 'Bob Smith', grade: 6 },
                    { id: 'student-3', name: 'Carol Davis', grade: 6 }
                  ]
                },
                'analyze-student-data': {
                  success: true,
                  profiles: [
                    { studentId: 'student-1', level: 'advanced', preferences: ['visual'] },
                    { studentId: 'student-2', level: 'intermediate', preferences: ['kinesthetic'] },
                    { studentId: 'student-3', level: 'beginner', preferences: ['auditory'] }
                  ]
                },
                'create-personalized-assessments': {
                  success: true,
                  assessments: [
                    { id: 'assessment-1', studentId: 'student-1', difficulty: 'hard' },
                    { id: 'assessment-2', studentId: 'student-2', difficulty: 'medium' },
                    { id: 'assessment-3', studentId: 'student-3', difficulty: 'easy' }
                  ]
                },
                'setup-caliper-tracking': {
                  success: true,
                  trackingProfiles: ['profile-1', 'profile-2', 'profile-3']
                },
                'configure-powerpath-mastery': {
                  success: true,
                  masteryPaths: ['path-1', 'path-2', 'path-3']
                },
                'align-case-standards': {
                  success: true,
                  alignments: ['alignment-1', 'alignment-2', 'alignment-3']
                },
                'finalize-workflow': {
                  success: true,
                  validation: 'passed',
                  integrationHealth: 'healthy'
                }
              },
              executionTime: '2.3 seconds',
              serversUsed: ['oneroster-server', 'timeback', 'analytics-server']
            }, null, 2)
          }]
        };

      case 'get-integration-status':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              initialized: true,
              stats: {
                connectedServers: 2,
                totalTools: 15,
                totalResources: 8,
                activeWorkflows: 1,
                completedWorkflows: 0,
                failedWorkflows: 0
              },
              enabledPatterns: [
                { name: 'server_chaining', description: 'Chain multiple MCP servers for complex workflows' },
                { name: 'event_driven', description: 'Event-driven integration notifications' }
              ],
              connectedServers: [
                { id: 'server_oneroster_1234', name: 'oneroster-server', status: 'connected', toolCount: 8 },
                { id: 'server_analytics_5678', name: 'analytics-server', status: 'connected', toolCount: 7 }
              ]
            }, null, 2)
          }]
        };

      default:
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, message: `Tool ${toolName} executed successfully` }, null, 2)
          }]
        };
    }
  }
}

async function runServerChainingExample() {
  console.log('🚀 TimeBack MCP Server - Server Chaining Pattern Example');
  console.log('=' .repeat(60));

  try {
    const workflowPath = path.join(__dirname, 'workflow-config.json');
    const workflowConfig = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    console.log(`📋 Loaded workflow: ${workflowConfig.name}`);
    console.log(`📝 Description: ${workflowConfig.description}`);
    console.log(`🔧 Steps: ${workflowConfig.workflow.length}`);
    console.log('');

    const client = new MockMcpClient('stdio://timeback-mcp-server');
    await client.connect();
    console.log('✅ Connected to TimeBack MCP Server');
    console.log('');

    console.log('📊 Checking integration status...');
    const statusResult = await client.callTool('get-integration-status', {});
    const status = JSON.parse(statusResult.content[0].text);
    console.log(`✅ Integration initialized: ${status.initialized}`);
    console.log(`🔗 Connected servers: ${status.stats.connectedServers}`);
    console.log(`🛠️  Available tools: ${status.stats.totalTools}`);
    console.log('');

    console.log('🔄 Executing server chaining workflow...');
    console.log('');

    const workflowResult = await client.callTool('compose-integration-workflow', {
      name: workflowConfig.name,
      workflow: workflowConfig.workflow
    });

    const result = JSON.parse(workflowResult.content[0].text);

    if (result.success) {
      console.log('✅ Workflow completed successfully!');
      console.log(`⏱️  Execution time: ${result.executionTime}`);
      console.log(`🖥️  Servers used: ${result.serversUsed.join(', ')}`);
      console.log('');

      console.log('📊 Workflow Results Summary:');
      console.log('-'.repeat(40));
      
      Object.entries(result.results).forEach(([stepId, stepResult]) => {
        const step = workflowConfig.workflow.find(s => s.id === stepId);
        console.log(`✅ ${step?.description || stepId}: ${stepResult.success ? 'SUCCESS' : 'FAILED'}`);
      });

      console.log('');
      console.log('🎯 Integration Points Created:');
      console.log(`   • ${result.results['fetch-class-roster'].students.length} students processed`);
      console.log(`   • ${result.results['create-personalized-assessments'].assessments.length} personalized assessments created`);
      console.log(`   • ${result.results['setup-caliper-tracking'].trackingProfiles.length} analytics tracking profiles`);
      console.log(`   • ${result.results['configure-powerpath-mastery'].masteryPaths.length} mastery learning paths`);
      console.log(`   • ${result.results['align-case-standards'].alignments.length} standards alignments`);

    } else {
      console.log('❌ Workflow failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('🏁 Server Chaining Pattern Example Complete');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   • Try the Tool Composition Pattern example');
  console.log('   • Explore the Event-Driven Integration example');
  console.log('   • Check out the SSE-Based Integration for real-time dashboards');
}

if (require.main === module) {
  runServerChainingExample().catch(console.error);
}

module.exports = { runServerChainingExample };

#!/usr/bin/env node

/**
 * Shared Resource Pattern Example
 * 
 * This example demonstrates how multiple MCP servers can access
 * shared resources from the TimeBack MCP Server.
 */

class MockMcpClient {
  constructor(serverUrl, serverName) {
    this.serverUrl = serverUrl;
    this.serverName = serverName;
    this.connected = false;
  }

  async connect() {
    console.log(`🔗 [${this.serverName}] Connecting to TimeBack MCP Server at ${this.serverUrl}`);
    this.connected = true;
    return { success: true };
  }

  async readResource(resourceUri) {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    console.log(`📚 [${this.serverName}] Reading resource: ${resourceUri}`);

    await new Promise(resolve => setTimeout(resolve, 500));

    switch (resourceUri) {
      case 'timeback://integration/patterns':
        return {
          contents: [{
            uri: resourceUri,
            mimeType: 'application/json',
            text: JSON.stringify({
              patterns: [
                {
                  name: 'student-data-sync',
                  description: 'Synchronize student data between OneRoster and Caliper',
                  apis: ['oneroster', 'caliper'],
                  difficulty: 'intermediate',
                  steps: [
                    'Fetch student roster from OneRoster',
                    'Map student data to Caliper Person entities',
                    'Create Caliper tracking profiles',
                    'Set up real-time sync triggers'
                  ],
                  codeExample: 'const students = await oneRoster.getStudents(); const persons = students.map(mapToPerson);'
                },
                {
                  name: 'assessment-workflow',
                  description: 'Complete assessment creation and tracking workflow',
                  apis: ['qti', 'caliper', 'powerpath'],
                  difficulty: 'advanced',
                  steps: [
                    'Create QTI assessment items',
                    'Configure Caliper event tracking',
                    'Set up PowerPath mastery objectives',
                    'Implement adaptive scoring'
                  ],
                  codeExample: 'const assessment = await qti.createAssessment(config); await caliper.trackAssessment(assessment.id);'
                },
                {
                  name: 'standards-alignment',
                  description: 'Align educational content with CASE standards',
                  apis: ['case', 'qti', 'powerpath'],
                  difficulty: 'intermediate',
                  steps: [
                    'Fetch relevant CASE standards',
                    'Map content to standards',
                    'Create alignment metadata',
                    'Validate alignment quality'
                  ],
                  codeExample: 'const standards = await case.getStandards(grade); const alignments = mapContentToStandards(content, standards);'
                }
              ],
              metadata: {
                lastUpdated: new Date().toISOString(),
                totalPatterns: 3,
                source: 'TimeBack MCP Server'
              }
            }, null, 2)
          }]
        };

      case 'timeback://integration/servers':
        return {
          contents: [{
            uri: resourceUri,
            mimeType: 'application/json',
            text: JSON.stringify({
              connectedServers: [
                {
                  id: 'server_oneroster_001',
                  name: 'OneRoster MCP Server',
                  status: 'connected',
                  transport: 'sse',
                  url: 'http://localhost:3002',
                  capabilities: {
                    tools: ['get-students', 'create-user', 'bulk-enroll', 'get-classes'],
                    resources: ['oneroster://students', 'oneroster://classes'],
                    prompts: ['student-onboarding', 'class-management']
                  },
                  lastSeen: new Date(Date.now() - 30000).toISOString(),
                  healthStatus: 'healthy'
                },
                {
                  id: 'server_analytics_002',
                  name: 'Analytics MCP Server',
                  status: 'connected',
                  transport: 'http',
                  url: 'http://localhost:3003',
                  capabilities: {
                    tools: ['track-event', 'create-profile', 'generate-report'],
                    resources: ['analytics://events', 'analytics://profiles'],
                    prompts: ['setup-tracking', 'analyze-performance']
                  },
                  lastSeen: new Date(Date.now() - 15000).toISOString(),
                  healthStatus: 'healthy'
                },
                {
                  id: 'server_lms_003',
                  name: 'LMS Integration Server',
                  status: 'degraded',
                  transport: 'websocket',
                  url: 'ws://localhost:3004',
                  capabilities: {
                    tools: ['sync-grades', 'create-assignment', 'notify-students'],
                    resources: ['lms://courses', 'lms://assignments'],
                    prompts: ['grade-sync', 'assignment-creation']
                  },
                  lastSeen: new Date(Date.now() - 120000).toISOString(),
                  healthStatus: 'degraded',
                  issues: ['High response latency', 'Intermittent connection drops']
                }
              ],
              statistics: {
                totalServers: 3,
                healthyServers: 2,
                degradedServers: 1,
                totalTools: 10,
                totalResources: 6,
                totalPrompts: 6
              },
              metadata: {
                lastUpdated: new Date().toISOString(),
                source: 'TimeBack Integration Manager'
              }
            }, null, 2)
          }]
        };

      case 'timeback://documentation/indexed':
        return {
          contents: [{
            uri: resourceUri,
            mimeType: 'application/json',
            text: JSON.stringify({
              documentation: {
                qti: {
                  title: 'QTI Assessment API Documentation',
                  description: 'Complete documentation for Question & Test Interoperability API',
                  endpoints: [
                    { path: '/assessments', method: 'GET', description: 'List all assessments' },
                    { path: '/assessments', method: 'POST', description: 'Create new assessment' },
                    { path: '/assessments/{id}/items', method: 'GET', description: 'Get assessment items' }
                  ],
                  schemas: ['Assessment', 'AssessmentItem', 'AssessmentResult'],
                  examples: [
                    {
                      title: 'Create Assessment',
                      code: 'POST /assessments\n{\n  "title": "Math Quiz",\n  "subject": "mathematics"\n}'
                    }
                  ],
                  lastCrawled: new Date(Date.now() - 3600000).toISOString()
                },
                oneroster: {
                  title: 'OneRoster Student Information API',
                  description: 'Student information system integration API',
                  endpoints: [
                    { path: '/users', method: 'GET', description: 'List users (students, teachers)' },
                    { path: '/classes', method: 'GET', description: 'List classes' },
                    { path: '/enrollments', method: 'GET', description: 'List enrollments' }
                  ],
                  schemas: ['User', 'Class', 'Enrollment', 'Grade'],
                  examples: [
                    {
                      title: 'Get Students',
                      code: 'GET /users?role=student\n{\n  "users": [\n    {\n      "sourcedId": "student-1",\n      "givenName": "Alice"\n    }\n  ]\n}'
                    }
                  ],
                  lastCrawled: new Date(Date.now() - 1800000).toISOString()
                },
                caliper: {
                  title: 'Caliper Learning Analytics API',
                  description: 'Learning analytics and activity tracking API',
                  endpoints: [
                    { path: '/events', method: 'POST', description: 'Send learning events' },
                    { path: '/entities', method: 'GET', description: 'Get learning entities' }
                  ],
                  schemas: ['Event', 'Person', 'DigitalResource', 'Assessment'],
                  examples: [
                    {
                      title: 'Track Assessment Event',
                      code: 'POST /events\n{\n  "@type": "AssessmentEvent",\n  "actor": {"@id": "student-1"},\n  "object": {"@id": "assessment-1"}\n}'
                    }
                  ],
                  lastCrawled: new Date(Date.now() - 7200000).toISOString()
                }
              },
              searchIndex: {
                totalDocuments: 156,
                totalEndpoints: 47,
                totalSchemas: 23,
                totalExamples: 89,
                lastIndexed: new Date().toISOString()
              },
              metadata: {
                crawlerVersion: '2.1.0',
                source: 'TimeBack Documentation Crawler'
              }
            }, null, 2)
          }]
        };

      default:
        throw new Error(`Unknown resource: ${resourceUri}`);
    }
  }
}

async function runSharedResourceExample() {
  console.log('🚀 TimeBack MCP Server - Shared Resource Pattern Example');
  console.log('=' .repeat(60));

  try {
    const servers = [
      new MockMcpClient('stdio://timeback-mcp-server', 'LMS-Server'),
      new MockMcpClient('stdio://timeback-mcp-server', 'Analytics-Server'),
      new MockMcpClient('stdio://timeback-mcp-server', 'Assessment-Server')
    ];

    console.log('🌐 Simulating multiple MCP servers accessing shared TimeBack resources');
    console.log('');

    for (const server of servers) {
      await server.connect();
    }
    console.log('✅ All servers connected to TimeBack MCP Server');
    console.log('');

    console.log('📚 Accessing Shared Resources:');
    console.log('=' .repeat(40));

    console.log('');
    console.log('🔍 LMS Server accessing integration patterns...');
    const patterns = await servers[0].readResource('timeback://integration/patterns');
    const patternsData = JSON.parse(patterns.contents[0].text);
    
    console.log(`✅ Found ${patternsData.patterns.length} integration patterns:`);
    patternsData.patterns.forEach(pattern => {
      console.log(`   • ${pattern.name}: ${pattern.description}`);
      console.log(`     APIs: ${pattern.apis.join(', ')} | Difficulty: ${pattern.difficulty}`);
    });

    console.log('');
    console.log('🔍 Analytics Server accessing connected servers info...');
    const serversInfo = await servers[1].readResource('timeback://integration/servers');
    const serversData = JSON.parse(serversInfo.contents[0].text);
    
    console.log(`✅ Found ${serversData.connectedServers.length} connected servers:`);
    serversData.connectedServers.forEach(server => {
      const statusIcon = server.status === 'connected' ? '🟢' : server.status === 'degraded' ? '🟡' : '🔴';
      console.log(`   ${statusIcon} ${server.name} (${server.transport})`);
      console.log(`     Tools: ${server.capabilities.tools.length} | Resources: ${server.capabilities.resources.length}`);
      if (server.issues) {
        console.log(`     Issues: ${server.issues.join(', ')}`);
      }
    });

    console.log('');
    console.log('🔍 Assessment Server accessing indexed documentation...');
    const docs = await servers[2].readResource('timeback://documentation/indexed');
    const docsData = JSON.parse(docs.contents[0].text);
    
    console.log(`✅ Accessed documentation for ${Object.keys(docsData.documentation).length} APIs:`);
    Object.entries(docsData.documentation).forEach(([api, info]) => {
      console.log(`   📖 ${api.toUpperCase()}: ${info.title}`);
      console.log(`     Endpoints: ${info.endpoints.length} | Schemas: ${info.schemas.length} | Examples: ${info.examples.length}`);
    });

    console.log('');
    console.log('📊 Search Index Statistics:');
    console.log(`   • Total documents: ${docsData.searchIndex.totalDocuments}`);
    console.log(`   • Total endpoints: ${docsData.searchIndex.totalEndpoints}`);
    console.log(`   • Total schemas: ${docsData.searchIndex.totalSchemas}`);
    console.log(`   • Total examples: ${docsData.searchIndex.totalExamples}`);

    console.log('');
    console.log('🔄 Demonstrating Cross-Server Resource Sharing:');
    console.log('-'.repeat(50));

    console.log('');
    console.log('💡 LMS Server using shared patterns for student sync:');
    const studentSyncPattern = patternsData.patterns.find(p => p.name === 'student-data-sync');
    if (studentSyncPattern) {
      console.log(`   📋 Pattern: ${studentSyncPattern.description}`);
      console.log(`   🔧 Required APIs: ${studentSyncPattern.apis.join(', ')}`);
      console.log(`   📝 Steps: ${studentSyncPattern.steps.length} steps identified`);
      console.log(`   💻 Code example available: ${studentSyncPattern.codeExample.substring(0, 50)}...`);
    }

    console.log('');
    console.log('💡 Analytics Server discovering available integration endpoints:');
    const oneRosterServer = serversData.connectedServers.find(s => s.name.includes('OneRoster'));
    if (oneRosterServer) {
      console.log(`   🔗 Found OneRoster server: ${oneRosterServer.id}`);
      console.log(`   🛠️  Available tools: ${oneRosterServer.capabilities.tools.join(', ')}`);
      console.log(`   📚 Available resources: ${oneRosterServer.capabilities.resources.join(', ')}`);
    }

    console.log('');
    console.log('💡 Assessment Server using shared documentation for API calls:');
    const qtiDocs = docsData.documentation.qti;
    console.log(`   📖 QTI API: ${qtiDocs.endpoints.length} endpoints documented`);
    console.log(`   🔍 Example endpoint: ${qtiDocs.endpoints[0].method} ${qtiDocs.endpoints[0].path}`);
    console.log(`   📝 Description: ${qtiDocs.endpoints[0].description}`);

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('🏁 Shared Resource Pattern Example Complete');
  console.log('');
  console.log('💡 Key Benefits Demonstrated:');
  console.log('   ✅ Centralized knowledge sharing across multiple MCP servers');
  console.log('   ✅ Real-time access to integration patterns and best practices');
  console.log('   ✅ Dynamic discovery of connected servers and their capabilities');
  console.log('   ✅ Comprehensive API documentation available to all servers');
  console.log('   ✅ Reduced duplication and improved consistency across integrations');
}

if (require.main === module) {
  runSharedResourceExample().catch(console.error);
}

module.exports = { runSharedResourceExample };

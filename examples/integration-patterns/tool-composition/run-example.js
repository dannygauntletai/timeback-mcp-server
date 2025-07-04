#!/usr/bin/env node

/**
 * Tool Composition Pattern Example
 * 
 * This example demonstrates how to create composed tools that combine
 * functionality from multiple MCP servers into unified operations.
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

    console.log(`🛠️  Calling composed tool: ${toolName}`);
    console.log(`📋 Arguments:`, JSON.stringify(args, null, 2));

    const startTime = Date.now();
    
    if (toolName === 'complete-student-onboarding') {
      console.log('');
      console.log('🔄 Executing composed tool steps:');
      
      const steps = [
        '1️⃣  Creating user account in OneRoster...',
        '2️⃣  Enrolling student in classes...',
        '3️⃣  Setting up QTI assessment profile...',
        '4️⃣  Configuring Caliper analytics tracking...',
        '5️⃣  Initializing PowerPath mastery learning...',
        '6️⃣  Validating complete onboarding...'
      ];

      for (const step of steps) {
        console.log(`   ${step}`);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const executionTime = Date.now() - startTime;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            studentId: 'student_alice_johnson_001',
            enrollments: [
              { classId: 'math-101', enrollmentId: 'enroll_001', status: 'active' },
              { classId: 'science-101', enrollmentId: 'enroll_002', status: 'active' }
            ],
            assessmentProfileId: 'qti_profile_adaptive_001',
            trackingProfileId: 'caliper_tracking_detailed_001',
            masteryPathId: 'powerpath_mastery_001',
            validationResults: {
              userAccount: 'valid',
              enrollments: 'valid',
              assessmentProfile: 'valid',
              trackingProfile: 'valid',
              masteryPath: 'valid',
              overallStatus: 'healthy'
            },
            executionSummary: {
              totalSteps: 6,
              successfulSteps: 6,
              failedSteps: 0,
              executionTime: `${executionTime}ms`,
              serversUsed: ['oneroster-server', 'timeback', 'analytics-server'],
              parallelOperations: 3
            },
            integrationPoints: {
              oneRosterIntegration: {
                userId: 'student_alice_johnson_001',
                enrollmentCount: 2,
                status: 'active'
              },
              qtiIntegration: {
                profileId: 'qti_profile_adaptive_001',
                adaptiveSettings: {
                  enabled: true,
                  initialDifficulty: 'medium',
                  progressTracking: true
                }
              },
              caliperIntegration: {
                trackingId: 'caliper_tracking_detailed_001',
                eventsEnabled: ['assessment', 'navigation', 'outcome'],
                realTimeUpdates: true
              },
              powerpathIntegration: {
                pathId: 'powerpath_mastery_001',
                objectives: ['math-algebra-basics', 'science-physics-intro'],
                adaptivePath: true
              }
            }
          }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ 
          success: true, 
          message: `Composed tool ${toolName} executed successfully`,
          executionTime: `${Date.now() - startTime}ms`
        }, null, 2)
      }]
    };
  }
}

async function runToolCompositionExample() {
  console.log('🚀 TimeBack MCP Server - Tool Composition Pattern Example');
  console.log('=' .repeat(65));

  try {
    const configPath = path.join(__dirname, 'composition-config.json');
    const compositionConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    console.log(`🔧 Loaded composed tool: ${compositionConfig.name}`);
    console.log(`📝 Description: ${compositionConfig.description}`);
    console.log(`🛠️  Component tools: ${compositionConfig.composedTools.length}`);
    console.log('');

    console.log('💡 Without Tool Composition (Complex):');
    console.log('   ❌ Call create-user on OneRoster server');
    console.log('   ❌ Call bulk-enroll-student on OneRoster server');
    console.log('   ❌ Call generate-integration-mapping on TimeBack server');
    console.log('   ❌ Call initialize-student-tracking on Analytics server');
    console.log('   ❌ Call generate-integration-mapping on TimeBack server (again)');
    console.log('   ❌ Call validate-api-integration on TimeBack server');
    console.log('   ❌ Handle dependencies, error handling, rollbacks manually');
    console.log('');

    console.log('✅ With Tool Composition (Simple):');
    console.log('   ✅ Single call to complete-student-onboarding');
    console.log('   ✅ Automatic dependency resolution');
    console.log('   ✅ Built-in error handling and rollbacks');
    console.log('   ✅ Parallel execution where possible');
    console.log('');

    const client = new MockMcpClient('stdio://timeback-mcp-server');
    await client.connect();
    console.log('✅ Connected to TimeBack MCP Server');
    console.log('');

    const studentData = {
      student: {
        name: 'Alice Johnson',
        email: 'alice.johnson@school.edu',
        grade: 6
      },
      classes: ['math-101', 'science-101'],
      assessmentProfile: 'adaptive-learning',
      trackingLevel: 'detailed'
    };

    console.log('👤 Student Onboarding Data:');
    console.log(JSON.stringify(studentData, null, 2));
    console.log('');

    console.log('🚀 Executing composed tool...');
    
    const result = await client.callTool('complete-student-onboarding', studentData);
    const response = JSON.parse(result.content[0].text);

    if (response.success) {
      console.log('');
      console.log('✅ Student onboarding completed successfully!');
      console.log('');
      
      console.log('📊 Onboarding Results:');
      console.log('-'.repeat(50));
      console.log(`👤 Student ID: ${response.studentId}`);
      console.log(`📚 Classes enrolled: ${response.enrollments.length}`);
      console.log(`📝 Assessment profile: ${response.assessmentProfileId}`);
      console.log(`📈 Analytics tracking: ${response.trackingProfileId}`);
      console.log(`🎯 Mastery path: ${response.masteryPathId}`);
      console.log('');

      console.log('⚡ Execution Summary:');
      console.log(`   • Total steps: ${response.executionSummary.totalSteps}`);
      console.log(`   • Successful: ${response.executionSummary.successfulSteps}`);
      console.log(`   • Failed: ${response.executionSummary.failedSteps}`);
      console.log(`   • Execution time: ${response.executionSummary.executionTime}`);
      console.log(`   • Servers used: ${response.executionSummary.serversUsed.join(', ')}`);
      console.log(`   • Parallel operations: ${response.executionSummary.parallelOperations}`);
      console.log('');

      console.log('🔗 Integration Points Created:');
      console.log(`   • OneRoster: User ${response.integrationPoints.oneRosterIntegration.userId}`);
      console.log(`   • QTI: Profile ${response.integrationPoints.qtiIntegration.profileId}`);
      console.log(`   • Caliper: Tracking ${response.integrationPoints.caliperIntegration.trackingId}`);
      console.log(`   • PowerPath: Path ${response.integrationPoints.powerpathIntegration.pathId}`);
      console.log('');

      console.log('✅ Validation Results:');
      Object.entries(response.validationResults).forEach(([key, status]) => {
        const icon = status === 'valid' || status === 'healthy' ? '✅' : '❌';
        console.log(`   ${icon} ${key}: ${status}`);
      });

    } else {
      console.log('❌ Student onboarding failed:', response.error);
    }

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('🏁 Tool Composition Pattern Example Complete');
  console.log('');
  console.log('💡 Key Benefits Demonstrated:');
  console.log('   ✅ Simplified client code (1 call vs 6+ calls)');
  console.log('   ✅ Automatic dependency resolution');
  console.log('   ✅ Built-in error handling and rollbacks');
  console.log('   ✅ Parallel execution optimization');
  console.log('   ✅ Consistent interface across multiple servers');
}

if (require.main === module) {
  runToolCompositionExample().catch(console.error);
}

module.exports = { runToolCompositionExample };

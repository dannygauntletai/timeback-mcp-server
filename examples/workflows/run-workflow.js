#!/usr/bin/env node

/**
 * TimeBack MCP Server - Workflow Runner
 * 
 * This script executes integration workflows defined in JSON configuration files.
 * It demonstrates how to orchestrate multiple MCP servers and integration patterns.
 */

const fs = require('fs');
const path = require('path');

class WorkflowMcpClient {
  constructor() {
    this.connected = false;
    this.connectedServers = new Map();
  }

  async connect() {
    console.log('🔗 Connecting to TimeBack MCP Server...');
    this.connected = true;
    
    const servers = [
      { id: 'timeback', name: 'TimeBack MCP Server', status: 'connected' },
      { id: 'oneroster-server', name: 'OneRoster MCP Server', status: 'connected' },
      { id: 'analytics-server', name: 'Analytics MCP Server', status: 'connected' }
    ];
    
    servers.forEach(server => {
      this.connectedServers.set(server.id, server);
    });
    
    console.log(`✅ Connected to ${servers.length} MCP servers`);
    return { success: true };
  }

  async executeWorkflow(workflowConfig, inputParams = {}) {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    console.log(`🚀 Executing workflow: ${workflowConfig.name}`);
    console.log(`📝 Description: ${workflowConfig.description}`);
    console.log(`⏱️  Estimated duration: ${workflowConfig.estimatedDuration}`);
    console.log(`🔧 Patterns: ${workflowConfig.patterns.join(', ')}`);
    console.log('');

    const startTime = Date.now();
    const results = {};
    const executionLog = [];
    let successfulSteps = 0;
    let failedSteps = 0;

    for (let i = 0; i < workflowConfig.workflow.length; i++) {
      const step = workflowConfig.workflow[i];
      
      try {
        console.log(`${i + 1}️⃣  Executing: ${step.name || step.id}`);
        console.log(`   Server: ${step.server}`);
        console.log(`   Tool: ${step.tool}`);
        
        if (step.description) {
          console.log(`   Description: ${step.description}`);
        }

        if (step.dependsOn && step.dependsOn.length > 0) {
          console.log(`   Dependencies: ${step.dependsOn.join(', ')}`);
          
          for (const dep of step.dependsOn) {
            if (!results[dep]) {
              throw new Error(`Dependency ${dep} not satisfied`);
            }
          }
        }

        if (!this.connectedServers.has(step.server)) {
          throw new Error(`Server ${step.server} not connected`);
        }

        const stepStartTime = Date.now();
        await this.simulateStepExecution(step, results, inputParams);
        const stepDuration = Date.now() - stepStartTime;

        const stepResult = this.generateMockResult(step, inputParams);
        results[step.id] = stepResult;

        console.log(`   ✅ Completed in ${stepDuration}ms`);
        
        if (stepResult.summary) {
          console.log(`   📊 ${stepResult.summary}`);
        }

        executionLog.push({
          stepId: step.id,
          stepName: step.name || step.id,
          status: 'success',
          duration: stepDuration,
          server: step.server,
          tool: step.tool
        });

        successfulSteps++;

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        
        executionLog.push({
          stepId: step.id,
          stepName: step.name || step.id,
          status: 'failed',
          error: error.message,
          server: step.server,
          tool: step.tool
        });

        failedSteps++;

        if (step.required && workflowConfig.errorHandling?.strategy !== 'continue-on-error') {
          console.log('   🛑 Critical step failed, stopping workflow');
          break;
        }
      }

      console.log('');
    }

    const totalDuration = Date.now() - startTime;

    const workflowResult = {
      success: failedSteps === 0 || workflowConfig.errorHandling?.strategy === 'continue-on-error',
      workflowId: `workflow_${Date.now()}`,
      workflowName: workflowConfig.name,
      executionSummary: {
        totalSteps: workflowConfig.workflow.length,
        successfulSteps,
        failedSteps,
        executionTime: `${totalDuration}ms`,
        duration: this.formatDuration(totalDuration)
      },
      results,
      executionLog,
      patterns: workflowConfig.patterns,
      serversUsed: Array.from(this.connectedServers.keys())
    };

    return workflowResult;
  }

  async simulateStepExecution(step, previousResults, inputParams) {
    const baseTime = 500;
    const complexityMultiplier = step.timeout ? Math.min(step.timeout / 10000, 3) : 1;
    const executionTime = baseTime * complexityMultiplier + Math.random() * 1000;
    
    await new Promise(resolve => setTimeout(resolve, executionTime));

    if (Math.random() < 0.05 && !step.required) {
      throw new Error('Simulated network timeout');
    }
  }

  generateMockResult(step, inputParams) {
    const baseResult = {
      success: true,
      stepId: step.id,
      server: step.server,
      tool: step.tool,
      timestamp: new Date().toISOString()
    };

    switch (step.tool) {
      case 'create-comprehensive-student-profile':
        return {
          ...baseResult,
          userId: `student_${Date.now()}`,
          profile: {
            name: inputParams.student?.firstName || 'John Doe',
            grade: inputParams.student?.grade || 6,
            academicLevel: 'at-grade'
          },
          summary: 'Student profile created successfully'
        };

      case 'bulk-course-enrollment':
        return {
          ...baseResult,
          enrollments: [
            { classId: 'math-101', enrollmentId: 'enroll_001', status: 'active' },
            { classId: 'science-101', enrollmentId: 'enroll_002', status: 'active' }
          ],
          summary: `Enrolled in ${inputParams.courses ? Object.keys(inputParams.courses).length : 2} courses`
        };

      case 'generate-integration-mapping':
        return {
          ...baseResult,
          mappings: [
            { source: 'oneroster', target: 'qti', mappingId: 'map_001' },
            { source: 'qti', target: 'caliper', mappingId: 'map_002' }
          ],
          assessments: step.params?.useCase?.includes('assessment') ? [
            { id: 'assessment_001', type: 'diagnostic', subject: 'mathematics' }
          ] : undefined,
          summary: 'Integration mapping generated successfully'
        };

      case 'analyze-codebase-integration':
        return {
          ...baseResult,
          analysis: {
            patterns: ['student-data-sync', 'assessment-workflow'],
            recommendations: ['Use adaptive assessments', 'Enable real-time tracking'],
            complexity: 'medium'
          },
          summary: 'Codebase analysis completed with 3 recommendations'
        };

      case 'validate-api-integration':
        return {
          ...baseResult,
          validation: {
            status: 'passed',
            checks: ['connectivity', 'authentication', 'data-integrity'],
            issues: []
          },
          summary: 'All integration points validated successfully'
        };

      default:
        return {
          ...baseResult,
          data: { message: 'Step completed successfully' },
          summary: 'Step executed successfully'
        };
    }
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

async function runWorkflow(workflowFile, inputParams = {}) {
  console.log('🚀 TimeBack MCP Server - Workflow Runner');
  console.log('=' .repeat(60));

  try {
    const workflowPath = path.resolve(workflowFile);
    
    if (!fs.existsSync(workflowPath)) {
      throw new Error(`Workflow file not found: ${workflowPath}`);
    }

    const workflowConfig = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    console.log(`📋 Loaded workflow: ${workflowConfig.name}`);
    console.log(`📁 File: ${workflowFile}`);
    console.log('');

    if (workflowConfig.prerequisites) {
      console.log('🔍 Prerequisites:');
      workflowConfig.prerequisites.forEach(prereq => {
        console.log(`   • ${prereq}`);
      });
      console.log('');
    }

    const client = new WorkflowMcpClient();
    await client.connect();
    console.log('');

    const result = await client.executeWorkflow(workflowConfig, inputParams);

    console.log('📊 Workflow Execution Results:');
    console.log('=' .repeat(50));
    
    const statusIcon = result.success ? '✅' : '❌';
    console.log(`${statusIcon} Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`🆔 Workflow ID: ${result.workflowId}`);
    console.log(`⏱️  Total execution time: ${result.executionSummary.duration}`);
    console.log(`📈 Steps completed: ${result.executionSummary.successfulSteps}/${result.executionSummary.totalSteps}`);
    
    if (result.executionSummary.failedSteps > 0) {
      console.log(`❌ Failed steps: ${result.executionSummary.failedSteps}`);
    }
    
    console.log(`🖥️  Servers used: ${result.serversUsed.join(', ')}`);
    console.log(`🔧 Patterns used: ${result.patterns.join(', ')}`);
    console.log('');

    console.log('📋 Step Execution Log:');
    console.log('-'.repeat(40));
    
    result.executionLog.forEach((log, index) => {
      const stepIcon = log.status === 'success' ? '✅' : '❌';
      console.log(`${stepIcon} ${index + 1}. ${log.stepName}`);
      console.log(`   Server: ${log.server} | Tool: ${log.tool}`);
      
      if (log.status === 'success') {
        console.log(`   Duration: ${log.duration}ms`);
      } else {
        console.log(`   Error: ${log.error}`);
      }
      console.log('');
    });

    if (Object.keys(result.results).length > 0) {
      console.log('🎯 Key Results:');
      console.log('-'.repeat(30));
      
      Object.entries(result.results).forEach(([stepId, stepResult]) => {
        if (stepResult.summary) {
          console.log(`• ${stepId}: ${stepResult.summary}`);
        }
      });
      console.log('');
    }

    return result;

  } catch (error) {
    console.error('❌ Workflow execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node run-workflow.js <workflow-file.json> [--param=value ...]');
    console.log('');
    console.log('Available workflows:');
    console.log('  • student-lifecycle-workflow.json');
    console.log('  • assessment-analytics-pipeline.json');
    console.log('');
    console.log('Example:');
    console.log('  node run-workflow.js student-lifecycle-workflow.json --student.grade=6');
    process.exit(1);
  }

  const workflowFile = args[0];
  
  const inputParams = {};
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      if (key && value) {
        const keys = key.split('.');
        let current = inputParams;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = isNaN(value) ? value : Number(value);
      }
    }
  });

  runWorkflow(workflowFile, inputParams).catch(console.error);
}

module.exports = { runWorkflow, WorkflowMcpClient };

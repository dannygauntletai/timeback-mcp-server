import { McpProxy } from './mcp-proxy.js';
import { IntegrationWorkflow, WorkflowStep, ProxyRequest } from '../types/integration.js';
import { logger } from '../utils/logger.js';

export class ToolComposer {
  private proxy: McpProxy;
  private workflows: Map<string, IntegrationWorkflow> = new Map();

  constructor(proxy: McpProxy) {
    this.proxy = proxy;
  }

  async executeWorkflow(workflow: IntegrationWorkflow): Promise<IntegrationWorkflow> {
    logger.info(`Starting workflow execution: ${workflow.name}`, { workflowId: workflow.id });
    
    workflow.status = 'running';
    const stepResults = new Map<string, any>();

    try {
      const executionOrder = this.resolveDependencies(workflow.steps);
      
      for (const stepId of executionOrder) {
        const step = workflow.steps.find(s => s.id === stepId);
        if (!step) continue;

        logger.info(`Executing workflow step: ${step.id}`, { 
          workflowId: workflow.id, 
          stepId: step.id,
          server: step.server,
          tool: step.tool 
        });

        step.status = 'running';

        try {
          const resolvedParams = this.resolveStepParameters(step, stepResults);
          
          let result;
          if (step.server === 'timeback') {
            result = await this.executeTimeBackTool(step.tool, resolvedParams);
          } else {
            const proxyRequest: ProxyRequest = {
              targetServer: step.server,
              method: 'callTool',
              params: {
                name: step.tool,
                arguments: resolvedParams
              }
            };
            
            const proxyResponse = await this.proxy.proxyRequest(proxyRequest);
            if (!proxyResponse.success) {
              throw new Error(proxyResponse.error || 'Proxy request failed');
            }
            result = proxyResponse.data;
          }

          step.result = result;
          step.status = 'completed';
          stepResults.set(step.id, result);

          logger.info(`Workflow step completed: ${step.id}`, { 
            workflowId: workflow.id, 
            stepId: step.id,
            executionTime: Date.now() - workflow.createdAt
          });

        } catch (error) {
          step.error = error instanceof Error ? error.message : 'Unknown error';
          step.status = 'failed';
          
          logger.error(`Workflow step failed: ${step.id}`, { 
            workflowId: workflow.id, 
            stepId: step.id,
            error: step.error
          });

          workflow.status = 'failed';
          workflow.completedAt = Date.now();
          this.workflows.set(workflow.id, workflow);
          return workflow;
        }
      }

      workflow.status = 'completed';
      workflow.completedAt = Date.now();
      
      logger.info(`Workflow completed successfully: ${workflow.name}`, { 
        workflowId: workflow.id,
        totalSteps: workflow.steps.length,
        executionTime: workflow.completedAt - workflow.createdAt
      });

    } catch (error) {
      workflow.status = 'failed';
      workflow.completedAt = Date.now();
      
      logger.error(`Workflow execution failed: ${workflow.name}`, { 
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  private resolveDependencies(steps: WorkflowStep[]): string[] {
    const resolved: string[] = [];
    const remaining = [...steps];
    
    while (remaining.length > 0) {
      const readySteps = remaining.filter(step => 
        !step.dependsOn || step.dependsOn.every(dep => resolved.includes(dep))
      );
      
      if (readySteps.length === 0) {
        throw new Error('Circular dependency detected in workflow steps');
      }
      
      for (const step of readySteps) {
        resolved.push(step.id);
        const index = remaining.findIndex(s => s.id === step.id);
        remaining.splice(index, 1);
      }
    }
    
    return resolved;
  }

  private resolveStepParameters(step: WorkflowStep, stepResults: Map<string, any>): Record<string, any> {
    const resolvedParams = { ...step.params };
    
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const reference = value.slice(2, -1); // Remove ${ and }
        const [stepId, path] = reference.split('.');
        
        if (stepResults.has(stepId)) {
          const stepResult = stepResults.get(stepId);
          if (path) {
            const pathParts = path.split('.');
            let resolvedValue = stepResult;
            for (const part of pathParts) {
              resolvedValue = resolvedValue?.[part];
            }
            resolvedParams[key] = resolvedValue;
          } else {
            resolvedParams[key] = stepResult;
          }
        }
      }
    }
    
    return resolvedParams;
  }

  private async executeTimeBackTool(toolName: string, params: Record<string, any>): Promise<any> {
    logger.info(`Executing TimeBack tool: ${toolName}`, { params });
    
    switch (toolName) {
      case 'analyze-codebase':
        return {
          type: 'codebase-analysis',
          recommendations: ['Use QTI API for assessments', 'Implement OneRoster for roster management'],
          integrationPoints: ['assessment endpoints', 'user management'],
          timestamp: Date.now()
        };
      
      case 'generate-integration-code':
        return {
          type: 'integration-code',
          language: params.language || 'javascript',
          framework: params.framework || 'express',
          code: `// Generated integration code for ${params.api || 'TimeBack'}`,
          timestamp: Date.now()
        };
      
      case 'validate-data-model':
        return {
          type: 'validation-result',
          valid: true,
          schema: params.schema || 'qti-assessment',
          errors: [],
          timestamp: Date.now()
        };
      
      default:
        throw new Error(`Unknown TimeBack tool: ${toolName}`);
    }
  }

  createWorkflow(
    name: string,
    description: string,
    steps: Omit<WorkflowStep, 'status'>[]
  ): IntegrationWorkflow {
    const workflow: IntegrationWorkflow = {
      id: `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      steps: steps.map(step => ({ ...step, status: 'pending' })),
      status: 'pending',
      createdAt: Date.now()
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  getWorkflow(workflowId: string): IntegrationWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  listWorkflows(): IntegrationWorkflow[] {
    return Array.from(this.workflows.values());
  }

  async composeIntegrationWorkflow(workflowDefinition: {
    name: string;
    description: string;
    steps: Array<{
      id: string;
      server: string;
      tool: string;
      params: Record<string, any>;
      dependsOn?: string[];
    }>;
  }): Promise<IntegrationWorkflow> {
    const workflow = this.createWorkflow(
      workflowDefinition.name,
      workflowDefinition.description,
      workflowDefinition.steps
    );

    return this.executeWorkflow(workflow);
  }

  getWorkflowStats() {
    const workflows = Array.from(this.workflows.values());
    return {
      total: workflows.length,
      pending: workflows.filter(w => w.status === 'pending').length,
      running: workflows.filter(w => w.status === 'running').length,
      completed: workflows.filter(w => w.status === 'completed').length,
      failed: workflows.filter(w => w.status === 'failed').length,
      averageExecutionTime: workflows
        .filter(w => w.completedAt)
        .reduce((sum, w) => sum + (w.completedAt! - w.createdAt), 0) / 
        workflows.filter(w => w.completedAt).length || 0
    };
  }
}

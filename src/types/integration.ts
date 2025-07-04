export interface McpServerConnection {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'http' | 'websocket';
  url?: string;
  status: 'connected' | 'disconnected' | 'error';
  capabilities: {
    tools: string[];
    resources: string[];
    prompts: string[];
  };
}

export interface IntegrationEvent {
  type: 'server_connected' | 'server_disconnected' | 'tool_called' | 'resource_accessed';
  serverId: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface ProxyRequest {
  targetServer: string;
  method: string;
  params: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
  sourceServer: string;
  executionTime: number;
}

export interface IntegrationPattern {
  name: string;
  description: string;
  enabled: boolean;
  configuration: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  server: string;
  tool: string;
  params: Record<string, any>;
  dependsOn?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface IntegrationWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
}

export interface SSEClient {
  id: string;
  response: any;
  connectedAt: number;
  lastActivity: number;
}

export interface IntegrationStats {
  connectedServers: number;
  totalTools: number;
  totalResources: number;
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  sseClients: number;
}

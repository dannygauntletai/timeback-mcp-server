import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { McpServerConnection, ProxyRequest, ProxyResponse } from '../types/integration.js';
import { logger } from '../utils/logger.js';

export class McpProxy {
  private connections: Map<string, { client: Client; connection: McpServerConnection }> = new Map();

  async connectToServer(connection: McpServerConnection): Promise<void> {
    try {
      const client = new Client({
        name: `timeback-proxy-${connection.name}`,
        version: '1.0.0'
      });

      let transport;
      switch (connection.transport) {
        case 'stdio':
          throw new Error('Stdio transport not yet implemented - use sse, http, or websocket');
        case 'sse':
          if (!connection.url) throw new Error('SSE transport requires URL');
          transport = new SSEClientTransport(new URL(connection.url));
          break;
        case 'http':
          if (!connection.url) throw new Error('HTTP transport requires URL');
          transport = new StreamableHTTPClientTransport(new URL(connection.url));
          break;
        case 'websocket':
          if (!connection.url) throw new Error('WebSocket transport requires URL');
          transport = new WebSocketClientTransport(new URL(connection.url));
          break;
        default:
          throw new Error(`Unsupported transport: ${connection.transport}`);
      }

      await client.connect(transport);
      
      const tools = await client.listTools();
      const resources = await client.listResources();
      const prompts = await client.listPrompts();

      connection.capabilities = {
        tools: tools.tools.map(t => t.name),
        resources: resources.resources.map(r => r.uri),
        prompts: prompts.prompts.map(p => p.name),
      };
      connection.status = 'connected';

      this.connections.set(connection.id, { client, connection });
      logger.info(`Connected to MCP server: ${connection.name}`, {
        serverId: connection.id,
        transport: connection.transport,
        toolCount: connection.capabilities.tools.length,
        resourceCount: connection.capabilities.resources.length,
        promptCount: connection.capabilities.prompts.length
      });
    } catch (error) {
      connection.status = 'error';
      logger.error(`Failed to connect to MCP server ${connection.name}:`, error);
      throw error;
    }
  }

  async disconnectFromServer(serverId: string): Promise<void> {
    const connectionData = this.connections.get(serverId);
    if (!connectionData) {
      throw new Error(`Server ${serverId} not found`);
    }

    try {
      connectionData.connection.status = 'disconnected';
      this.connections.delete(serverId);
      logger.info(`Disconnected from MCP server: ${connectionData.connection.name}`);
    } catch (error) {
      logger.error(`Failed to disconnect from MCP server ${connectionData.connection.name}:`, error);
      throw error;
    }
  }

  async proxyRequest(request: ProxyRequest): Promise<ProxyResponse> {
    const startTime = Date.now();
    const connectionData = this.connections.get(request.targetServer);
    
    if (!connectionData) {
      return {
        success: false,
        error: `Server ${request.targetServer} not found or not connected`,
        sourceServer: request.targetServer,
        executionTime: Date.now() - startTime
      };
    }

    try {
      let result;
      const { client } = connectionData;

      switch (request.method) {
        case 'listTools':
          result = await client.listTools();
          break;
        case 'listResources':
          result = await client.listResources();
          break;
        case 'listPrompts':
          result = await client.listPrompts();
          break;
        case 'callTool':
          if (!request.params.name || !request.params.arguments) {
            throw new Error('Tool call requires name and arguments parameters');
          }
          result = await client.callTool({
            name: request.params.name,
            arguments: request.params.arguments
          });
          break;
        case 'readResource':
          if (!request.params.uri) {
            throw new Error('Resource read requires uri parameter');
          }
          result = await client.readResource({
            uri: request.params.uri
          });
          break;
        case 'getPrompt':
          if (!request.params.name) {
            throw new Error('Prompt get requires name parameter');
          }
          result = await client.getPrompt({
            name: request.params.name,
            arguments: request.params.arguments || {}
          });
          break;
        default:
          throw new Error(`Unsupported method: ${request.method}`);
      }

      return {
        success: true,
        data: result,
        sourceServer: request.targetServer,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error(`Proxy request failed for server ${request.targetServer}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceServer: request.targetServer,
        executionTime: Date.now() - startTime
      };
    }
  }

  async aggregateResponses(requests: ProxyRequest[]): Promise<ProxyResponse[]> {
    const promises = requests.map(request => this.proxyRequest(request));
    return Promise.all(promises);
  }

  getConnectedServers(): McpServerConnection[] {
    return Array.from(this.connections.values()).map(({ connection }) => connection);
  }

  getServerConnection(serverId: string): McpServerConnection | undefined {
    const connectionData = this.connections.get(serverId);
    return connectionData?.connection;
  }

  isServerConnected(serverId: string): boolean {
    const connection = this.getServerConnection(serverId);
    return connection?.status === 'connected';
  }

  async routeRequest(toolName: string, params: Record<string, any>): Promise<ProxyResponse[]> {
    const matchingServers = Array.from(this.connections.values())
      .filter(({ connection }) => 
        connection.status === 'connected' && 
        connection.capabilities.tools.includes(toolName)
      );

    if (matchingServers.length === 0) {
      return [{
        success: false,
        error: `No connected servers support tool: ${toolName}`,
        sourceServer: 'proxy',
        executionTime: 0
      }];
    }

    const requests: ProxyRequest[] = matchingServers.map(({ connection }) => ({
      targetServer: connection.id,
      method: 'callTool',
      params: {
        name: toolName,
        arguments: params
      }
    }));

    return this.aggregateResponses(requests);
  }

  getProxyStats() {
    const connections = Array.from(this.connections.values());
    const connectedCount = connections.filter(({ connection }) => connection.status === 'connected').length;
    const totalTools = connections.reduce((sum, { connection }) => sum + connection.capabilities.tools.length, 0);
    const totalResources = connections.reduce((sum, { connection }) => sum + connection.capabilities.resources.length, 0);
    const totalPrompts = connections.reduce((sum, { connection }) => sum + connection.capabilities.prompts.length, 0);

    return {
      totalServers: connections.length,
      connectedServers: connectedCount,
      disconnectedServers: connections.length - connectedCount,
      totalTools,
      totalResources,
      totalPrompts,
      servers: connections.map(({ connection }) => ({
        id: connection.id,
        name: connection.name,
        status: connection.status,
        transport: connection.transport,
        toolCount: connection.capabilities.tools.length,
        resourceCount: connection.capabilities.resources.length,
        promptCount: connection.capabilities.prompts.length
      }))
    };
  }
}

import { McpProxy } from './mcp-proxy.js';
import { ToolComposer } from './tool-composer.js';
import { SSETransport } from './sse-transport.js';
import { McpServerConnection, IntegrationEvent, IntegrationPattern, IntegrationStats } from '../types/integration.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class IntegrationManager {
  private proxy: McpProxy;
  private toolComposer: ToolComposer;
  private sseTransport?: SSETransport;
  private patterns: Map<string, IntegrationPattern> = new Map();
  private eventListeners: ((event: IntegrationEvent) => void)[] = [];
  private initialized = false;

  constructor() {
    this.proxy = new McpProxy();
    this.toolComposer = new ToolComposer(this.proxy);
    this.initializePatterns();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Integration Manager already initialized');
      return;
    }

    logger.info('Initializing Integration Manager', {
      patternsEnabled: Array.from(this.patterns.values()).filter(p => p.enabled).map(p => p.name),
      integrationEnabled: config.integration?.enabled ?? false
    });

    if (!config.integration?.enabled) {
      logger.info('Integration features disabled in configuration');
      return;
    }

    if (config.integration?.sseEndpoints?.enabled) {
      this.sseTransport = new SSETransport(config.integration.sseEndpoints.port);
      await this.sseTransport.start();
      logger.info('SSE Transport initialized successfully');
    }

    if (config.integration?.downstreamServers && config.integration.downstreamServers.length > 0) {
      logger.info(`Connecting to ${config.integration.downstreamServers.length} downstream servers`);
      
      for (const serverConfig of config.integration.downstreamServers) {
        try {
          const connection: McpServerConnection = {
            id: `server_${serverConfig.name}_${Date.now()}`,
            name: serverConfig.name,
            transport: serverConfig.transport as any,
            url: serverConfig.url,
            status: 'disconnected',
            capabilities: { tools: [], resources: [], prompts: [] }
          };

          await this.proxy.connectToServer(connection);
          
          this.emitEvent({
            type: 'server_connected',
            serverId: connection.id,
            timestamp: Date.now(),
            data: { 
              connection,
              transport: connection.transport,
              capabilities: connection.capabilities
            }
          });

          logger.info(`Successfully connected to downstream server: ${serverConfig.name}`, {
            serverId: connection.id,
            transport: connection.transport,
            toolCount: connection.capabilities.tools.length
          });

        } catch (error) {
          logger.error(`Failed to connect to server ${serverConfig.name}:`, error);
          
          this.emitEvent({
            type: 'server_disconnected',
            serverId: `server_${serverConfig.name}`,
            timestamp: Date.now(),
            data: { 
              error: error instanceof Error ? error.message : 'Unknown error',
              serverName: serverConfig.name
            }
          });
        }
      }
    }

    this.initialized = true;
    logger.info('Integration Manager initialization completed');
  }

  private initializePatterns(): void {
    const patterns: IntegrationPattern[] = [
      {
        name: 'server_chaining',
        description: 'Chain multiple MCP servers for complex workflows',
        enabled: config.integration?.patterns?.serverChaining ?? false,
        configuration: {
          maxChainDepth: 5,
          timeoutMs: 30000
        }
      },
      {
        name: 'tool_composition',
        description: 'Compose tools from multiple MCP servers',
        enabled: config.integration?.patterns?.toolComposition ?? false,
        configuration: {
          maxConcurrentTools: 10,
          dependencyResolution: true
        }
      },
      {
        name: 'shared_resources',
        description: 'Share resources across MCP servers',
        enabled: config.integration?.patterns?.sharedResources ?? false,
        configuration: {
          cacheEnabled: true,
          cacheTtlMs: 300000
        }
      },
      {
        name: 'event_driven',
        description: 'Event-driven integration notifications',
        enabled: config.integration?.patterns?.eventDriven ?? false,
        configuration: {
          eventHistorySize: 100,
          broadcastEnabled: true
        }
      },
      {
        name: 'sse_integration',
        description: 'Server-sent events for real-time integration',
        enabled: config.integration?.patterns?.sseIntegration ?? false,
        configuration: {
          port: config.integration?.sseEndpoints?.port ?? 3001,
          corsEnabled: true
        }
      }
    ];

    patterns.forEach(pattern => {
      this.patterns.set(pattern.name, pattern);
      logger.debug(`Initialized integration pattern: ${pattern.name}`, {
        enabled: pattern.enabled,
        configuration: pattern.configuration
      });
    });
  }

  public emitEvent(event: IntegrationEvent): void {
    logger.debug(`Emitting integration event: ${event.type}`, {
      serverId: event.serverId,
      timestamp: event.timestamp,
      listenerCount: this.eventListeners.length
    });

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('Error in integration event listener:', error);
      }
    });

    if (this.sseTransport) {
      this.sseTransport.broadcastEvent(event);
    }
  }

  public addEventListener(listener: (event: IntegrationEvent) => void): void {
    this.eventListeners.push(listener);
    logger.debug('Added integration event listener', {
      totalListeners: this.eventListeners.length
    });
  }

  public removeEventListener(listener: (event: IntegrationEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
      logger.debug('Removed integration event listener', {
        totalListeners: this.eventListeners.length
      });
    }
  }

  public getProxy(): McpProxy {
    return this.proxy;
  }

  public getToolComposer(): ToolComposer {
    return this.toolComposer;
  }

  public getSSETransport(): SSETransport | undefined {
    return this.sseTransport;
  }

  public getPatterns(): IntegrationPattern[] {
    return Array.from(this.patterns.values());
  }

  public getPattern(name: string): IntegrationPattern | undefined {
    return this.patterns.get(name);
  }

  public isPatternEnabled(name: string): boolean {
    const pattern = this.patterns.get(name);
    return pattern?.enabled ?? false;
  }

  public getStats(): IntegrationStats {
    const connectedServers = this.proxy.getConnectedServers();
    const workflowStats = this.toolComposer.getWorkflowStats();
    const sseStats = this.sseTransport?.getStats();

    return {
      connectedServers: connectedServers.length,
      totalTools: connectedServers.reduce((sum, server) => sum + server.capabilities.tools.length, 0),
      totalResources: connectedServers.reduce((sum, server) => sum + server.capabilities.resources.length, 0),
      activeWorkflows: workflowStats.running,
      completedWorkflows: workflowStats.completed,
      failedWorkflows: workflowStats.failed,
      sseClients: sseStats?.clientCount ?? 0
    };
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down Integration Manager');

    if (this.sseTransport) {
      await this.sseTransport.stop();
      logger.info('SSE Transport stopped');
    }

    const connectedServers = this.proxy.getConnectedServers();
    for (const server of connectedServers) {
      try {
        await this.proxy.disconnectFromServer(server.id);
        
        this.emitEvent({
          type: 'server_disconnected',
          serverId: server.id,
          timestamp: Date.now(),
          data: { reason: 'shutdown' }
        });
      } catch (error) {
        logger.error(`Failed to disconnect from server ${server.name}:`, error);
      }
    }

    this.eventListeners = [];
    this.initialized = false;

    logger.info('Integration Manager shutdown completed');
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const stats = this.getStats();
    const connectedServers = this.proxy.getConnectedServers();
    const healthyServers = connectedServers.filter(s => s.status === 'connected').length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!this.initialized) {
      status = 'unhealthy';
    } else if (connectedServers.length > 0 && healthyServers < connectedServers.length) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        initialized: this.initialized,
        stats,
        connectedServers: healthyServers,
        totalServers: connectedServers.length,
        enabledPatterns: this.getPatterns().filter(p => p.enabled).map(p => p.name),
        sseEnabled: !!this.sseTransport
      }
    };
  }
}

import express, { Application, Response } from 'express';
import cors from 'cors';
import { IntegrationEvent, SSEClient } from '../types/integration.js';
import { logger } from '../utils/logger.js';

export class SSETransport {
  private app: Application;
  private server: any;
  private clients: Map<string, SSEClient> = new Map();
  private eventHistory: IntegrationEvent[] = [];
  private maxHistorySize = 100;

  constructor(private port: number = 3001) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors({
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Cache-Control']
    }));
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    this.app.get('/sse', (req, res) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      });

      const sseClient: SSEClient = {
        id: clientId,
        response: res,
        connectedAt: Date.now(),
        lastActivity: Date.now()
      };

      this.clients.set(clientId, sseClient);
      logger.info(`SSE client connected: ${clientId}`, { 
        totalClients: this.clients.size 
      });

      this.sendEvent(res, {
        type: 'server_connected',
        serverId: 'timeback-mcp-server',
        timestamp: Date.now(),
        data: { 
          message: 'Connected to TimeBack MCP Server SSE stream',
          clientId 
        }
      });

      this.eventHistory.slice(-10).forEach(event => {
        this.sendEvent(res, event);
      });

      req.on('close', () => {
        this.clients.delete(clientId);
        logger.info(`SSE client disconnected: ${clientId}`, { 
          totalClients: this.clients.size 
        });
      });

      req.on('error', (error) => {
        logger.error(`SSE client error for ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        clients: this.clients.size,
        eventHistory: this.eventHistory.length,
        uptime: process.uptime()
      });
    });

    this.app.get('/stats', (req, res) => {
      const clientStats = Array.from(this.clients.values()).map(client => ({
        id: client.id,
        connectedAt: client.connectedAt,
        lastActivity: client.lastActivity,
        connectionDuration: Date.now() - client.connectedAt
      }));

      res.json({
        totalClients: this.clients.size,
        eventHistory: this.eventHistory.length,
        clients: clientStats,
        recentEvents: this.eventHistory.slice(-5).map(event => ({
          type: event.type,
          serverId: event.serverId,
          timestamp: event.timestamp
        }))
      });
    });

    this.app.post('/events', (req, res) => {
      try {
        const event: IntegrationEvent = req.body;
        this.broadcastEvent(event);
        res.json({ success: true, clientsNotified: this.clients.size });
      } catch (error) {
        logger.error('Failed to broadcast event:', error);
        res.status(400).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  }

  private sendEvent(res: Response, event: IntegrationEvent): void {
    try {
      const eventData = {
        id: `event_${event.timestamp}_${Math.random().toString(36).substr(2, 6)}`,
        type: event.type,
        data: JSON.stringify({
          serverId: event.serverId,
          timestamp: event.timestamp,
          ...event.data
        })
      };

      res.write(`id: ${eventData.id}\n`);
      res.write(`event: ${eventData.type}\n`);
      res.write(`data: ${eventData.data}\n\n`);
    } catch (error) {
      logger.error('Failed to send SSE event:', error);
    }
  }

  public broadcastEvent(event: IntegrationEvent): void {
    this.eventHistory.push(event);
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    logger.info(`Broadcasting SSE event: ${event.type}`, {
      serverId: event.serverId,
      clientCount: this.clients.size
    });

    const disconnectedClients: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      try {
        this.sendEvent(client.response, event);
        client.lastActivity = Date.now();
      } catch (error) {
        logger.warn(`Failed to send event to client ${clientId}:`, error);
        disconnectedClients.push(clientId);
      }
    }

    disconnectedClients.forEach(clientId => {
      this.clients.delete(clientId);
    });

    if (disconnectedClients.length > 0) {
      logger.info(`Cleaned up ${disconnectedClients.length} disconnected SSE clients`);
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          logger.info(`SSE Transport server started on port ${this.port}`, {
            endpoints: [
              `http://localhost:${this.port}/sse`,
              `http://localhost:${this.port}/health`,
              `http://localhost:${this.port}/stats`
            ]
          });
          resolve();
        });

        this.server.on('error', (error: any) => {
          logger.error('SSE Transport server error:', error);
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to start SSE Transport server:', error);
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('SSE Transport server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getStats() {
    return {
      clientCount: this.clients.size,
      eventHistorySize: this.eventHistory.length,
      uptime: process.uptime(),
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        connectedAt: client.connectedAt,
        lastActivity: client.lastActivity
      }))
    };
  }

  public getEventHistory(): IntegrationEvent[] {
    return [...this.eventHistory];
  }

  public clearEventHistory(): void {
    this.eventHistory = [];
    logger.info('SSE event history cleared');
  }
}

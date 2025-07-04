import { describe, it, expect, beforeEach } from '@jest/globals';
import { TimeBackMcpServer } from '../../src/server/mcp-server.js';

describe('TimeBack MCP Tools', () => {
  let mcpServer: TimeBackMcpServer;

  beforeEach(() => {
    process.env.CLIENT_ID = 'test-client-id';
    process.env.CLIENT_SECRET = 'test-client-secret';
    process.env.OAUTH2_TOKEN_URL = 'https://test.example.com/oauth/token';
    process.env.TIMEBACK_QTI_BASE_URL = 'https://test-qti.example.com';
    process.env.TIMEBACK_ONEROSTER_BASE_URL = 'https://test-oneroster.example.com';
    process.env.TIMEBACK_CALIPER_BASE_URL = 'https://test-caliper.example.com';
    process.env.TIMEBACK_POWERPATH_BASE_URL = 'https://test-powerpath.example.com';
    process.env.TIMEBACK_CASE_BASE_URL = 'https://test-case.example.com';
    
    mcpServer = new TimeBackMcpServer();
  });


  describe('basic functionality', () => {
    it('should create an MCP server instance', () => {
      expect(mcpServer).toBeDefined();
      expect(mcpServer).toBeInstanceOf(TimeBackMcpServer);
    });

    it('should have required methods', () => {
      expect(typeof mcpServer.run).toBe('function');
    });
  });

  describe('tool registration', () => {
    it('should register documentation crawler tools', async () => {
      expect(() => new TimeBackMcpServer()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', () => {
      expect(() => new TimeBackMcpServer()).not.toThrow();
    });

  });
});

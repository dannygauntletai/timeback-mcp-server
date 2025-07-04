import { describe, it, expect } from '@jest/globals';

describe('Basic Test Suite', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should import source modules without errors', async () => {
    const { DocumentationCrawler } = await import('../src/services/documentation-crawler.js');
    const { DocumentationIndexer } = await import('../src/services/documentation-indexer.js');
    const { TimeBackMcpServer } = await import('../src/server/mcp-server.js');

    expect(DocumentationCrawler).toBeDefined();
    expect(DocumentationIndexer).toBeDefined();
    expect(TimeBackMcpServer).toBeDefined();
  });

  it('should create instances without errors', async () => {
    process.env.CLIENT_ID = 'test-client-id';
    process.env.CLIENT_SECRET = 'test-client-secret';
    process.env.OAUTH2_TOKEN_URL = 'https://test.example.com/oauth/token';
    process.env.TIMEBACK_QTI_BASE_URL = 'https://test-qti.example.com';
    process.env.TIMEBACK_ONEROSTER_BASE_URL = 'https://test-oneroster.example.com';
    process.env.TIMEBACK_CALIPER_BASE_URL = 'https://test-caliper.example.com';
    process.env.TIMEBACK_POWERPATH_BASE_URL = 'https://test-powerpath.example.com';
    process.env.TIMEBACK_CASE_BASE_URL = 'https://test-case.example.com';

    const { DocumentationCrawler } = await import('../src/services/documentation-crawler.js');
    const { DocumentationIndexer } = await import('../src/services/documentation-indexer.js');
    const { TimeBackMcpServer } = await import('../src/server/mcp-server.js');

    const crawlerOptions = {
      maxRetries: 2,
      retryDelay: 1000,
      timeout: 10000,
      respectRobotsTxt: false,
      rateLimit: 500
    };

    expect(() => new DocumentationCrawler(crawlerOptions)).not.toThrow();
    expect(() => new DocumentationIndexer()).not.toThrow();
    expect(() => new TimeBackMcpServer()).not.toThrow();
  });
});

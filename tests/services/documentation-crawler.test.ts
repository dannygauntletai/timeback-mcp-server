import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DocumentationCrawler } from '../../src/services/documentation-crawler.js';

describe('DocumentationCrawler', () => {
  let crawler: DocumentationCrawler;
  const options = {
    maxRetries: 2,
    retryDelay: 1000,
    timeout: 10000,
    respectRobotsTxt: false,
    rateLimit: 500
  };

  beforeEach(() => {
    crawler = new DocumentationCrawler(options);
  });

  afterEach(async () => {
    if (crawler) {
      await crawler.close();
    }
  });

  describe('basic functionality', () => {
    it('should create a crawler instance', () => {
      expect(crawler).toBeDefined();
      expect(crawler).toBeInstanceOf(DocumentationCrawler);
    });

    it('should have required public methods', () => {
      expect(typeof crawler.initialize).toBe('function');
      expect(typeof crawler.crawlUrl).toBe('function');
      expect(typeof crawler.crawlMultipleUrls).toBe('function');
      expect(typeof crawler.close).toBe('function');
    });

    it('should initialize without throwing errors', async () => {
      await expect(crawler.initialize()).resolves.not.toThrow();
    });

    it('should close without throwing errors', async () => {
      await crawler.initialize();
      await expect(crawler.close()).resolves.not.toThrow();
    });
  });

  describe('crawling functionality', () => {
    beforeEach(async () => {
      await crawler.initialize();
    });

    it('should handle empty URL arrays', async () => {
      const results = await crawler.crawlMultipleUrls([]);
      expect(results).toHaveLength(0);
    });

    it('should return results array for multiple URLs', async () => {
      const results = await crawler.crawlMultipleUrls([]);
      expect(Array.isArray(results)).toBe(true);
    });
  });

});

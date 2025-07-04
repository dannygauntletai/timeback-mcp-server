import { describe, it, expect, beforeEach } from '@jest/globals';
import { DocumentationIndexer } from '../../src/services/documentation-indexer.js';
import { mockSwaggerContent, mockScalarContent } from '../mocks/mock-data.js';

describe('DocumentationIndexer', () => {
  let indexer: DocumentationIndexer;

  beforeEach(() => {
    indexer = new DocumentationIndexer();
  });

  describe('basic functionality', () => {
    it('should create an indexer instance', () => {
      expect(indexer).toBeDefined();
      expect(indexer).toBeInstanceOf(DocumentationIndexer);
    });

    it('should have required methods', () => {
      expect(typeof indexer.indexCrawledContent).toBe('function');
      expect(typeof indexer.searchDocumentation).toBe('function');
      expect(typeof indexer.getCodeExamples).toBe('function');
      expect(typeof indexer.getEndpoints).toBe('function');
      expect(typeof indexer.getSchemas).toBe('function');
      expect(typeof indexer.getRelationships).toBe('function');
      expect(typeof indexer.getIntegrationPatterns).toBe('function');
      expect(typeof indexer.getIndexStats).toBe('function');
    });

    it('should return empty results when no content is indexed', () => {
      const stats = indexer.getIndexStats();
      expect(stats.totalDocuments).toBe(0);
      
      const examples = indexer.getCodeExamples();
      expect(examples).toHaveLength(0);
      
      const endpoints = indexer.getEndpoints();
      expect(endpoints).toHaveLength(0);
      
      const schemas = indexer.getSchemas();
      expect(schemas).toHaveLength(0);
      
      const relationships = indexer.getRelationships();
      expect(relationships).toHaveLength(0);
      
      const patterns = indexer.getIntegrationPatterns();
      expect(patterns).toHaveLength(0);
    });
  });

  describe('indexing functionality', () => {
    it('should index content without throwing errors', async () => {
      await expect(indexer.indexCrawledContent([mockSwaggerContent]))
        .resolves.not.toThrow();
    });

    it('should handle empty content arrays', async () => {
      await expect(indexer.indexCrawledContent([]))
        .resolves.not.toThrow();
        
      const stats = indexer.getIndexStats();
      expect(stats.totalDocuments).toBe(0);
    });

    it('should update stats after indexing', async () => {
      await indexer.indexCrawledContent([mockSwaggerContent, mockScalarContent]);
      
      const stats = indexer.getIndexStats();
      expect(stats.totalDocuments).toBe(2);
      expect(stats).toHaveProperty('totalEndpoints');
      expect(stats).toHaveProperty('totalSchemas');
      expect(stats).toHaveProperty('totalCodeExamples');
      expect(stats).toHaveProperty('totalConcepts');
    });
  });

  describe('search functionality', () => {
    beforeEach(async () => {
      await indexer.indexCrawledContent([mockSwaggerContent, mockScalarContent]);
    });

    it('should return search results', async () => {
      const results = await indexer.searchDocumentation('test', { limit: 10 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should respect search limits', async () => {
      const results = await indexer.searchDocumentation('test', { limit: 5 });
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty search queries', async () => {
      const results = await indexer.searchDocumentation('', { limit: 10 });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('data retrieval methods', () => {
    beforeEach(async () => {
      await indexer.indexCrawledContent([mockSwaggerContent, mockScalarContent]);
    });

    it('should return code examples', () => {
      const examples = indexer.getCodeExamples();
      expect(Array.isArray(examples)).toBe(true);
    });

    it('should return endpoints', () => {
      const endpoints = indexer.getEndpoints();
      expect(Array.isArray(endpoints)).toBe(true);
    });

    it('should return schemas', () => {
      const schemas = indexer.getSchemas();
      expect(Array.isArray(schemas)).toBe(true);
    });

    it('should return relationships', () => {
      const relationships = indexer.getRelationships();
      expect(Array.isArray(relationships)).toBe(true);
    });

    it('should return integration patterns', () => {
      const patterns = indexer.getIntegrationPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });
});

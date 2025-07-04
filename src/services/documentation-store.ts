import { logger } from '../utils/logger.js';
import { CrawledContent } from './documentation-crawler.js';
import { IndexedDocumentation } from './documentation-indexer.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface StoredDocument {
  id: string;
  url: string;
  api: string;
  title: string;
  content: string;
  metadata: {
    crawledAt: Date;
    lastUpdated: Date;
    version: string;
    contentHash: string;
    format: 'swagger' | 'scalar' | 'google_docs' | 'loom_video' | 'html' | 'markdown';
    size: number;
  };
  endpoints?: StoredEndpoint[];
  schemas?: StoredSchema[];
  codeExamples?: StoredCodeExample[];
}

export interface StoredEndpoint {
  id: string;
  documentId: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters?: StoredParameter[];
  responses?: Record<string, any>;
  tags?: string[];
  operationId?: string;
}

export interface StoredSchema {
  id: string;
  documentId: string;
  name: string;
  type: string;
  description?: string;
  properties?: Record<string, any>;
  required?: string[];
  example?: any;
}

export interface StoredCodeExample {
  id: string;
  documentId: string;
  language: string;
  code: string;
  description?: string;
  context?: string;
  relatedEndpoints?: string[];
  relatedSchemas?: string[];
}

export interface StoredParameter {
  name: string;
  in: string;
  required: boolean;
  type: string;
  description?: string;
  example?: any;
}

export interface DocumentVersion {
  version: string;
  timestamp: Date;
  contentHash: string;
  changes: string[];
  previousVersion?: string;
}

export interface SearchOptions {
  apis?: string[];
  types?: ('endpoint' | 'schema' | 'code_example' | 'document')[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  versions?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  document: StoredDocument;
  relevanceScore: number;
  matchedFields: string[];
  snippet?: string;
}

export interface StoreStats {
  totalDocuments: number;
  totalEndpoints: number;
  totalSchemas: number;
  totalCodeExamples: number;
  apiBreakdown: Record<string, number>;
  lastUpdated: Date;
  storageSize: number;
}

export class DocumentationStore {
  private storePath: string;
  private documentsPath: string;
  private versionsPath: string;
  private indexPath: string;
  private documents: Map<string, StoredDocument> = new Map();
  private versions: Map<string, DocumentVersion[]> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();

  constructor(storePath: string = './data/documentation-store') {
    this.storePath = storePath;
    this.documentsPath = path.join(storePath, 'documents');
    this.versionsPath = path.join(storePath, 'versions');
    this.indexPath = path.join(storePath, 'search-index.json');
  }

  async initialize(): Promise<void> {
    try {
      await this.ensureDirectories();
      await this.loadExistingData();
      logger.info('Documentation store initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize documentation store:', error);
      throw new Error(`Documentation store initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async ensureDirectories(): Promise<void> {
    const directories = [this.storePath, this.documentsPath, this.versionsPath];
    
    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      }
    }
  }

  private async loadExistingData(): Promise<void> {
    try {
      const files = await fs.readdir(this.documentsPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.documentsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const document: StoredDocument = JSON.parse(content, (key, value) => {
            if (key === 'crawledAt' || key === 'lastUpdated') {
              return new Date(value);
            }
            return value;
          });
          
          this.documents.set(document.id, document);
          this.updateSearchIndex(document);
        }
      }

      await this.loadVersionHistory();
      logger.info(`Loaded ${this.documents.size} documents from storage`);
    } catch (error) {
      logger.warn('No existing data found or failed to load:', error);
    }
  }

  private async loadVersionHistory(): Promise<void> {
    try {
      const files = await fs.readdir(this.versionsPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const documentId = file.replace('.json', '');
          const filePath = path.join(this.versionsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const versions: DocumentVersion[] = JSON.parse(content, (key, value) => {
            if (key === 'timestamp') {
              return new Date(value);
            }
            return value;
          });
          
          this.versions.set(documentId, versions);
        }
      }
    } catch (error) {
      logger.warn('Failed to load version history:', error);
    }
  }

  async storeDocument(crawledContent: CrawledContent): Promise<StoredDocument> {
    try {
      const contentHash = this.calculateContentHash(crawledContent.content);
      const existingDoc = this.findDocumentByUrl(crawledContent.url);
      
      let document: StoredDocument;
      let isUpdate = false;

      if (existingDoc && existingDoc.metadata.contentHash === contentHash) {
        logger.debug(`Document unchanged: ${crawledContent.url}`);
        return existingDoc;
      }

      if (existingDoc) {
        await this.createVersion(existingDoc, contentHash);
        document = this.updateDocument(existingDoc, crawledContent, contentHash);
        isUpdate = true;
      } else {
        document = this.createDocument(crawledContent, contentHash);
      }

      await this.persistDocument(document);
      this.documents.set(document.id, document);
      this.updateSearchIndex(document);

      logger.info(`${isUpdate ? 'Updated' : 'Stored'} document: ${document.title} (${document.api})`);
      return document;
    } catch (error) {
      logger.error(`Failed to store document from ${crawledContent.url}:`, error);
      throw new Error(`Document storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async storeMultipleDocuments(crawledContents: CrawledContent[]): Promise<StoredDocument[]> {
    const results: StoredDocument[] = [];
    
    for (const content of crawledContents) {
      try {
        const document = await this.storeDocument(content);
        results.push(document);
      } catch (error) {
        logger.error(`Failed to store document from ${content.url}:`, error);
      }
    }

    logger.info(`Stored ${results.length}/${crawledContents.length} documents successfully`);
    return results;
  }

  async getDocument(id: string): Promise<StoredDocument | null> {
    return this.documents.get(id) || null;
  }

  async getDocumentByUrl(url: string): Promise<StoredDocument | null> {
    return this.findDocumentByUrl(url) || null;
  }

  async getDocumentsByApi(api: string): Promise<StoredDocument[]> {
    return Array.from(this.documents.values()).filter(doc => doc.api === api);
  }

  async searchDocuments(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      const searchTerms = this.tokenizeQuery(query);
      const candidates = this.findCandidateDocuments(searchTerms, options);
      const results = this.scoreAndRankResults(candidates, searchTerms, query);
      
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      
      return results.slice(offset, offset + limit);
    } catch (error) {
      logger.error('Document search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    return this.versions.get(documentId) || [];
  }

  async getDocumentAtVersion(documentId: string, version: string): Promise<StoredDocument | null> {
    const versions = await this.getDocumentVersions(documentId);
    const targetVersion = versions.find(v => v.version === version);
    
    if (!targetVersion) {
      return null;
    }

    try {
      const versionFilePath = path.join(this.versionsPath, `${documentId}-${version}.json`);
      const content = await fs.readFile(versionFilePath, 'utf-8');
      return JSON.parse(content, (key, value) => {
        if (key === 'crawledAt' || key === 'lastUpdated') {
          return new Date(value);
        }
        return value;
      });
    } catch (error) {
      logger.error(`Failed to load document version ${version}:`, error);
      return null;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      const document = this.documents.get(id);
      if (!document) {
        return false;
      }

      const documentPath = path.join(this.documentsPath, `${id}.json`);
      await fs.unlink(documentPath);
      
      const versionsPath = path.join(this.versionsPath, `${id}.json`);
      try {
        await fs.unlink(versionsPath);
      } catch {
      }

      this.documents.delete(id);
      this.versions.delete(id);
      this.removeFromSearchIndex(document);

      logger.info(`Deleted document: ${document.title}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete document ${id}:`, error);
      return false;
    }
  }

  async getStats(): Promise<StoreStats> {
    const documents = Array.from(this.documents.values());
    const apiBreakdown: Record<string, number> = {};
    let totalEndpoints = 0;
    let totalSchemas = 0;
    let totalCodeExamples = 0;
    let storageSize = 0;

    for (const doc of documents) {
      apiBreakdown[doc.api] = (apiBreakdown[doc.api] || 0) + 1;
      totalEndpoints += doc.endpoints?.length || 0;
      totalSchemas += doc.schemas?.length || 0;
      totalCodeExamples += doc.codeExamples?.length || 0;
      storageSize += doc.metadata.size;
    }

    const lastUpdated = documents.reduce((latest, doc) => {
      return doc.metadata.lastUpdated > latest ? doc.metadata.lastUpdated : latest;
    }, new Date(0));

    return {
      totalDocuments: documents.length,
      totalEndpoints,
      totalSchemas,
      totalCodeExamples,
      apiBreakdown,
      lastUpdated,
      storageSize
    };
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let cleanedCount = 0;
    
    for (const [id, versions] of this.versions.entries()) {
      const oldVersions = versions.filter(v => v.timestamp < cutoffDate);
      
      for (const version of oldVersions) {
        try {
          const versionFilePath = path.join(this.versionsPath, `${id}-${version.version}.json`);
          await fs.unlink(versionFilePath);
          cleanedCount++;
        } catch (error) {
          logger.warn(`Failed to cleanup version ${version.version} of document ${id}:`, error);
        }
      }
      
      if (oldVersions.length > 0) {
        const remainingVersions = versions.filter(v => v.timestamp >= cutoffDate);
        this.versions.set(id, remainingVersions);
        await this.persistVersionHistory(id, remainingVersions);
      }
    }

    logger.info(`Cleaned up ${cleanedCount} old document versions`);
    return cleanedCount;
  }

  private findDocumentByUrl(url: string): StoredDocument | undefined {
    return Array.from(this.documents.values()).find(doc => doc.url === url);
  }

  private calculateContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private createDocument(crawledContent: CrawledContent, contentHash: string): StoredDocument {
    const id = this.generateDocumentId(crawledContent.url);
    const now = new Date();
    const api = this.detectApiFromUrl(crawledContent.url);

    return {
      id,
      url: crawledContent.url,
      api,
      title: crawledContent.title,
      content: crawledContent.content,
      metadata: {
        crawledAt: now,
        lastUpdated: now,
        version: '1.0.0',
        contentHash,
        format: this.mapCrawledTypeToFormat(crawledContent.type),
        size: crawledContent.content.length
      },
      endpoints: crawledContent.apiEndpoints?.map(ep => this.convertToStoredEndpoint(ep, id)),
      schemas: crawledContent.schemas?.map(schema => this.convertToStoredSchema(schema, id)),
      codeExamples: crawledContent.codeExamples?.map(example => this.convertToStoredCodeExample(example, id))
    };
  }

  private updateDocument(existingDoc: StoredDocument, crawledContent: CrawledContent, contentHash: string): StoredDocument {
    const version = this.incrementVersion(existingDoc.metadata.version);
    
    return {
      ...existingDoc,
      title: crawledContent.title,
      content: crawledContent.content,
      metadata: {
        ...existingDoc.metadata,
        lastUpdated: new Date(),
        version,
        contentHash,
        format: this.mapCrawledTypeToFormat(crawledContent.type),
        size: crawledContent.content.length
      },
      endpoints: crawledContent.apiEndpoints?.map(ep => this.convertToStoredEndpoint(ep, existingDoc.id)),
      schemas: crawledContent.schemas?.map(schema => this.convertToStoredSchema(schema, existingDoc.id)),
      codeExamples: crawledContent.codeExamples?.map(example => this.convertToStoredCodeExample(example, existingDoc.id))
    };
  }

  private async createVersion(document: StoredDocument, newContentHash: string): Promise<void> {
    const changes = this.detectChanges(document, newContentHash);
    const version: DocumentVersion = {
      version: document.metadata.version,
      timestamp: document.metadata.lastUpdated,
      contentHash: document.metadata.contentHash,
      changes,
      previousVersion: this.getPreviousVersion(document.id)
    };

    const versions = this.versions.get(document.id) || [];
    versions.push(version);
    this.versions.set(document.id, versions);

    await this.persistVersionHistory(document.id, versions);
    await this.persistDocumentVersion(document);
  }

  private detectChanges(document: StoredDocument, newContentHash: string): string[] {
    const changes: string[] = [];
    
    if (document.metadata.contentHash !== newContentHash) {
      changes.push('Content updated');
    }
    
    return changes;
  }

  private getPreviousVersion(documentId: string): string | undefined {
    const versions = this.versions.get(documentId);
    return versions && versions.length > 0 ? versions[versions.length - 1].version : undefined;
  }

  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
  }

  private convertToStoredEndpoint(endpoint: any, documentId: string): StoredEndpoint {
    return {
      id: this.generateId(),
      documentId,
      path: endpoint.path,
      method: endpoint.method,
      summary: endpoint.summary,
      description: endpoint.description,
      parameters: endpoint.parameters?.map((p: any) => ({
        name: p.name,
        in: p.in,
        required: p.required || false,
        type: p.type || p.schema?.type || 'string',
        description: p.description,
        example: p.example
      })),
      responses: endpoint.responses,
      tags: endpoint.tags,
      operationId: endpoint.operationId
    };
  }

  private convertToStoredSchema(schema: any, documentId: string): StoredSchema {
    return {
      id: this.generateId(),
      documentId,
      name: schema.name,
      type: schema.type,
      description: schema.description,
      properties: schema.properties,
      required: schema.required,
      example: schema.example
    };
  }

  private convertToStoredCodeExample(example: any, documentId: string): StoredCodeExample {
    return {
      id: this.generateId(),
      documentId,
      language: example.language,
      code: example.code,
      description: example.description,
      context: example.context,
      relatedEndpoints: example.relatedEndpoints || [],
      relatedSchemas: example.relatedSchemas || []
    };
  }

  private updateSearchIndex(document: StoredDocument): void {
    const searchableText = this.createSearchableText(document);
    const terms = this.tokenizeQuery(searchableText);
    
    for (const term of terms) {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, new Set());
      }
      this.searchIndex.get(term)!.add(document.id);
    }
  }

  private removeFromSearchIndex(document: StoredDocument): void {
    const searchableText = this.createSearchableText(document);
    const terms = this.tokenizeQuery(searchableText);
    
    for (const term of terms) {
      const documentSet = this.searchIndex.get(term);
      if (documentSet) {
        documentSet.delete(document.id);
        if (documentSet.size === 0) {
          this.searchIndex.delete(term);
        }
      }
    }
  }

  private createSearchableText(document: StoredDocument): string {
    const parts = [
      document.title,
      document.api,
      document.content.substring(0, 1000),
      ...(document.endpoints?.map(ep => `${ep.method} ${ep.path} ${ep.summary || ''} ${ep.description || ''}`) || []),
      ...(document.schemas?.map(schema => `${schema.name} ${schema.description || ''}`) || []),
      ...(document.codeExamples?.map(example => `${example.language} ${example.description || ''}`) || [])
    ];
    
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2);
  }

  private findCandidateDocuments(searchTerms: string[], options: SearchOptions): StoredDocument[] {
    const candidateIds = new Set<string>();
    
    for (const term of searchTerms) {
      const documentIds = this.searchIndex.get(term);
      if (documentIds) {
        for (const id of documentIds) {
          candidateIds.add(id);
        }
      }
    }

    let candidates = Array.from(candidateIds)
      .map(id => this.documents.get(id))
      .filter((doc): doc is StoredDocument => doc !== undefined);

    if (options.apis && options.apis.length > 0) {
      candidates = candidates.filter(doc => options.apis!.includes(doc.api));
    }

    if (options.dateRange) {
      candidates = candidates.filter(doc => {
        const docDate = doc.metadata.lastUpdated;
        return (!options.dateRange!.from || docDate >= options.dateRange!.from) &&
               (!options.dateRange!.to || docDate <= options.dateRange!.to);
      });
    }

    return candidates;
  }

  private scoreAndRankResults(candidates: StoredDocument[], searchTerms: string[], originalQuery: string): SearchResult[] {
    return candidates
      .map(doc => {
        const searchableText = this.createSearchableText(doc);
        const relevanceScore = this.calculateRelevanceScore(searchableText, searchTerms, originalQuery);
        const matchedFields = this.getMatchedFields(doc, searchTerms);
        const snippet = this.generateSnippet(doc.content, searchTerms);
        
        return {
          document: doc,
          relevanceScore,
          matchedFields,
          snippet
        };
      })
      .filter(result => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private calculateRelevanceScore(text: string, searchTerms: string[], originalQuery: string): number {
    let score = 0;
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes(originalQuery.toLowerCase())) {
      score += 10;
    }
    
    for (const term of searchTerms) {
      const termCount = (lowerText.match(new RegExp(term, 'g')) || []).length;
      score += termCount * 2;
    }
    
    return score;
  }

  private getMatchedFields(document: StoredDocument, searchTerms: string[]): string[] {
    const matchedFields: string[] = [];
    
    for (const term of searchTerms) {
      if (document.title.toLowerCase().includes(term)) {
        matchedFields.push('title');
      }
      if (document.content.toLowerCase().includes(term)) {
        matchedFields.push('content');
      }
      if (document.api.toLowerCase().includes(term)) {
        matchedFields.push('api');
      }
    }
    
    return [...new Set(matchedFields)];
  }

  private generateSnippet(content: string, searchTerms: string[]): string {
    const maxLength = 200;
    const lowerContent = content.toLowerCase();
    
    for (const term of searchTerms) {
      const index = lowerContent.indexOf(term);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + term.length + 50);
        let snippet = content.substring(start, end);
        
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';
        
        return snippet.length > maxLength ? snippet.substring(0, maxLength) + '...' : snippet;
      }
    }
    
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  private async persistDocument(document: StoredDocument): Promise<void> {
    const filePath = path.join(this.documentsPath, `${document.id}.json`);
    const content = JSON.stringify(document, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async persistVersionHistory(documentId: string, versions: DocumentVersion[]): Promise<void> {
    const filePath = path.join(this.versionsPath, `${documentId}.json`);
    const content = JSON.stringify(versions, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async persistDocumentVersion(document: StoredDocument): Promise<void> {
    const filePath = path.join(this.versionsPath, `${document.id}-${document.metadata.version}.json`);
    const content = JSON.stringify(document, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private generateDocumentId(url: string): string {
    return this.calculateContentHash(url + Date.now().toString());
  }

  private detectApiFromUrl(url: string): string {
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('qti')) return 'qti';
    if (lowerUrl.includes('oneroster')) return 'oneroster';
    if (lowerUrl.includes('caliper')) return 'caliper';
    if (lowerUrl.includes('powerpath')) return 'powerpath';
    if (lowerUrl.includes('case')) return 'case';
    if (lowerUrl.includes('openbadge')) return 'openbadge';
    if (lowerUrl.includes('clr')) return 'clr';
    
    if (lowerUrl.includes('alpha-1edtech.com')) {
      if (lowerUrl.includes('scalar?api=powerpath')) return 'powerpath';
      if (lowerUrl.includes('scalar?api=case')) return 'case';
      return 'oneroster'; // Default for alpha-1edtech.com
    }
    
    return 'unknown';
  }

  private mapCrawledTypeToFormat(type: 'swagger' | 'scalar' | 'google-docs' | 'loom-video'): 'swagger' | 'scalar' | 'google_docs' | 'loom_video' | 'html' | 'markdown' {
    switch (type) {
      case 'swagger': return 'swagger';
      case 'scalar': return 'scalar';
      case 'google-docs': return 'google_docs';
      case 'loom-video': return 'loom_video';
      default: return 'html';
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

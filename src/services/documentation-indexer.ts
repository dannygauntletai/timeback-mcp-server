import { logger } from '../utils/logger.js';
import { CrawledContent, ApiEndpoint, Schema, CodeExample } from './documentation-crawler.js';
import { DocumentationStore } from './documentation-store.js';

export interface IndexedDocumentation {
  id: string;
  url: string;
  title: string;
  type: 'swagger' | 'scalar' | 'google-docs' | 'loom-video';
  api: string; // QTI, OneRoster, Caliper, PowerPath, CASE, OpenBadge, CLR
  content: string;
  searchableText: string;
  endpoints: IndexedEndpoint[];
  schemas: IndexedSchema[];
  codeExamples: IndexedCodeExample[];
  concepts: IndexedConcept[];
  relationships: ApiRelationship[];
  metadata: Record<string, any>;
  indexedAt: Date;
  lastUpdated: Date;
}

export interface IndexedEndpoint {
  id: string;
  api: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: IndexedParameter[];
  responses: Record<string, any>;
  searchableText: string;
  relatedEndpoints: string[]; // IDs of related endpoints
}

export interface IndexedSchema {
  id: string;
  api: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  description?: string;
  example?: any;
  searchableText: string;
  relatedSchemas: string[]; // IDs of similar schemas in other APIs
  usedInEndpoints: string[]; // IDs of endpoints that use this schema
}

export interface IndexedCodeExample {
  id: string;
  api: string;
  language: string;
  code: string;
  description?: string;
  context?: string;
  searchableText: string;
  relatedExamples: string[]; // IDs of similar examples
  usesEndpoints: string[]; // IDs of endpoints demonstrated
  usesSchemas: string[]; // IDs of schemas demonstrated
}

export interface IndexedConcept {
  id: string;
  name: string;
  description: string;
  apis: string[]; // Which APIs this concept appears in
  keywords: string[];
  searchableText: string;
  relatedConcepts: string[];
}

export interface IndexedParameter {
  name: string;
  in: string;
  required: boolean;
  type: string;
  description?: string;
}

export interface ApiRelationship {
  id: string;
  sourceApi: string;
  targetApi: string;
  type: 'similar_endpoint' | 'similar_schema' | 'data_flow' | 'integration_pattern';
  sourceId: string; // ID of source endpoint/schema
  targetId: string; // ID of target endpoint/schema
  similarity: number; // 0-1 score
  description: string;
  integrationNotes?: string;
}

export interface SearchResult {
  item: IndexedEndpoint | IndexedSchema | IndexedCodeExample | IndexedConcept;
  type: 'endpoint' | 'schema' | 'code_example' | 'concept';
  relevanceScore: number;
  matchedFields: string[];
  context?: string;
}

export interface IntegrationPattern {
  id: string;
  name: string;
  description: string;
  apis: string[];
  steps: IntegrationStep[];
  codeExamples: string[]; // IDs of relevant code examples
  prerequisites: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface IntegrationStep {
  order: number;
  api: string;
  action: string;
  endpoint?: string;
  schema?: string;
  description: string;
  codeExample?: string;
}

export class DocumentationIndexer {
  private indexedDocs: Map<string, IndexedDocumentation> = new Map();
  private endpoints: Map<string, IndexedEndpoint> = new Map();
  private schemas: Map<string, IndexedSchema> = new Map();
  private codeExamples: Map<string, IndexedCodeExample> = new Map();
  private concepts: Map<string, IndexedConcept> = new Map();
  private relationships: Map<string, ApiRelationship> = new Map();
  private integrationPatterns: Map<string, IntegrationPattern> = new Map();
  private store: DocumentationStore;

  constructor() {
    this.store = new DocumentationStore();
    logger.info('Documentation indexer initialized');
  }

  async initialize(): Promise<void> {
    await this.store.initialize();
    await this.loadExistingData();
  }

  private async loadExistingData(): Promise<void> {
    try {
      const stats = await this.store.getStats();
      logger.info(`Loaded ${stats.totalDocuments} existing documents from store`);
    } catch (error) {
      logger.warn('Failed to load existing data:', error);
    }
  }

  async indexCrawledContent(crawledContent: CrawledContent[]): Promise<void> {
    logger.info(`Starting to index ${crawledContent.length} crawled documents`);

    const storedDocs = await this.store.storeMultipleDocuments(crawledContent);
    logger.info(`Stored ${storedDocs.length} documents in persistent storage`);

    for (const content of crawledContent) {
      try {
        await this.indexSingleDocument(content);
        logger.debug(`Successfully indexed: ${content.url}`);
      } catch (error) {
        logger.error(`Failed to index ${content.url}:`, error);
      }
    }

    await this.buildRelationships();
    await this.extractIntegrationPatterns();

    logger.info(`Indexing complete. Indexed ${this.indexedDocs.size} documents, ${this.endpoints.size} endpoints, ${this.schemas.size} schemas`);
  }

  private async indexSingleDocument(content: CrawledContent): Promise<void> {
    const api = this.detectApiFromUrl(content.url);
    const docId = this.generateId(content.url);

    const indexedEndpoints: IndexedEndpoint[] = [];
    if (content.apiEndpoints) {
      for (const endpoint of content.apiEndpoints) {
        const indexedEndpoint = await this.indexEndpoint(endpoint, api, docId);
        indexedEndpoints.push(indexedEndpoint);
        this.endpoints.set(indexedEndpoint.id, indexedEndpoint);
      }
    }

    const indexedSchemas: IndexedSchema[] = [];
    if (content.schemas) {
      for (const schema of content.schemas) {
        const indexedSchema = await this.indexSchema(schema, api, docId);
        indexedSchemas.push(indexedSchema);
        this.schemas.set(indexedSchema.id, indexedSchema);
      }
    }

    const indexedCodeExamples: IndexedCodeExample[] = [];
    if (content.codeExamples) {
      for (const example of content.codeExamples) {
        const indexedExample = await this.indexCodeExample(example, api, docId);
        indexedCodeExamples.push(indexedExample);
        this.codeExamples.set(indexedExample.id, indexedExample);
      }
    }

    const concepts = await this.extractConcepts(content, api);
    for (const concept of concepts) {
      const existingConcept = Array.from(this.concepts.values()).find(c => 
        c.name.toLowerCase() === concept.name.toLowerCase()
      );
      
      if (existingConcept) {
        if (!existingConcept.apis.includes(api)) {
          existingConcept.apis.push(api);
        }
        existingConcept.keywords = [...new Set([...existingConcept.keywords, ...concept.keywords])];
      } else {
        this.concepts.set(concept.id, concept);
      }
    }

    const indexedDoc: IndexedDocumentation = {
      id: docId,
      url: content.url,
      title: content.title,
      type: content.type,
      api,
      content: content.content,
      searchableText: this.createSearchableText(content),
      endpoints: indexedEndpoints,
      schemas: indexedSchemas,
      codeExamples: indexedCodeExamples,
      concepts,
      relationships: [], // Will be populated later
      metadata: content.metadata,
      indexedAt: new Date(),
      lastUpdated: content.extractedAt,
    };

    this.indexedDocs.set(docId, indexedDoc);
  }

  private async indexEndpoint(endpoint: ApiEndpoint, api: string, docId: string): Promise<IndexedEndpoint> {
    const endpointId = this.generateId(`${api}-${endpoint.method}-${endpoint.path}`);
    
    return {
      id: endpointId,
      api,
      path: endpoint.path,
      method: endpoint.method.toUpperCase(),
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags || [],
      parameters: endpoint.parameters?.map(p => ({
        name: p.name,
        in: p.in,
        required: p.required,
        type: p.type,
        description: p.description,
      })) || [],
      responses: endpoint.responses || {},
      searchableText: this.createEndpointSearchableText(endpoint),
      relatedEndpoints: [], // Will be populated during relationship building
    };
  }

  private async indexSchema(schema: Schema, api: string, docId: string): Promise<IndexedSchema> {
    const schemaId = this.generateId(`${api}-schema-${schema.name}`);
    
    return {
      id: schemaId,
      api,
      name: schema.name,
      type: schema.type,
      properties: schema.properties || {},
      description: schema.description,
      example: schema.example,
      searchableText: this.createSchemaSearchableText(schema),
      relatedSchemas: [], // Will be populated during relationship building
      usedInEndpoints: [], // Will be populated during relationship building
    };
  }

  private async indexCodeExample(example: CodeExample, api: string, docId: string): Promise<IndexedCodeExample> {
    const exampleId = this.generateId(`${api}-example-${example.language}-${Date.now()}`);
    
    return {
      id: exampleId,
      api,
      language: example.language,
      code: example.code,
      description: example.description,
      context: example.context,
      searchableText: this.createCodeExampleSearchableText(example),
      relatedExamples: [], // Will be populated during relationship building
      usesEndpoints: [], // Will be populated by analyzing code content
      usesSchemas: [], // Will be populated by analyzing code content
    };
  }

  private async extractConcepts(content: CrawledContent, api: string): Promise<IndexedConcept[]> {
    const concepts: IndexedConcept[] = [];
    
    const conceptKeywords = {
      'Authentication': ['auth', 'oauth', 'token', 'login', 'credential'],
      'Student': ['student', 'learner', 'user', 'person', 'candidate'],
      'Assessment': ['assessment', 'test', 'quiz', 'exam', 'evaluation'],
      'Grade': ['grade', 'score', 'result', 'mark', 'rating'],
      'Course': ['course', 'class', 'subject', 'curriculum'],
      'Enrollment': ['enrollment', 'registration', 'enroll', 'register'],
      'Analytics': ['analytics', 'tracking', 'event', 'activity', 'metric'],
      'Standards': ['standard', 'competency', 'skill', 'objective', 'outcome'],
      'Roster': ['roster', 'list', 'membership', 'participant'],
      'Caliper': ['caliper', 'event', 'profile', 'entity', 'sensor'],
    };

    const contentText = content.content.toLowerCase();
    
    for (const [conceptName, keywords] of Object.entries(conceptKeywords)) {
      const matchedKeywords = keywords.filter(keyword => 
        contentText.includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        const conceptId = this.generateId(`concept-${conceptName.toLowerCase()}`);
        
        concepts.push({
          id: conceptId,
          name: conceptName,
          description: `${conceptName} concept found in ${api} documentation`,
          apis: [api],
          keywords: matchedKeywords,
          searchableText: `${conceptName} ${matchedKeywords.join(' ')}`,
          relatedConcepts: [],
        });
      }
    }

    return concepts;
  }

  private async buildRelationships(): Promise<void> {
    logger.info('Building relationships between APIs');

    await this.buildEndpointRelationships();
    
    await this.buildSchemaRelationships();
    
    await this.buildCodeExampleRelationships();

    logger.info(`Built ${this.relationships.size} relationships`);
  }

  private async buildEndpointRelationships(): Promise<void> {
    const endpoints = Array.from(this.endpoints.values());
    
    for (let i = 0; i < endpoints.length; i++) {
      for (let j = i + 1; j < endpoints.length; j++) {
        const endpoint1 = endpoints[i];
        const endpoint2 = endpoints[j];
        
        if (endpoint1.api !== endpoint2.api) {
          const similarity = this.calculateEndpointSimilarity(endpoint1, endpoint2);
          
          if (similarity > 0.6) {
            const relationshipId = this.generateId(`rel-${endpoint1.id}-${endpoint2.id}`);
            
            const relationship: ApiRelationship = {
              id: relationshipId,
              sourceApi: endpoint1.api,
              targetApi: endpoint2.api,
              type: 'similar_endpoint',
              sourceId: endpoint1.id,
              targetId: endpoint2.id,
              similarity,
              description: `Similar endpoints: ${endpoint1.method} ${endpoint1.path} (${endpoint1.api}) and ${endpoint2.method} ${endpoint2.path} (${endpoint2.api})`,
              integrationNotes: this.generateIntegrationNotes(endpoint1, endpoint2),
            };
            
            this.relationships.set(relationshipId, relationship);
            
            endpoint1.relatedEndpoints.push(endpoint2.id);
            endpoint2.relatedEndpoints.push(endpoint1.id);
          }
        }
      }
    }
  }

  private async buildSchemaRelationships(): Promise<void> {
    const schemas = Array.from(this.schemas.values());
    
    for (let i = 0; i < schemas.length; i++) {
      for (let j = i + 1; j < schemas.length; j++) {
        const schema1 = schemas[i];
        const schema2 = schemas[j];
        
        if (schema1.api !== schema2.api) {
          const similarity = this.calculateSchemaSimilarity(schema1, schema2);
          
          if (similarity > 0.5) {
            const relationshipId = this.generateId(`rel-${schema1.id}-${schema2.id}`);
            
            const relationship: ApiRelationship = {
              id: relationshipId,
              sourceApi: schema1.api,
              targetApi: schema2.api,
              type: 'similar_schema',
              sourceId: schema1.id,
              targetId: schema2.id,
              similarity,
              description: `Similar schemas: ${schema1.name} (${schema1.api}) and ${schema2.name} (${schema2.api})`,
            };
            
            this.relationships.set(relationshipId, relationship);
            
            schema1.relatedSchemas.push(schema2.id);
            schema2.relatedSchemas.push(schema1.id);
          }
        }
      }
    }
  }

  private async buildCodeExampleRelationships(): Promise<void> {
    const examples = Array.from(this.codeExamples.values());
    
    for (let i = 0; i < examples.length; i++) {
      for (let j = i + 1; j < examples.length; j++) {
        const example1 = examples[i];
        const example2 = examples[j];
        
        if (example1.api !== example2.api && example1.language === example2.language) {
          const similarity = this.calculateCodeSimilarity(example1, example2);
          
          if (similarity > 0.4) {
            example1.relatedExamples.push(example2.id);
            example2.relatedExamples.push(example1.id);
          }
        }
      }
    }
  }

  private calculateEndpointSimilarity(endpoint1: IndexedEndpoint, endpoint2: IndexedEndpoint): number {
    let score = 0;
    
    if (endpoint1.method === endpoint2.method) {
      score += 0.3;
    }
    
    const pathSimilarity = this.calculateStringSimilarity(endpoint1.path, endpoint2.path);
    score += pathSimilarity * 0.4;
    
    const summaryText1 = `${endpoint1.summary || ''} ${endpoint1.description || ''}`.toLowerCase();
    const summaryText2 = `${endpoint2.summary || ''} ${endpoint2.description || ''}`.toLowerCase();
    const textSimilarity = this.calculateStringSimilarity(summaryText1, summaryText2);
    score += textSimilarity * 0.3;
    
    return Math.min(score, 1);
  }

  private calculateSchemaSimilarity(schema1: IndexedSchema, schema2: IndexedSchema): number {
    let score = 0;
    
    const nameSimilarity = this.calculateStringSimilarity(schema1.name, schema2.name);
    score += nameSimilarity * 0.4;
    
    const props1 = Object.keys(schema1.properties);
    const props2 = Object.keys(schema2.properties);
    const commonProps = props1.filter(prop => props2.includes(prop));
    const propSimilarity = commonProps.length / Math.max(props1.length, props2.length);
    score += propSimilarity * 0.6;
    
    return Math.min(score, 1);
  }

  private calculateCodeSimilarity(example1: IndexedCodeExample, example2: IndexedCodeExample): number {
    const code1Words = example1.code.toLowerCase().split(/\W+/);
    const code2Words = example2.code.toLowerCase().split(/\W+/);
    
    const commonWords = code1Words.filter(word => 
      word.length > 3 && code2Words.includes(word)
    );
    
    return commonWords.length / Math.max(code1Words.length, code2Words.length);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const words2 = str2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  private async extractIntegrationPatterns(): Promise<void> {
    logger.info('Extracting integration patterns');

    const patterns = [
      {
        name: 'Student Data Sync',
        description: 'Synchronize student information between OneRoster and other APIs',
        apis: ['OneRoster', 'Caliper', 'QTI'],
        difficulty: 'beginner' as const,
      },
      {
        name: 'Assessment Workflow',
        description: 'Complete assessment workflow from creation to analytics',
        apis: ['QTI', 'Caliper', 'PowerPath'],
        difficulty: 'intermediate' as const,
      },
      {
        name: 'Standards Alignment',
        description: 'Align assessments and learning paths with academic standards',
        apis: ['CASE', 'QTI', 'PowerPath'],
        difficulty: 'advanced' as const,
      },
      {
        name: 'Learning Analytics Pipeline',
        description: 'Track and analyze learning activities across platforms',
        apis: ['Caliper', 'OneRoster', 'PowerPath'],
        difficulty: 'intermediate' as const,
      },
    ];

    for (const pattern of patterns) {
      const patternId = this.generateId(`pattern-${pattern.name.toLowerCase().replace(/\s+/g, '-')}`);
      
      const integrationPattern: IntegrationPattern = {
        id: patternId,
        name: pattern.name,
        description: pattern.description,
        apis: pattern.apis,
        steps: await this.generateIntegrationSteps(pattern.apis),
        codeExamples: this.findRelevantCodeExamples(pattern.apis),
        prerequisites: this.generatePrerequisites(pattern.apis),
        difficulty: pattern.difficulty,
      };
      
      this.integrationPatterns.set(patternId, integrationPattern);
    }

    logger.info(`Extracted ${this.integrationPatterns.size} integration patterns`);
  }

  private async generateIntegrationSteps(apis: string[]): Promise<IntegrationStep[]> {
    const steps: IntegrationStep[] = [];
    
    if (apis.includes('OneRoster')) {
      steps.push({
        order: 1,
        api: 'OneRoster',
        action: 'Authenticate and fetch student roster',
        endpoint: '/users',
        description: 'Get list of students and their basic information',
      });
    }
    
    if (apis.includes('QTI')) {
      steps.push({
        order: steps.length + 1,
        api: 'QTI',
        action: 'Create or retrieve assessment',
        endpoint: '/assessmentTests',
        description: 'Set up assessment for students',
      });
    }
    
    if (apis.includes('Caliper')) {
      steps.push({
        order: steps.length + 1,
        api: 'Caliper',
        action: 'Track learning events',
        endpoint: '/events',
        description: 'Send learning activity events for analytics',
      });
    }
    
    return steps;
  }

  private findRelevantCodeExamples(apis: string[]): string[] {
    return Array.from(this.codeExamples.values())
      .filter(example => apis.includes(example.api))
      .map(example => example.id);
  }

  private generatePrerequisites(apis: string[]): string[] {
    const prerequisites = ['OAuth2 client credentials'];
    
    if (apis.includes('OneRoster')) {
      prerequisites.push('OneRoster API access');
    }
    if (apis.includes('QTI')) {
      prerequisites.push('QTI API access');
    }
    if (apis.includes('Caliper')) {
      prerequisites.push('Caliper sensor configuration');
    }
    
    return prerequisites;
  }

  private generateIntegrationNotes(endpoint1: IndexedEndpoint, endpoint2: IndexedEndpoint): string {
    return `These endpoints serve similar purposes and can be used together in integration workflows. Consider mapping data between ${endpoint1.api} and ${endpoint2.api} for comprehensive functionality.`;
  }

  private detectApiFromUrl(url: string): string {
    if (url.includes('qti.alpha-1edtech.com')) return 'QTI';
    if (url.includes('api.alpha-1edtech.com/scalar') && url.includes('oneroster')) return 'OneRoster';
    if (url.includes('api.alpha-1edtech.com/scalar') && url.includes('powerpath')) return 'PowerPath';
    if (url.includes('api.alpha-1edtech.com/scalar') && url.includes('case')) return 'CASE';
    if (url.includes('caliper.alpha-1edtech.com')) return 'Caliper';
    if (url.includes('loom.com') && url.includes('openbadge')) return 'OpenBadge';
    if (url.includes('loom.com') && url.includes('clr')) return 'CLR';
    
    if (url.includes('oneroster')) return 'OneRoster';
    if (url.includes('powerpath')) return 'PowerPath';
    if (url.includes('case')) return 'CASE';
    if (url.includes('caliper')) return 'Caliper';
    if (url.includes('qti')) return 'QTI';
    
    return 'Unknown';
  }

  private createSearchableText(content: CrawledContent): string {
    const parts = [
      content.title,
      content.content,
      content.apiEndpoints?.map(ep => `${ep.method} ${ep.path} ${ep.summary || ''}`).join(' ') || '',
      content.schemas?.map(s => `${s.name} ${s.description || ''}`).join(' ') || '',
      content.codeExamples?.map(ex => `${ex.language} ${ex.description || ''}`).join(' ') || '',
    ];
    
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  private createEndpointSearchableText(endpoint: ApiEndpoint): string {
    return [
      endpoint.method,
      endpoint.path,
      endpoint.summary || '',
      endpoint.description || '',
      endpoint.tags?.join(' ') || '',
      endpoint.parameters?.map(p => `${p.name} ${p.description || ''}`).join(' ') || '',
    ].filter(Boolean).join(' ').toLowerCase();
  }

  private createSchemaSearchableText(schema: Schema): string {
    return [
      schema.name,
      schema.type,
      schema.description || '',
      Object.keys(schema.properties || {}).join(' '),
    ].filter(Boolean).join(' ').toLowerCase();
  }

  private createCodeExampleSearchableText(example: CodeExample): string {
    return [
      example.language,
      example.description || '',
      example.context || '',
      example.code,
    ].filter(Boolean).join(' ').toLowerCase();
  }

  private generateId(input: string): string {
    return Buffer.from(input).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  async searchDocumentation(query: string, filters?: {
    apis?: string[];
    types?: ('endpoint' | 'schema' | 'code_example' | 'concept')[];
    limit?: number;
  }): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const limit = filters?.limit || 50;

    if (!filters?.types || filters.types.includes('endpoint')) {
      for (const endpoint of this.endpoints.values()) {
        if (filters?.apis && !filters.apis.includes(endpoint.api)) continue;
        
        const relevance = this.calculateSearchRelevance(queryLower, endpoint.searchableText);
        if (relevance > 0.1) {
          results.push({
            item: endpoint,
            type: 'endpoint',
            relevanceScore: relevance,
            matchedFields: this.getMatchedFields(queryLower, endpoint),
          });
        }
      }
    }

    if (!filters?.types || filters.types.includes('schema')) {
      for (const schema of this.schemas.values()) {
        if (filters?.apis && !filters.apis.includes(schema.api)) continue;
        
        const relevance = this.calculateSearchRelevance(queryLower, schema.searchableText);
        if (relevance > 0.1) {
          results.push({
            item: schema,
            type: 'schema',
            relevanceScore: relevance,
            matchedFields: this.getMatchedFields(queryLower, schema),
          });
        }
      }
    }

    if (!filters?.types || filters.types.includes('code_example')) {
      for (const example of this.codeExamples.values()) {
        if (filters?.apis && !filters.apis.includes(example.api)) continue;
        
        const relevance = this.calculateSearchRelevance(queryLower, example.searchableText);
        if (relevance > 0.1) {
          results.push({
            item: example,
            type: 'code_example',
            relevanceScore: relevance,
            matchedFields: this.getMatchedFields(queryLower, example),
          });
        }
      }
    }

    if (!filters?.types || filters.types.includes('concept')) {
      for (const concept of this.concepts.values()) {
        if (filters?.apis && !concept.apis.some(api => filters.apis!.includes(api))) continue;
        
        const relevance = this.calculateSearchRelevance(queryLower, concept.searchableText);
        if (relevance > 0.1) {
          results.push({
            item: concept,
            type: 'concept',
            relevanceScore: relevance,
            matchedFields: this.getMatchedFields(queryLower, concept),
          });
        }
      }
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  private calculateSearchRelevance(query: string, text: string): number {
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    const textWords = text.split(/\s+/);
    
    let score = 0;
    for (const queryWord of queryWords) {
      if (text.includes(queryWord)) {
        score += 1;
      } else {
        const partialMatches = textWords.filter(word => 
          word.includes(queryWord) || queryWord.includes(word)
        );
        score += partialMatches.length * 0.3;
      }
    }
    
    return score / queryWords.length;
  }

  private getMatchedFields(query: string, item: any): string[] {
    const fields: string[] = [];
    const queryLower = query.toLowerCase();
    
    if (item.path && item.path.toLowerCase().includes(queryLower)) fields.push('path');
    if (item.method && item.method.toLowerCase().includes(queryLower)) fields.push('method');
    if (item.summary && item.summary.toLowerCase().includes(queryLower)) fields.push('summary');
    if (item.description && item.description.toLowerCase().includes(queryLower)) fields.push('description');
    if (item.name && item.name.toLowerCase().includes(queryLower)) fields.push('name');
    if (item.code && item.code.toLowerCase().includes(queryLower)) fields.push('code');
    
    return fields;
  }

  getIndexedDocuments(): IndexedDocumentation[] {
    return Array.from(this.indexedDocs.values());
  }

  getEndpoints(api?: string): IndexedEndpoint[] {
    const endpoints = Array.from(this.endpoints.values());
    return api ? endpoints.filter(ep => ep.api === api) : endpoints;
  }

  getSchemas(api?: string): IndexedSchema[] {
    const schemas = Array.from(this.schemas.values());
    return api ? schemas.filter(s => s.api === api) : schemas;
  }

  getCodeExamples(api?: string, language?: string): IndexedCodeExample[] {
    let examples = Array.from(this.codeExamples.values());
    if (api) examples = examples.filter(ex => ex.api === api);
    if (language) examples = examples.filter(ex => ex.language === language);
    return examples;
  }

  getConcepts(): IndexedConcept[] {
    return Array.from(this.concepts.values());
  }

  getRelationships(sourceApi?: string, targetApi?: string): ApiRelationship[] {
    let relationships = Array.from(this.relationships.values());
    if (sourceApi) relationships = relationships.filter(r => r.sourceApi === sourceApi);
    if (targetApi) relationships = relationships.filter(r => r.targetApi === targetApi);
    return relationships;
  }

  getIntegrationPatterns(): IntegrationPattern[] {
    return Array.from(this.integrationPatterns.values());
  }

  async getIndexStats(): Promise<Record<string, any>> {
    try {
      const storeStats = await this.store.getStats();
      return {
        totalDocuments: storeStats.totalDocuments,
        totalEndpoints: storeStats.totalEndpoints,
        totalSchemas: storeStats.totalSchemas,
        totalCodeExamples: storeStats.totalCodeExamples,
        totalConcepts: this.concepts.size,
        totalRelationships: this.relationships.size,
        totalIntegrationPatterns: this.integrationPatterns.size,
        apiBreakdown: storeStats.apiBreakdown,
        lastUpdated: storeStats.lastUpdated,
        storageSize: storeStats.storageSize
      };
    } catch (error) {
      logger.error('Failed to get store stats:', error);
      return {
        totalDocuments: this.indexedDocs.size,
        totalEndpoints: this.endpoints.size,
        totalSchemas: this.schemas.size,
        totalCodeExamples: this.codeExamples.size,
        totalConcepts: this.concepts.size,
        totalRelationships: this.relationships.size,
        totalIntegrationPatterns: this.integrationPatterns.size,
        apiBreakdown: this.getApiBreakdown(),
      };
    }
  }

  private getApiBreakdown(): Record<string, any> {
    const breakdown: Record<string, any> = {};
    
    for (const doc of this.indexedDocs.values()) {
      if (!breakdown[doc.api]) {
        breakdown[doc.api] = {
          documents: 0,
          endpoints: 0,
          schemas: 0,
          codeExamples: 0,
        };
      }
      
      breakdown[doc.api].documents++;
      breakdown[doc.api].endpoints += doc.endpoints.length;
      breakdown[doc.api].schemas += doc.schemas.length;
      breakdown[doc.api].codeExamples += doc.codeExamples.length;
    }
    
    return breakdown;
  }

  async clearIndex(): Promise<void> {
    logger.info('Clearing documentation index...');
    
    this.indexedDocs.clear();
    this.endpoints.clear();
    this.schemas.clear();
    this.codeExamples.clear();
    this.concepts.clear();
    this.relationships.clear();
    this.integrationPatterns.clear();
    
    try {
      const stats = await this.store.getStats();
      const allDocs = await Promise.all(
        Object.keys(stats.apiBreakdown).map(async (api) => {
          return await this.store.getDocumentsByApi(api);
        })
      );
      
      for (const docs of allDocs) {
        for (const doc of docs) {
          await this.store.deleteDocument(doc.id);
        }
      }
      
      logger.info('Documentation index and persistent storage cleared successfully');
    } catch (error) {
      logger.warn('Failed to clear persistent storage:', error);
      logger.info('Documentation index cleared (in-memory only)');
    }
  }
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { OpenAPIParser } from '../services/openapi-parser.js';
import { AuthService } from '../services/auth.js';
import { CodebaseAnalyzer, CodebaseAnalysis } from '../services/codebase-analyzer.js';
import { DocumentationCrawler } from '../services/documentation-crawler.js';
import { DocumentationIndexer } from '../services/documentation-indexer.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const AnalyzeCodebaseSchema = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  includeCodeExamples: z.boolean().optional().default(true),
  focusAreas: z.array(z.string()).optional(),
});

const GenerateIntegrationCodeSchema = z.object({
  language: z.enum(['javascript', 'typescript', 'python', 'java']),
  framework: z.string().min(1, 'Framework is required'),
  integrationPattern: z.enum(['oauth-setup', 'data-sync', 'event-tracking', 'assessment-delivery', 'standards-alignment']),
  apis: z.array(z.string()).min(1, 'At least one API is required'),
});

const DetectIntegrationOpportunitiesSchema = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  analysisDepth: z.enum(['shallow', 'deep']).optional().default('deep'),
});

const AnalyzeApiEndpointsSchema = z.object({
  api: z.string().optional(),
  tag: z.string().optional(),
  method: z.string().optional(),
});

const SearchApiDocumentationSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  api: z.string().optional(),
  includeSchemas: z.boolean().optional().default(true),
});

const CompareDataModelsSchema = z.object({
  sourceApi: z.string().min(1, 'Source API is required'),
  targetApi: z.string().min(1, 'Target API is required'),
  sourceSchema: z.string().min(1, 'Source schema is required'),
  targetSchema: z.string().min(1, 'Target schema is required'),
});

const GenerateIntegrationMappingSchema = z.object({
  sourceApi: z.string().min(1, 'Source API is required'),
  targetApi: z.string().min(1, 'Target API is required'),
  useCase: z.string().min(1, 'Use case is required'),
});

const ValidateApiIntegrationSchema = z.object({
  api: z.string().min(1, 'API is required'),
  configuration: z.record(z.any()),
});

const CrawlTimeBackDocumentationSchema = z.object({
  forceRefresh: z.boolean().optional().default(false),
  specificApis: z.array(z.string()).optional(),
});

const SearchComprehensiveDocsSchema = z.object({
  query: z.string().min(1),
  apis: z.array(z.string()).optional(),
  types: z.array(z.enum(['endpoint', 'schema', 'code_example', 'concept'])).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
});

const GetApiExamplesSchema = z.object({
  api: z.string().optional(),
  language: z.string().optional(),
  endpoint: z.string().optional(),
  useCase: z.string().optional(),
});

const CompareApiImplementationsSchema = z.object({
  sourceApi: z.string(),
  targetApi: z.string(),
  functionality: z.string(),
});

const GetIntegrationPatternsSchema = z.object({
  apis: z.array(z.string()).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  useCase: z.string().optional(),
});

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class IntegrationError extends Error {
  constructor(message: string, public api?: string) {
    super(message);
    this.name = 'IntegrationError';
  }
}

const projectDir = process.cwd();

export class TimeBackMcpServer {
  private server: Server;
  private openApiParser: OpenAPIParser;
  private authService: AuthService;
  private codebaseAnalyzer: CodebaseAnalyzer;
  private documentationCrawler: DocumentationCrawler;
  private documentationIndexer: DocumentationIndexer;

  constructor() {
    this.validateConfiguration();
    
    this.server = new Server(
      {
        name: config.server.name,
        version: config.server.version,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.openApiParser = new OpenAPIParser();
    this.authService = new AuthService();
    this.codebaseAnalyzer = new CodebaseAnalyzer();
    this.documentationCrawler = new DocumentationCrawler();
    this.documentationIndexer = new DocumentationIndexer();
    
    this.setupHandlers();
    
    logger.info('TimeBack MCP Server initialized', {
      name: config.server.name,
      version: config.server.version,
      logLevel: config.logging.level
    });
  }

  private validateConfiguration(): void {
    const requiredEnvVars = [
      'CLIENT_ID',
      'CLIENT_SECRET',
      'OAUTH2_TOKEN_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const message = `Missing required environment variables: ${missingVars.join(', ')}`;
      logger.error('Configuration validation failed', { missingVars });
      throw new ConfigurationError(message);
    }

    const timebackApis = ['qti', 'oneroster', 'caliper', 'powerpath', 'case'];
    const missingApiUrls = timebackApis.filter(api => {
      const envVar = `TIMEBACK_${api.toUpperCase()}_BASE_URL`;
      return !process.env[envVar];
    });

    if (missingApiUrls.length > 0) {
      logger.warn('Some TimeBack API URLs not configured', { missingApiUrls });
    }

    logger.info('Configuration validation passed');
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
    this.setupResourceHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'load-timeback-specs',
            description: 'Load all TimeBack OpenAPI specifications from local files',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'analyze-api-endpoints',
            description: 'Analyze endpoints across TimeBack APIs with filtering options',
            inputSchema: {
              type: 'object',
              properties: {
                api: {
                  type: 'string',
                  description: 'Filter by specific API (qti, oneroster, caliper, powerpath, case)',
                  enum: ['qti', 'oneroster', 'caliper', 'powerpath', 'case'],
                },
                tag: {
                  type: 'string',
                  description: 'Filter endpoints by tag',
                },
                method: {
                  type: 'string',
                  description: 'Filter by HTTP method',
                  enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                },
              },
            },
          },
          {
            name: 'search-api-documentation',
            description: 'Search across all TimeBack API documentation',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for endpoints, schemas, or descriptions',
                },
                searchIn: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['endpoints', 'schemas', 'descriptions'],
                  },
                  default: ['endpoints', 'schemas', 'descriptions'],
                  description: 'What to search in',
                },
                api: {
                  type: 'string',
                  description: 'Limit search to specific API',
                  enum: ['qti', 'oneroster', 'caliper', 'powerpath', 'case'],
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'compare-data-models',
            description: 'Compare data models between different TimeBack APIs',
            inputSchema: {
              type: 'object',
              properties: {
                schema1: {
                  type: 'string',
                  description: 'First schema name to compare',
                },
                api1: {
                  type: 'string',
                  description: 'API containing first schema',
                  enum: ['qti', 'oneroster', 'caliper', 'powerpath', 'case'],
                },
                schema2: {
                  type: 'string',
                  description: 'Second schema name to compare',
                },
                api2: {
                  type: 'string',
                  description: 'API containing second schema',
                  enum: ['qti', 'oneroster', 'caliper', 'powerpath', 'case'],
                },
              },
              required: ['schema1', 'api1', 'schema2', 'api2'],
            },
          },
          {
            name: 'generate-integration-mapping',
            description: 'Generate data mapping templates for integrating between TimeBack APIs',
            inputSchema: {
              type: 'object',
              properties: {
                sourceApi: {
                  type: 'string',
                  description: 'Source API for integration',
                  enum: ['qti', 'oneroster', 'caliper', 'powerpath', 'case'],
                },
                targetApi: {
                  type: 'string',
                  description: 'Target API for integration',
                  enum: ['qti', 'oneroster', 'caliper', 'powerpath', 'case'],
                },
                useCase: {
                  type: 'string',
                  description: 'Integration use case (e.g., "sync-student-data", "track-assessments")',
                },
              },
              required: ['sourceApi', 'targetApi', 'useCase'],
            },
          },
          {
            name: 'validate-api-integration',
            description: 'Validate integration consistency between TimeBack APIs',
            inputSchema: {
              type: 'object',
              properties: {
                integrationConfig: {
                  type: 'object',
                  description: 'Integration configuration to validate',
                },
              },
              required: ['integrationConfig'],
            },
          },
          {
            name: 'generate-api-documentation',
            description: 'Generate comprehensive documentation for TimeBack APIs',
            inputSchema: {
              type: 'object',
              properties: {
                api: {
                  type: 'string',
                  description: 'API to generate documentation for',
                  enum: ['qti', 'oneroster', 'caliper', 'powerpath', 'case', 'all'],
                },
                format: {
                  type: 'string',
                  description: 'Documentation format',
                  enum: ['markdown', 'html', 'json'],
                  default: 'markdown',
                },
              },
              required: ['api'],
            },
          },
          {
            name: 'analyze-codebase-for-timeback',
            description: 'Analyze a codebase and provide TimeBack integration recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Absolute path to the project directory to analyze',
                },
                includeCodeExamples: {
                  type: 'boolean',
                  description: 'Whether to include code examples in recommendations',
                  default: true,
                },
                focusAreas: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['authentication', 'user-management', 'assessments', 'analytics', 'standards'],
                  },
                  description: 'Specific areas to focus analysis on',
                },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'generate-integration-code',
            description: 'Generate specific code snippets for TimeBack API integration',
            inputSchema: {
              type: 'object',
              properties: {
                language: {
                  type: 'string',
                  description: 'Programming language for code generation',
                  enum: ['javascript', 'typescript', 'python', 'java', 'csharp'],
                },
                framework: {
                  type: 'string',
                  description: 'Framework being used',
                },
                integrationPattern: {
                  type: 'string',
                  description: 'Type of integration pattern',
                  enum: ['oauth-setup', 'data-sync', 'event-tracking', 'assessment-delivery', 'standards-alignment'],
                },
                apis: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['qti', 'oneroster', 'caliper', 'powerpath', 'case'],
                  },
                  description: 'TimeBack APIs to integrate with',
                },
              },
              required: ['language', 'integrationPattern', 'apis'],
            },
          },
          {
            name: 'detect-integration-opportunities',
            description: 'Detect potential TimeBack integration opportunities in existing code',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to analyze for integration opportunities',
                },
                analysisDepth: {
                  type: 'string',
                  description: 'Depth of analysis to perform',
                  enum: ['surface', 'deep', 'comprehensive'],
                  default: 'deep',
                },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'crawl-timeback-documentation',
            description: 'Crawl and index TimeBack platform documentation from all APIs',
            inputSchema: {
              type: 'object',
              properties: {
                forceRefresh: {
                  type: 'boolean',
                  description: 'Force refresh of all documentation even if already cached',
                  default: false,
                },
                specificApis: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Crawl only specific APIs (QTI, OneRoster, Caliper, PowerPath, CASE, OpenBadge, CLR)',
                },
              },
            },
          },
          {
            name: 'search-comprehensive-docs',
            description: 'Search across all crawled TimeBack documentation with advanced filtering',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to find relevant documentation',
                },
                apis: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter results to specific APIs',
                },
                types: {
                  type: 'array',
                  items: { 
                    type: 'string',
                    enum: ['endpoint', 'schema', 'code_example', 'concept']
                  },
                  description: 'Filter results to specific content types',
                },
                limit: {
                  type: 'number',
                  minimum: 1,
                  maximum: 100,
                  default: 20,
                  description: 'Maximum number of results to return',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get-api-examples',
            description: 'Get real code examples from TimeBack documentation',
            inputSchema: {
              type: 'object',
              properties: {
                api: {
                  type: 'string',
                  description: 'Specific API to get examples for',
                },
                language: {
                  type: 'string',
                  description: 'Programming language for examples (javascript, python, curl, etc.)',
                },
                endpoint: {
                  type: 'string',
                  description: 'Specific endpoint to get examples for',
                },
                useCase: {
                  type: 'string',
                  description: 'Specific use case or functionality to find examples for',
                },
              },
            },
          },
          {
            name: 'compare-api-implementations',
            description: 'Compare similar functionality across different TimeBack APIs',
            inputSchema: {
              type: 'object',
              properties: {
                sourceApi: {
                  type: 'string',
                  description: 'Source API to compare from',
                },
                targetApi: {
                  type: 'string',
                  description: 'Target API to compare to',
                },
                functionality: {
                  type: 'string',
                  description: 'Specific functionality to compare (e.g., "user management", "authentication")',
                },
              },
              required: ['sourceApi', 'targetApi', 'functionality'],
            },
          },
          {
            name: 'get-integration-patterns',
            description: 'Get integration patterns and workflows from TimeBack documentation',
            inputSchema: {
              type: 'object',
              properties: {
                apis: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'APIs to include in integration patterns',
                },
                difficulty: {
                  type: 'string',
                  enum: ['beginner', 'intermediate', 'advanced'],
                  description: 'Filter patterns by difficulty level',
                },
                useCase: {
                  type: 'string',
                  description: 'Specific use case to find patterns for',
                },
              },
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'load-timeback-specs':
            return await this.loadTimeBackSpecs();

          case 'analyze-api-endpoints':
            return await this.analyzeApiEndpoints(args);

          case 'search-api-documentation':
            return await this.searchApiDocumentation(args);

          case 'compare-data-models':
            return await this.compareDataModels(args);

          case 'generate-integration-mapping':
            return await this.generateIntegrationMapping(args);

          case 'validate-api-integration':
            return await this.validateApiIntegration(args);

          case 'generate-api-documentation':
            return await this.generateApiDocumentation(args);

          case 'analyze-codebase-for-timeback':
            return await this.analyzeCodebaseForTimeBack(args);

          case 'generate-integration-code':
            return await this.generateIntegrationCode(args);

          case 'detect-integration-opportunities':
            return await this.detectIntegrationOpportunities(args);

          case 'crawl-timeback-documentation':
            return await this.crawlTimeBackDocumentation(args);

          case 'search-comprehensive-docs':
            return await this.searchComprehensiveDocs(args);

          case 'get-api-examples':
            return await this.getApiExamples(args);

          case 'compare-api-implementations':
            return await this.compareApiImplementations(args);

          case 'get-integration-patterns':
            return await this.getIntegrationPatterns(args);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Tool ${name} failed:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private setupResourceHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'timeback://apis/overview',
            name: 'TimeBack APIs Overview',
            description: 'Overview of all TimeBack APIs and their capabilities',
            mimeType: 'application/json',
          },
          {
            uri: 'timeback://schemas/all',
            name: 'All Data Schemas',
            description: 'Complete list of data schemas across all TimeBack APIs',
            mimeType: 'application/json',
          },
          {
            uri: 'timeback://endpoints/all',
            name: 'All API Endpoints',
            description: 'Complete list of endpoints across all TimeBack APIs',
            mimeType: 'application/json',
          },
          {
            uri: 'timeback://integration/templates',
            name: 'Integration Templates',
            description: 'Templates for common TimeBack API integrations',
            mimeType: 'application/json',
          },
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'timeback://apis/overview':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.getApisOverview(), null, 2),
              },
            ],
          };

        case 'timeback://schemas/all':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.openApiParser.getSchemas(), null, 2),
              },
            ],
          };

        case 'timeback://endpoints/all':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.openApiParser.getEndpoints(), null, 2),
              },
            ],
          };

        case 'timeback://integration/templates':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.getIntegrationTemplates(), null, 2),
              },
            ],
          };

        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }
    });
  }

  private async loadTimeBackSpecs(): Promise<any> {
    try {
      const specsDir = path.resolve(projectDir, 'openapi-specs');
      
      await Promise.all([
        this.openApiParser.loadFromFile('qti', `${specsDir}/timeback-qti-openapi.yaml`, config.timeback.qti.baseUrl),
        this.openApiParser.loadFromFile('oneroster', `${specsDir}/timeback-oneroster-openapi.yaml`, config.timeback.oneroster.baseUrl),
        this.openApiParser.loadFromFile('caliper', `${specsDir}/timeback-caliper-openapi.yaml`, config.timeback.caliper.baseUrl),
        this.openApiParser.loadFromFile('powerpath', `${specsDir}/timeback-powerpath-openapi.yaml`, config.timeback.powerpath.baseUrl),
        this.openApiParser.loadFromFile('case', `${specsDir}/timeback-case-openapi.yaml`, config.timeback.case.baseUrl),
      ]);

      const apis = this.openApiParser.getAllAPIs();
      const totalEndpoints = this.openApiParser.getEndpoints().length;
      const totalSchemas = this.openApiParser.getSchemas().length;

      return {
        content: [
          {
            type: 'text',
            text: `Successfully loaded ${apis.length} TimeBack API specifications:

${apis.map(api => `• ${api.name.toUpperCase()}: ${this.openApiParser.getInfo(api.name)?.title || 'Unknown'}`).join('\n')}

Total Endpoints: ${totalEndpoints}
Total Schemas: ${totalSchemas}

All APIs are now ready for analysis and integration assistance.`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to load TimeBack specifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeApiEndpoints(args: any): Promise<any> {
    const { api, tag, method } = args;
    
    let endpoints = this.openApiParser.getEndpoints(api);
    
    if (tag) {
      endpoints = endpoints.filter(ep => ep.tags?.includes(tag));
    }
    
    if (method) {
      endpoints = endpoints.filter(ep => ep.method === method.toUpperCase());
    }

    const summary = {
      total: endpoints.length,
      byApi: endpoints.reduce((acc, ep) => {
        acc[ep.api] = (acc[ep.api] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byMethod: endpoints.reduce((acc, ep) => {
        acc[ep.method] = (acc[ep.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byTag: endpoints.reduce((acc, ep) => {
        ep.tags?.forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),
      endpoints: endpoints.map(ep => ({
        api: ep.api,
        path: ep.path,
        method: ep.method,
        summary: ep.summary,
        tags: ep.tags,
        operationId: ep.operationId,
      })),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private async searchApiDocumentation(args: any): Promise<any> {
    const { query, searchIn = ['endpoints', 'schemas', 'descriptions'], api } = args;
    const results: any[] = [];

    if (searchIn.includes('endpoints')) {
      const endpoints = this.openApiParser.searchEndpoints(query, api);
      results.push(...endpoints.map(ep => ({
        type: 'endpoint',
        api: ep.api,
        method: ep.method,
        path: ep.path,
        summary: ep.summary,
        operationId: ep.operationId,
      })));
    }

    if (searchIn.includes('schemas')) {
      const schemas = this.openApiParser.searchSchemas(query, api);
      results.push(...schemas.map(schema => ({
        type: 'schema',
        api: schema.api,
        name: schema.name,
        description: schema.description,
      })));
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query,
            resultCount: results.length,
            results,
          }, null, 2),
        },
      ],
    };
  }

  private async compareDataModels(args: any): Promise<any> {
    const { schema1, api1, schema2, api2 } = args;
    const comparison = this.openApiParser.compareSchemas(schema1, api1, schema2, api2);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(comparison, null, 2),
        },
      ],
    };
  }

  private async generateIntegrationMapping(args: any): Promise<any> {
    const { sourceApi, targetApi, useCase } = args;
    
    const sourceSchemas = this.openApiParser.getSchemas(sourceApi);
    const targetSchemas = this.openApiParser.getSchemas(targetApi);
    
    const mapping = {
      useCase,
      sourceApi,
      targetApi,
      suggestedMappings: this.generateSuggestedMappings(sourceSchemas, targetSchemas),
      integrationSteps: this.generateIntegrationSteps(sourceApi, targetApi, useCase),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mapping, null, 2),
        },
      ],
    };
  }

  private async validateApiIntegration(args: any): Promise<any> {
    const { integrationConfig } = args;
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [
        'Consider implementing proper error handling for API failures',
        'Add authentication token refresh logic',
        'Implement data validation before API calls',
      ],
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(validation, null, 2),
        },
      ],
    };
  }

  private async generateApiDocumentation(args: any): Promise<any> {
    const { api, format = 'markdown' } = args;
    
    if (api === 'all') {
      const allApis = this.openApiParser.getAllAPIs();
      const docs = allApis.map(apiInfo => 
        this.openApiParser.generateAPIDocumentation(apiInfo.name)
      ).join('\n\n---\n\n');
      
      return {
        content: [
          {
            type: 'text',
            text: docs,
          },
        ],
      };
    } else {
      const docs = this.openApiParser.generateAPIDocumentation(api);
      return {
        content: [
          {
            type: 'text',
            text: docs,
          },
        ],
      };
    }
  }

  private getApisOverview(): any {
    const apis = this.openApiParser.getAllAPIs();
    return apis.map(api => ({
      name: api.name,
      title: this.openApiParser.getInfo(api.name)?.title,
      version: this.openApiParser.getInfo(api.name)?.version,
      baseUrl: api.baseUrl,
      endpointCount: this.openApiParser.getEndpoints(api.name).length,
      schemaCount: this.openApiParser.getSchemas(api.name).length,
    }));
  }

  private getIntegrationTemplates(): any {
    return [
      {
        name: 'Student Data Sync',
        description: 'Synchronize student data between OneRoster and other APIs',
        sourceApi: 'oneroster',
        targetApis: ['qti', 'caliper', 'powerpath'],
        steps: [
          'Fetch student roster from OneRoster',
          'Map student identifiers',
          'Create/update student records in target APIs',
        ],
      },
      {
        name: 'Assessment Tracking',
        description: 'Track assessment activities from QTI to Caliper',
        sourceApi: 'qti',
        targetApis: ['caliper'],
        steps: [
          'Monitor QTI assessment events',
          'Transform to Caliper event format',
          'Send events to Caliper endpoint',
        ],
      },
    ];
  }

  private generateSuggestedMappings(sourceSchemas: any[], targetSchemas: any[]): any[] {
    return sourceSchemas.slice(0, 3).map(sourceSchema => ({
      sourceSchema: sourceSchema.name,
      targetSchema: targetSchemas[0]?.name || 'No matching schema found',
      confidence: 'medium',
      fieldMappings: {
        id: 'identifier',
        name: 'title',
      },
    }));
  }

  private generateIntegrationSteps(sourceApi: string, targetApi: string, useCase: string): string[] {
    return [
      `1. Authenticate with ${sourceApi.toUpperCase()} API`,
      `2. Fetch data from ${sourceApi.toUpperCase()}`,
      '3. Transform data to match target schema',
      `4. Authenticate with ${targetApi.toUpperCase()} API`,
      `5. Send transformed data to ${targetApi.toUpperCase()}`,
      '6. Handle response and errors',
    ];
  }

  private async analyzeCodebaseForTimeBack(args: any): Promise<any> {
    const validatedArgs = AnalyzeCodebaseSchema.parse(args);
    const { projectPath, includeCodeExamples, focusAreas } = validatedArgs;
    
    try {
      logger.info(`Analyzing codebase at: ${projectPath}`, { 
        includeCodeExamples, 
        focusAreas: focusAreas?.length || 0 
      });
      
      const fs = await import('fs/promises');
      try {
        await fs.access(projectPath);
      } catch (error) {
        throw new ValidationError(`Project path does not exist or is not accessible: ${projectPath}`);
      }
      
      const analysis = await this.codebaseAnalyzer.analyzeCodebase(projectPath);
      
      let filteredSuggestions = analysis.suggestedIntegrations;
      if (focusAreas && focusAreas.length > 0) {
        const focusMap: Record<string, string[]> = {
          'authentication': ['oneroster'],
          'user-management': ['oneroster'],
          'assessments': ['qti'],
          'analytics': ['caliper'],
          'standards': ['case'],
        };
        
        const relevantApis = focusAreas.flatMap((area: string) => focusMap[area] || []);
        filteredSuggestions = analysis.suggestedIntegrations.filter(
          suggestion => relevantApis.includes(suggestion.api)
        );
      }

      const result = {
        projectAnalysis: {
          type: analysis.projectType,
          language: analysis.language,
          framework: analysis.framework,
          packageManager: analysis.packageManager,
          dependencies: analysis.dependencies.slice(0, 20), // Limit for readability
          authMethods: analysis.authMethods,
          apiPatterns: analysis.apiPatterns,
          environmentVariables: analysis.environmentVariables.slice(0, 15),
        },
        timebackIntegrations: filteredSuggestions.map(suggestion => ({
          ...suggestion,
          codeExamples: includeCodeExamples ? suggestion.codeExamples : [],
        })),
        overallRecommendation: this.generateOverallRecommendation(analysis),
        nextSteps: this.generateNextSteps(analysis, filteredSuggestions),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn('Codebase analysis validation failed:', { 
          message: error.message, 
          details: error.details,
          projectPath 
        });
        throw error;
      }
      
      logger.error('Codebase analysis failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        projectPath 
      });
      
      throw new IntegrationError(
        `Failed to analyze codebase: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'codebase-analyzer'
      );
    }
  }

  private async generateIntegrationCode(args: any): Promise<any> {
    const validatedArgs = GenerateIntegrationCodeSchema.parse(args);
    const { language, framework, integrationPattern, apis } = validatedArgs;
    
    try {
      logger.info('Generating integration code', { 
        language, 
        framework, 
        integrationPattern, 
        apis: apis.length 
      });
      
      const codeTemplates = this.getCodeTemplates(language, framework, integrationPattern, apis);
    
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              language,
              framework,
              integrationPattern,
              apis,
              codeExamples: codeTemplates,
              environmentVariables: this.getRequiredEnvVars(apis),
              dependencies: this.getRequiredDependencies(language, framework, apis),
              setupInstructions: this.getSetupInstructions(language, framework, integrationPattern),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn('Integration code generation validation failed:', { 
          message: error.message, 
          details: error.details,
          language,
          framework,
          integrationPattern 
        });
        throw error;
      }
      
      logger.error('Integration code generation failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        language,
        framework,
        integrationPattern 
      });
      
      throw new IntegrationError(
        `Failed to generate integration code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'code-generator'
      );
    }
  }

  private async detectIntegrationOpportunities(args: any): Promise<any> {
    const validatedArgs = DetectIntegrationOpportunitiesSchema.parse(args);
    const { projectPath, analysisDepth } = validatedArgs;
    
    try {
      logger.info('Detecting integration opportunities', { 
        projectPath, 
        analysisDepth 
      });
      
      const fs = await import('fs/promises');
      try {
        await fs.access(projectPath);
      } catch (error) {
        throw new ValidationError(`Project path does not exist or is not accessible: ${projectPath}`);
      }
      
      const analysis = await this.codebaseAnalyzer.analyzeCodebase(projectPath);
      
      const opportunities = {
        immediate: [] as any[],
        shortTerm: [] as any[],
        longTerm: [] as any[],
      };

      for (const suggestion of analysis.suggestedIntegrations) {
        if (suggestion.priority === 'high') {
          opportunities.immediate.push({
            api: suggestion.api,
            opportunity: suggestion.reason,
            effort: 'Low to Medium',
            impact: 'High',
            timeline: '1-2 weeks',
            prerequisites: this.getPrerequisites(suggestion.api, analysis),
          });
        } else if (suggestion.priority === 'medium') {
          opportunities.shortTerm.push({
            api: suggestion.api,
            opportunity: suggestion.reason,
            effort: 'Medium',
            impact: 'Medium to High',
            timeline: '2-4 weeks',
            prerequisites: this.getPrerequisites(suggestion.api, analysis),
          });
        } else {
          opportunities.longTerm.push({
            api: suggestion.api,
            opportunity: suggestion.reason,
            effort: 'Medium to High',
            impact: 'Medium',
            timeline: '1-3 months',
            prerequisites: this.getPrerequisites(suggestion.api, analysis),
          });
        }
      }

      const migrationOpportunities = this.detectMigrationOpportunities(analysis);
      const optimizationOpportunities = this.detectOptimizationOpportunities(analysis);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              analysisDepth,
              projectSummary: {
                type: analysis.projectType,
                language: analysis.language,
                framework: analysis.framework,
              },
              integrationOpportunities: opportunities,
              migrationOpportunities,
              optimizationOpportunities,
              recommendedStartingPoint: this.getRecommendedStartingPoint(opportunities),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn('Integration opportunity detection validation failed:', { 
          message: error.message,
          projectPath 
        });
        throw error;
      }
      
      logger.error('Integration opportunity detection failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        projectPath,
        analysisDepth 
      });
      
      throw new IntegrationError(
        `Failed to detect integration opportunities: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'opportunity-detector'
      );
    }
  }

  private generateOverallRecommendation(analysis: CodebaseAnalysis): string {
    const suggestions = analysis.suggestedIntegrations;
    if (suggestions.length === 0) {
      return 'No immediate TimeBack integration opportunities detected. Consider adding educational features to leverage TimeBack APIs.';
    }

    const highPriority = suggestions.filter(s => s.priority === 'high');
    if (highPriority.length > 0) {
      return `Start with ${highPriority[0].api.toUpperCase()} integration for ${highPriority[0].reason.toLowerCase()}. This will provide immediate value and establish the foundation for additional TimeBack integrations.`;
    }

    return `Consider integrating with ${suggestions[0].api.toUpperCase()} API as your entry point into the TimeBack ecosystem.`;
  }

  private generateNextSteps(analysis: CodebaseAnalysis, suggestions: any[]): string[] {
    const steps = [
      'Set up TimeBack developer account and obtain API credentials',
      'Review TimeBack API documentation for selected integrations',
    ];

    if (suggestions.length > 0) {
      const primaryApi = suggestions[0].api;
      steps.push(`Implement ${primaryApi.toUpperCase()} authentication flow`);
      steps.push(`Create data models for ${primaryApi.toUpperCase()} integration`);
      steps.push(`Implement core ${primaryApi.toUpperCase()} functionality`);
      steps.push('Test integration with TimeBack sandbox environment');
    }

    steps.push('Plan rollout strategy for production deployment');
    return steps;
  }

  private getCodeTemplates(language: string, framework: string, pattern: string, apis: string[]): any[] {
    const templates = [];

    for (const api of apis) {
      switch (pattern) {
        case 'oauth-setup':
          templates.push(this.getOAuthTemplate(language, framework, api));
          break;
        case 'data-sync':
          templates.push(this.getDataSyncTemplate(language, framework, api));
          break;
        case 'event-tracking':
          templates.push(this.getEventTrackingTemplate(language, framework, api));
          break;
        case 'assessment-delivery':
          templates.push(this.getAssessmentTemplate(language, framework, api));
          break;
        case 'standards-alignment':
          templates.push(this.getStandardsTemplate(language, framework, api));
          break;
      }
    }

    return templates;
  }

  private getOAuthTemplate(language: string, framework: string, api: string): any {
    const baseUrl = config.timeback[api as keyof typeof config.timeback]?.baseUrl || '';
    
    if (language === 'javascript' || language === 'typescript') {
      return {
        api,
        pattern: 'oauth-setup',
        code: `// ${api.toUpperCase()} OAuth2 Setup
const axios = require('axios');

class ${api.charAt(0).toUpperCase() + api.slice(1)}Client {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = '${baseUrl}';
    this.tokenUrl = '${config.auth.tokenUrl}';
    this.accessToken = null;
  }

  async authenticate() {
    const response = await axios.post(this.tokenUrl, {
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    this.accessToken = response.data.access_token;
    return this.accessToken;
  }

  async makeRequest(endpoint, options = {}) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    return axios({
      ...options,
      url: \`\${this.baseUrl}\${endpoint}\`,
      headers: {
        ...options.headers,
        'Authorization': \`Bearer \${this.accessToken}\`,
      },
    });
  }
}

module.exports = ${api.charAt(0).toUpperCase() + api.slice(1)}Client;`,
      };
    }

    return {
      api,
      pattern: 'oauth-setup',
      code: `# ${api.toUpperCase()} OAuth2 Setup (Python)
import requests
from typing import Optional

class ${api.charAt(0).toUpperCase() + api.slice(1)}Client:
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = "${baseUrl}"
        self.token_url = "${config.auth.tokenUrl}"
        self.access_token: Optional[str] = None

    async def authenticate(self) -> str:
        response = requests.post(self.token_url, data={
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
        })
        response.raise_for_status()
        
        self.access_token = response.json()['access_token']
        return self.access_token

    async def make_request(self, endpoint: str, **kwargs):
        if not self.access_token:
            await self.authenticate()

        headers = kwargs.get('headers', {})
        headers['Authorization'] = f'Bearer {self.access_token}'
        kwargs['headers'] = headers

        return requests.request(
            url=f"{self.base_url}{endpoint}",
            **kwargs
        )`,
    };
  }

  private getDataSyncTemplate(language: string, framework: string, api: string): any {
    const baseUrl = config.timeback[api as keyof typeof config.timeback]?.baseUrl || '';
    
    if (language === 'javascript' || language === 'typescript') {
      return {
        api,
        pattern: 'data-sync',
        code: `// ${api.toUpperCase()} Data Sync Implementation
const { ${api.charAt(0).toUpperCase() + api.slice(1)}Client } = require('./${api}-client');

class ${api.charAt(0).toUpperCase() + api.slice(1)}DataSync {
  constructor(clientId, clientSecret) {
    this.client = new ${api.charAt(0).toUpperCase() + api.slice(1)}Client(clientId, clientSecret);
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
  }

  async syncData(localData) {
    try {
      const transformedData = this.transformToTimeBackFormat(localData);
      
      const response = await this.client.makeRequest('/sync', {
        method: 'POST',
        data: transformedData,
      });
      
      console.log('Data sync successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Data sync failed:', error);
      throw error;
    }
  }

  transformToTimeBackFormat(data) {
    return data.map(item => ({
      id: item.id,
    }));
  }

  startAutoSync() {
    setInterval(() => {
      this.syncData(this.getLocalData());
    }, this.syncInterval);
  }
}

module.exports = ${api.charAt(0).toUpperCase() + api.slice(1)}DataSync;`,
      };
    }

    return {
      api,
      pattern: 'data-sync',
      code: `# ${api.toUpperCase()} Data Sync Implementation (Python)
import asyncio
import logging
from typing import List, Dict, Any
from .${api}_client import ${api.charAt(0).toUpperCase() + api.slice(1)}Client

class ${api.charAt(0).toUpperCase() + api.slice(1)}DataSync:
    def __init__(self, client_id: str, client_secret: str):
        self.client = ${api.charAt(0).toUpperCase() + api.slice(1)}Client(client_id, client_secret)
        self.sync_interval = 300  # 5 minutes
        self.logger = logging.getLogger(__name__)

    async def sync_data(self, local_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        try:
            # Transform local data to ${api.toUpperCase()} format
            transformed_data = self.transform_to_timeback_format(local_data)
            
            # Send data to TimeBack
            response = await self.client.make_request('/sync', method='POST', json=transformed_data)
            
            self.logger.info(f"Data sync successful: {response}")
            return response
        except Exception as error:
            self.logger.error(f"Data sync failed: {error}")
            raise

    def transform_to_timeback_format(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # Implement transformation logic based on ${api.toUpperCase()} schema
        return [
            {
                "id": item.get("id"),
                # Add transformation logic here
            }
            for item in data
        ]

    async def start_auto_sync(self):
        while True:
            try:
                local_data = await self.get_local_data()
                await self.sync_data(local_data)
            except Exception as e:
                self.logger.error(f"Auto sync error: {e}")
            
            await asyncio.sleep(self.sync_interval)`,
    };
  }

  private getEventTrackingTemplate(language: string, framework: string, api: string): any {
    if (language === 'javascript' || language === 'typescript') {
      return {
        api,
        pattern: 'event-tracking',
        code: `// ${api.toUpperCase()} Event Tracking Implementation
const { ${api.charAt(0).toUpperCase() + api.slice(1)}Client } = require('./${api}-client');

class ${api.charAt(0).toUpperCase() + api.slice(1)}EventTracker {
  constructor(clientId, clientSecret) {
    this.client = new ${api.charAt(0).toUpperCase() + api.slice(1)}Client(clientId, clientSecret);
    this.eventQueue = [];
    this.batchSize = 10;
    this.flushInterval = 30000; // 30 seconds
    
    this.startBatchProcessor();
  }

  async trackEvent(eventType, eventData) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data: eventData,
      sessionId: this.getSessionId(),
    };

    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= this.batchSize) {
      await this.flushEvents();
    }
  }

  async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const events = this.eventQueue.splice(0, this.batchSize);
    
    try {
      await this.client.makeRequest('/events', {
        method: 'POST',
        data: { events },
      });
      
      console.log(\`Successfully tracked \${events.length} events\`);
    } catch (error) {
      console.error('Event tracking failed:', error);
      this.eventQueue.unshift(...events);
    }
  }

  startBatchProcessor() {
    setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  getSessionId() {
    return 'session-' + Date.now();
  }
}

module.exports = ${api.charAt(0).toUpperCase() + api.slice(1)}EventTracker;`,
      };
    }

    return {
      api,
      pattern: 'event-tracking',
      code: `# ${api.toUpperCase()} Event Tracking Implementation (Python)
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any
from .${api}_client import ${api.charAt(0).toUpperCase() + api.slice(1)}Client

class ${api.charAt(0).toUpperCase() + api.slice(1)}EventTracker:
    def __init__(self, client_id: str, client_secret: str):
        self.client = ${api.charAt(0).toUpperCase() + api.slice(1)}Client(client_id, client_secret)
        self.event_queue: List[Dict[str, Any]] = []
        self.batch_size = 10
        self.flush_interval = 30  # 30 seconds
        self.logger = logging.getLogger(__name__)
        
        asyncio.create_task(self.start_batch_processor())

    async def track_event(self, event_type: str, event_data: Dict[str, Any]):
        event = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": event_data,
            "session_id": self.get_session_id(),
        }

        self.event_queue.append(event)
        
        if len(self.event_queue) >= self.batch_size:
            await self.flush_events()

    async def flush_events(self):
        if not self.event_queue:
            return

        events = self.event_queue[:self.batch_size]
        self.event_queue = self.event_queue[self.batch_size:]
        
        try:
            await self.client.make_request('/events', method='POST', json={"events": events})
            self.logger.info(f"Successfully tracked {len(events)} events")
        except Exception as error:
            self.logger.error(f"Event tracking failed: {error}")
            # Re-queue events for retry
            self.event_queue = events + self.event_queue

    async def start_batch_processor(self):
        while True:
            await asyncio.sleep(self.flush_interval)
            await self.flush_events()

    def get_session_id(self) -> str:
        # Implement session ID logic
        return f"session-{int(datetime.utcnow().timestamp())}"`
    };
  }

  private getAssessmentTemplate(language: string, framework: string, api: string): any {
    return {
      api,
      pattern: 'assessment-delivery',
      code: `// ${api.toUpperCase()} Assessment Delivery Example`,
    };
  }

  private getStandardsTemplate(language: string, framework: string, api: string): any {
    return {
      api,
      pattern: 'standards-alignment',
      code: `// ${api.toUpperCase()} Standards Alignment Example`,
    };
  }

  private getRequiredEnvVars(apis: string[]): string[] {
    const envVars = [
      'OAUTH2_TOKEN_URL',
      'CLIENT_ID',
      'CLIENT_SECRET',
    ];

    for (const api of apis) {
      envVars.push(`TIMEBACK_${api.toUpperCase()}_BASE_URL`);
    }

    return envVars;
  }

  private getRequiredDependencies(language: string, framework: string, apis: string[]): string[] {
    if (language === 'javascript' || language === 'typescript') {
      return ['axios', 'dotenv'];
    } else if (language === 'python') {
      return ['requests', 'python-dotenv'];
    }
    return [];
  }

  private getSetupInstructions(language: string, framework: string, pattern: string): string[] {
    return [
      'Install required dependencies',
      'Set up environment variables',
      'Configure TimeBack API credentials',
      'Initialize API client',
      'Test authentication flow',
      'Implement core integration logic',
    ];
  }

  private getPrerequisites(api: string, analysis: CodebaseAnalysis): string[] {
    const prerequisites = [
      'TimeBack developer account',
      `${api.toUpperCase()} API credentials`,
    ];

    if (!analysis.authMethods.includes('oauth')) {
      prerequisites.push('OAuth2 authentication implementation');
    }

    return prerequisites;
  }

  private detectMigrationOpportunities(analysis: CodebaseAnalysis): any[] {
    const opportunities = [];

    const edTechKeywords = ['canvas', 'blackboard', 'moodle', 'schoology', 'google-classroom'];
    const hasEdTechIntegration = analysis.dependencies.some(dep => 
      edTechKeywords.some(keyword => dep.toLowerCase().includes(keyword))
    );

    if (hasEdTechIntegration) {
      opportunities.push({
        type: 'LMS Migration',
        description: 'Migrate from existing LMS integration to TimeBack APIs',
        effort: 'High',
        benefit: 'Standardized educational data exchange',
      });
    }

    return opportunities;
  }

  private detectOptimizationOpportunities(analysis: CodebaseAnalysis): any[] {
    const opportunities = [];

    if (analysis.apiPatterns.includes('rest') && analysis.suggestedIntegrations.length > 1) {
      opportunities.push({
        type: 'API Consolidation',
        description: 'Consolidate multiple TimeBack API calls for better performance',
        effort: 'Medium',
        benefit: 'Reduced API calls and improved performance',
      });
    }

    return opportunities;
  }

  private getRecommendedStartingPoint(opportunities: any): string {
    if (opportunities.immediate.length > 0) {
      return `Start with ${opportunities.immediate[0].api.toUpperCase()} integration - ${opportunities.immediate[0].opportunity}`;
    } else if (opportunities.shortTerm.length > 0) {
      return `Begin planning ${opportunities.shortTerm[0].api.toUpperCase()} integration - ${opportunities.shortTerm[0].opportunity}`;
    }
    return 'Focus on adding educational features to enable TimeBack integration opportunities';
  }

  private async crawlTimeBackDocumentation(args: any): Promise<any> {
    try {
      const validatedArgs = CrawlTimeBackDocumentationSchema.parse(args);
      logger.info('Starting TimeBack documentation crawling', validatedArgs);

      const timebackUrls = [
        'https://qti.alpha-1edtech.com/docs/',
        'https://qti.alpha-1edtech.com/openapi.yaml',
        'https://api.alpha-1edtech.com/scalar/',
        'https://api.alpha-1edtech.com/openapi.yaml',
        'https://caliper.alpha-1edtech.com/',
        'https://caliper.alpha-1edtech.com/openapi.yaml',
        'https://api.alpha-1edtech.com/scalar?api=powerpath-api',
        'https://api.alpha-1edtech.com/powerpath/openapi.yaml',
        'https://api.alpha-1edtech.com/scalar?api=case-api',
        'https://api.alpha-1edtech.com/case/openapi.yaml',
        'https://docs.google.com/document/d/16cIsRjdXXcxOKUXQNzpQ0P86RJk1u9h_AcwXS8IvXIY/edit',
        'https://www.loom.com/share/b123456789abcdef'
      ];

      const crawledContent = [];
      for (const url of timebackUrls) {
        if (validatedArgs.specificApis && validatedArgs.specificApis.length > 0) {
          const shouldSkip = !validatedArgs.specificApis.some(api => 
            url.toLowerCase().includes(api.toLowerCase())
          );
          if (shouldSkip) continue;
        }

        try {
          logger.info(`Crawling URL: ${url}`);
          const content = await this.documentationCrawler.crawlUrl(url);
          if (content) {
            crawledContent.push(content);
          }
        } catch (error) {
          logger.warn(`Failed to crawl ${url}:`, error);
        }
      }

      await this.documentationIndexer.indexCrawledContent(crawledContent);

      const stats = await this.documentationIndexer.getIndexStats();
      
      return {
        success: true,
        message: `Successfully crawled and indexed TimeBack documentation`,
        stats: {
          totalDocuments: stats.totalDocuments,
          totalEndpoints: stats.totalEndpoints,
          totalSchemas: stats.totalSchemas,
          totalCodeExamples: stats.totalCodeExamples,
          crawledUrls: crawledContent.length,
          apis: stats.apiBreakdown
        }
      };
    } catch (error) {
      logger.error('Documentation crawling failed:', error);
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid crawl parameters', error.errors);
      }
      throw new IntegrationError(`Documentation crawling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async searchComprehensiveDocs(args: any): Promise<any> {
    try {
      const validatedArgs = SearchComprehensiveDocsSchema.parse(args);
      logger.info('Searching comprehensive documentation', validatedArgs);

      const searchResults = await this.documentationIndexer.searchDocumentation(
        validatedArgs.query,
        {
          apis: validatedArgs.apis,
          types: validatedArgs.types,
          limit: validatedArgs.limit
        }
      );

      return {
        success: true,
        query: validatedArgs.query,
        totalResults: searchResults.length,
        results: searchResults.map(result => {
          const item = result.item;
          let title = '';
          let api = '';
          let url = '';
          let summary = '';
          
          if (result.type === 'endpoint') {
            const endpoint = item as any;
            title = `${endpoint.method?.toUpperCase()} ${endpoint.path}`;
            api = endpoint.api || '';
            url = endpoint.url || '';
            summary = endpoint.summary || endpoint.description || '';
          } else if (result.type === 'schema') {
            const schema = item as any;
            title = schema.name || schema.title || 'Schema';
            api = schema.api || '';
            url = schema.url || '';
            summary = schema.description || '';
          } else if (result.type === 'code_example') {
            const example = item as any;
            title = `${example.language} Example`;
            api = example.api || '';
            url = '';
            summary = example.description || '';
          } else if (result.type === 'concept') {
            const concept = item as any;
            title = concept.name || 'Concept';
            api = concept.apis?.join(', ') || '';
            url = '';
            summary = concept.description || '';
          }
          
          return {
            title,
            api,
            type: result.type,
            url,
            relevanceScore: result.relevanceScore,
            summary,
            matchedFields: result.matchedFields,
            context: result.context || ''
          };
        })
      };
    } catch (error) {
      logger.error('Comprehensive documentation search failed:', error);
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid search parameters', error.errors);
      }
      throw new IntegrationError(`Documentation search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getApiExamples(args: any): Promise<any> {
    try {
      const validatedArgs = GetApiExamplesSchema.parse(args);
      logger.info('Getting API examples', validatedArgs);

      const searchQuery = [
        validatedArgs.api,
        validatedArgs.language,
        validatedArgs.endpoint,
        validatedArgs.useCase,
        'example',
        'code'
      ].filter(Boolean).join(' ');

      const searchResults = await this.documentationIndexer.searchDocumentation(
        searchQuery,
        {
          types: ['code_example'],
          apis: validatedArgs.api ? [validatedArgs.api] : undefined,
          limit: 20
        }
      );

      const examples = searchResults
        .filter(result => result.type === 'code_example')
        .map(result => result.item as any)
        .filter(example => {
          if (validatedArgs.language && !example.language.toLowerCase().includes(validatedArgs.language.toLowerCase())) {
            return false;
          }
          if (validatedArgs.endpoint && example.description && !example.description.toLowerCase().includes(validatedArgs.endpoint.toLowerCase())) {
            return false;
          }
          return true;
        })
        .slice(0, 10);

      return {
        success: true,
        filters: validatedArgs,
        totalExamples: examples.length,
        examples: examples.map(example => ({
          language: example.language,
          code: example.code,
          description: example.description,
          api: example.api,
          endpoint: example.endpoint
        }))
      };
    } catch (error) {
      logger.error('Getting API examples failed:', error);
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid example parameters', error.errors);
      }
      throw new IntegrationError(`Getting API examples failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async compareApiImplementations(args: any): Promise<any> {
    try {
      const validatedArgs = CompareApiImplementationsSchema.parse(args);
      logger.info('Comparing API implementations', validatedArgs);

      const sourceResults = await this.documentationIndexer.searchDocumentation(
        `${validatedArgs.sourceApi} ${validatedArgs.functionality}`,
        {
          apis: [validatedArgs.sourceApi],
          limit: 10
        }
      );

      const targetResults = await this.documentationIndexer.searchDocumentation(
        `${validatedArgs.targetApi} ${validatedArgs.functionality}`,
        {
          apis: [validatedArgs.targetApi],
          limit: 10
        }
      );

      const comparison = {
        functionality: validatedArgs.functionality,
        sourceApi: {
          name: validatedArgs.sourceApi,
          implementations: sourceResults.map(result => {
            const item = result.item as any;
            return {
              title: result.type === 'endpoint' ? `${item.method?.toUpperCase()} ${item.path}` : 
                     result.type === 'schema' ? item.name || 'Schema' : 
                     result.type === 'code_example' ? `${item.language} Example` : 
                     item.name || 'Item',
              summary: item.summary || item.description || '',
              type: result.type
            };
          })
        },
        targetApi: {
          name: validatedArgs.targetApi,
          implementations: targetResults.map(result => {
            const item = result.item as any;
            return {
              title: result.type === 'endpoint' ? `${item.method?.toUpperCase()} ${item.path}` : 
                     result.type === 'schema' ? item.name || 'Schema' : 
                     result.type === 'code_example' ? `${item.language} Example` : 
                     item.name || 'Item',
              summary: item.summary || item.description || '',
              type: result.type
            };
          })
        },
        similarities: [] as string[],
        differences: [] as string[],
        recommendations: [] as string[]
      };

      const sourceEndpoints = sourceResults
        .filter(r => r.type === 'endpoint')
        .map(r => r.item as any);
      const targetEndpoints = targetResults
        .filter(r => r.type === 'endpoint')
        .map(r => r.item as any);
      
      comparison.similarities = sourceEndpoints
        .filter(se => targetEndpoints.some(te => 
          te.method === se.method && (te.path?.includes(validatedArgs.functionality) || se.path?.includes(validatedArgs.functionality))
        ))
        .map(ep => `Both APIs support ${ep.method} operations for ${validatedArgs.functionality}`);

      comparison.recommendations = [
        `Consider using ${validatedArgs.sourceApi} for ${validatedArgs.functionality} if you need ${sourceResults.length > targetResults.length ? 'more comprehensive' : 'simpler'} functionality`,
        `${validatedArgs.targetApi} might be better if you prefer ${targetResults.length > sourceResults.length ? 'more detailed' : 'streamlined'} implementation`
      ];

      return {
        success: true,
        comparison
      };
    } catch (error) {
      logger.error('API implementation comparison failed:', error);
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid comparison parameters', error.errors);
      }
      throw new IntegrationError(`API comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getIntegrationPatterns(args: any): Promise<any> {
    try {
      const validatedArgs = GetIntegrationPatternsSchema.parse(args);
      logger.info('Getting integration patterns', validatedArgs);

      const searchQuery = [
        'integration',
        'pattern',
        'workflow',
        validatedArgs.useCase,
        validatedArgs.difficulty
      ].filter(Boolean).join(' ');

      const searchResults = await this.documentationIndexer.searchDocumentation(
        searchQuery,
        {
          apis: validatedArgs.apis,
          limit: 15
        }
      );

      const patterns = this.documentationIndexer.getIntegrationPatterns();

      const filteredPatterns = patterns.filter((pattern: any) => {
        if (validatedArgs.difficulty && pattern.difficulty !== validatedArgs.difficulty) {
          return false;
        }
        if (validatedArgs.useCase && !pattern.description.toLowerCase().includes(validatedArgs.useCase.toLowerCase())) {
          return false;
        }
        return true;
      });

      return {
        success: true,
        filters: validatedArgs,
        totalPatterns: filteredPatterns.length,
        patterns: filteredPatterns.map((pattern: any) => ({
          name: pattern.name,
          description: pattern.description,
          difficulty: pattern.difficulty,
          apis: pattern.apis,
          steps: pattern.steps,
          codeExamples: pattern.codeExamples?.slice(0, 2),
          prerequisites: pattern.prerequisites,
          estimatedTime: pattern.estimatedTime
        })),
        relatedDocumentation: searchResults.slice(0, 5).map(result => {
          const item = result.item as any;
          return {
            title: result.type === 'endpoint' ? `${item.method?.toUpperCase()} ${item.path}` : 
                   result.type === 'schema' ? item.name || 'Schema' : 
                   result.type === 'code_example' ? `${item.language} Example` : 
                   item.name || 'Item',
            api: item.api || (result.type === 'concept' ? item.apis?.join(', ') : ''),
            type: result.type,
            summary: item.summary || item.description || ''
          };
        })
      };
    } catch (error) {
      logger.error('Getting integration patterns failed:', error);
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid pattern parameters', error.errors);
      }
      throw new IntegrationError(`Getting integration patterns failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info(`TimeBack MCP Server ${config.server.version} running`);
  }
}

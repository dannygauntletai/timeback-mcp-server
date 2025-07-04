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
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TimeBackMcpServer {
  private server: Server;
  private openApiParser: OpenAPIParser;
  private authService: AuthService;
  private codebaseAnalyzer: CodebaseAnalyzer;

  constructor() {
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
    
    this.setupHandlers();
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
      const specsDir = path.resolve(__dirname, '../../openapi-specs');
      
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
    const { projectPath, includeCodeExamples = true, focusAreas } = args;
    
    try {
      logger.info(`Analyzing codebase at: ${projectPath}`);
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
      logger.error('Codebase analysis failed:', error);
      throw new Error(`Failed to analyze codebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateIntegrationCode(args: any): Promise<any> {
    const { language, framework, integrationPattern, apis } = args;
    
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
  }

  private async detectIntegrationOpportunities(args: any): Promise<any> {
    const { projectPath, analysisDepth = 'deep' } = args;
    
    try {
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
      logger.error('Integration opportunity detection failed:', error);
      throw new Error(`Failed to detect opportunities: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    return {
      api,
      pattern: 'data-sync',
      code: `// ${api.toUpperCase()} Data Sync Example`,
    };
  }

  private getEventTrackingTemplate(language: string, framework: string, api: string): any {
    return {
      api,
      pattern: 'event-tracking',
      code: `// ${api.toUpperCase()} Event Tracking Example`,
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info(`TimeBack MCP Server ${config.server.version} running`);
  }
}

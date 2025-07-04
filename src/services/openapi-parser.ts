import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIV3 } from 'openapi-types';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import { ParsedEndpoint, ParsedSchema, TimeBackAPI } from '../types/index.js';
import { logger } from '../utils/logger.js';

class OpenAPIParser {
  private apis: Map<string, TimeBackAPI> = new Map();

  async loadFromFile(apiName: string, filePath: string, baseUrl: string): Promise<void> {
    try {
      logger.info(`Loading OpenAPI spec for ${apiName} from file: ${filePath}`);
      const spec = await SwaggerParser.dereference(filePath) as OpenAPIV3.Document;
      
      this.apis.set(apiName, {
        name: apiName,
        baseUrl,
        spec
      });
      
      logger.info(`Successfully loaded ${apiName} API spec with ${Object.keys(spec.paths || {}).length} paths`);
    } catch (error) {
      logger.error(`Failed to load OpenAPI spec for ${apiName}:`, error);
      throw error;
    }
  }

  async loadFromUrl(apiName: string, url: string, baseUrl: string): Promise<void> {
    try {
      logger.info(`Loading OpenAPI spec for ${apiName} from URL: ${url}`);
      const spec = await SwaggerParser.dereference(url) as OpenAPIV3.Document;
      
      this.apis.set(apiName, {
        name: apiName,
        baseUrl,
        spec
      });
      
      logger.info(`Successfully loaded ${apiName} API spec`);
    } catch (error) {
      logger.error(`Failed to load OpenAPI spec for ${apiName}:`, error);
      throw error;
    }
  }

  getAPI(apiName: string): TimeBackAPI | undefined {
    return this.apis.get(apiName);
  }

  getAllAPIs(): TimeBackAPI[] {
    return Array.from(this.apis.values());
  }

  getInfo(apiName: string): OpenAPIV3.InfoObject | null {
    const api = this.apis.get(apiName);
    return api?.spec?.info || null;
  }

  getEndpoints(apiName?: string): ParsedEndpoint[] {
    const endpoints: ParsedEndpoint[] = [];
    const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

    const apisToProcess = apiName ? [this.apis.get(apiName)].filter(Boolean) : Array.from(this.apis.values());

    for (const api of apisToProcess) {
      if (!api?.spec?.paths) continue;

      for (const [path, pathItem] of Object.entries(api.spec.paths)) {
        if (!pathItem) continue;

        for (const method of methods) {
          const operation = (pathItem as any)[method];
          if (!operation) continue;

          endpoints.push({
            path,
            method: method.toUpperCase(),
            operationId: operation.operationId,
            summary: operation.summary,
            description: operation.description,
            parameters: operation.parameters as OpenAPIV3.ParameterObject[],
            requestBody: operation.requestBody as OpenAPIV3.RequestBodyObject,
            responses: operation.responses,
            tags: operation.tags,
            api: api.name,
          });
        }
      }
    }

    return endpoints;
  }

  getSchemas(apiName?: string): ParsedSchema[] {
    const schemas: ParsedSchema[] = [];
    const apisToProcess = apiName ? [this.apis.get(apiName)].filter(Boolean) : Array.from(this.apis.values());

    for (const api of apisToProcess) {
      if (!api?.spec?.components?.schemas) continue;

      for (const [name, schema] of Object.entries(api.spec.components.schemas)) {
        schemas.push({
          name,
          schema: schema as OpenAPIV3.SchemaObject,
          description: (schema as any).description,
          api: api.name,
        });
      }
    }

    return schemas;
  }

  getEndpointsByTag(tag: string, apiName?: string): ParsedEndpoint[] {
    return this.getEndpoints(apiName).filter(endpoint => 
      endpoint.tags?.includes(tag)
    );
  }

  searchEndpoints(query: string, apiName?: string): ParsedEndpoint[] {
    const lowerQuery = query.toLowerCase();
    return this.getEndpoints(apiName).filter(endpoint =>
      endpoint.path.toLowerCase().includes(lowerQuery) ||
      endpoint.summary?.toLowerCase().includes(lowerQuery) ||
      endpoint.description?.toLowerCase().includes(lowerQuery) ||
      endpoint.operationId?.toLowerCase().includes(lowerQuery)
    );
  }

  searchSchemas(query: string, apiName?: string): ParsedSchema[] {
    const lowerQuery = query.toLowerCase();
    return this.getSchemas(apiName).filter(schema =>
      schema.name.toLowerCase().includes(lowerQuery) ||
      schema.description?.toLowerCase().includes(lowerQuery)
    );
  }

  generateAPIDocumentation(apiName: string): string {
    const api = this.apis.get(apiName);
    if (!api?.spec) return `No OpenAPI specification loaded for ${apiName}`;

    const info = api.spec.info;
    const endpoints = this.getEndpoints(apiName);
    const schemas = this.getSchemas(apiName);

    let doc = `# ${info?.title || `${apiName} API Documentation`}\n\n`;
    doc += `${info?.description || ''}\n\n`;
    doc += `**Version:** ${info?.version || 'Unknown'}\n`;
    doc += `**Base URL:** ${api.baseUrl}\n\n`;

    doc += `## Endpoints (${endpoints.length})\n\n`;
    const endpointsByTag = endpoints.reduce((acc, endpoint) => {
      const tag = endpoint.tags?.[0] || 'Untagged';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(endpoint);
      return acc;
    }, {} as Record<string, ParsedEndpoint[]>);

    for (const [tag, tagEndpoints] of Object.entries(endpointsByTag)) {
      doc += `### ${tag}\n\n`;
      for (const endpoint of tagEndpoints as ParsedEndpoint[]) {
        doc += `#### ${endpoint.method} ${endpoint.path}\n`;
        doc += `${endpoint.summary || ''}\n\n`;
        if (endpoint.description) {
          doc += `${endpoint.description}\n\n`;
        }
      }
    }

    doc += `## Data Models (${schemas.length})\n\n`;
    for (const schema of schemas) {
      doc += `### ${schema.name}\n`;
      if (schema.description) {
        doc += `${schema.description}\n\n`;
      }
    }

    return doc;
  }

  compareSchemas(schema1Name: string, api1: string, schema2Name: string, api2: string): any {
    const schema1 = this.getSchemas(api1).find(s => s.name === schema1Name);
    const schema2 = this.getSchemas(api2).find(s => s.name === schema2Name);

    if (!schema1 || !schema2) {
      return { error: 'One or both schemas not found' };
    }

    const getProperties = (schema: OpenAPIV3.SchemaObject) => {
      return schema.properties ? Object.keys(schema.properties) : [];
    };

    const props1 = getProperties(schema1.schema);
    const props2 = getProperties(schema2.schema);

    return {
      schema1: { name: schema1Name, api: api1, properties: props1 },
      schema2: { name: schema2Name, api: api2, properties: props2 },
      commonProperties: props1.filter(p => props2.includes(p)),
      uniqueToSchema1: props1.filter(p => !props2.includes(p)),
      uniqueToSchema2: props2.filter(p => !props1.includes(p)),
    };
  }
}

export { OpenAPIParser };

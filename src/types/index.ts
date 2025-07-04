import { OpenAPIV3 } from 'openapi-types';

export interface TimeBackAPI {
  name: string;
  baseUrl: string;
  spec?: OpenAPIV3.Document;
}

export interface ParsedEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: OpenAPIV3.ParameterObject[];
  requestBody?: OpenAPIV3.RequestBodyObject;
  responses: OpenAPIV3.ResponsesObject;
  tags?: string[];
  api: string;
}

export interface ParsedSchema {
  name: string;
  schema: OpenAPIV3.SchemaObject;
  description?: string;
  api: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
}

export interface DataModelMapping {
  sourceApi: string;
  targetApi: string;
  sourceSchema: string;
  targetSchema: string;
  fieldMappings: Record<string, string>;
}

export interface IntegrationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

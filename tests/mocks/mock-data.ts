import { CrawledContent } from '../../src/services/documentation-crawler.js';
import { StoredDocument } from '../../src/services/documentation-store.js';

export const mockSwaggerContent: CrawledContent = {
  url: 'https://qti.alpha-1edtech.com/openapi.yaml',
  title: 'QTI API Documentation',
  content: `
openapi: 3.0.0
info:
  title: QTI API
  version: 1.0.0
paths:
  /assessments:
    get:
      summary: Get assessments
      tags: [assessments]
      responses:
        '200':
          description: Success
components:
  schemas:
    Assessment:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
  `,
  type: 'swagger',
  metadata: {
    format: 'yaml',
    version: '3.0.0'
  },
  extractedAt: new Date('2024-01-01T00:00:00Z'),
  apiEndpoints: [
    {
      path: '/assessments',
      method: 'GET',
      summary: 'Get assessments',
      tags: ['assessments'],
      responses: {
        '200': { description: 'Success' }
      }
    }
  ],
  schemas: [
    {
      name: 'Assessment',
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' }
      }
    }
  ],
  codeExamples: [
    {
      language: 'javascript',
      code: 'fetch("/assessments").then(r => r.json())',
      description: 'Fetch assessments',
      context: 'API usage example'
    }
  ]
};

export const mockScalarContent: CrawledContent = {
  url: 'https://api.alpha-1edtech.com/scalar?api=powerpath-api',
  title: 'PowerPath API Documentation',
  content: `
<html>
<head><title>PowerPath API</title></head>
<body>
  <div class="api-endpoint">
    <h3>POST /learning-paths</h3>
    <p>Create a new learning path</p>
    <code>
      {
        "title": "Math Fundamentals",
        "objectives": ["algebra", "geometry"]
      }
    </code>
  </div>
</body>
</html>
  `,
  type: 'scalar',
  metadata: {
    format: 'html',
    interactive: true
  },
  extractedAt: new Date('2024-01-01T00:00:00Z'),
  apiEndpoints: [
    {
      path: '/learning-paths',
      method: 'POST',
      summary: 'Create a new learning path',
      description: 'Creates a personalized learning path for students'
    }
  ],
  schemas: [
    {
      name: 'LearningPath',
      type: 'object',
      properties: {
        title: { type: 'string' },
        objectives: { type: 'array', items: { type: 'string' } }
      }
    }
  ],
  codeExamples: [
    {
      language: 'json',
      code: '{\n  "title": "Math Fundamentals",\n  "objectives": ["algebra", "geometry"]\n}',
      description: 'Learning path creation payload',
      context: 'Request body example'
    }
  ]
};

export const mockGoogleDocsContent: CrawledContent = {
  url: 'https://docs.google.com/document/d/16cIsRjdXXcxOKUXQNzpQ0P86RJk1u9h_AcwXS8IvXIY/edit',
  title: 'QTI API Integration Guide',
  content: `
QTI API Integration Guide

Overview
The QTI API provides comprehensive assessment capabilities for educational platforms.

Authentication
All requests require OAuth2 Bearer token authentication.

Example Request:
curl -H "Authorization: Bearer YOUR_TOKEN" https://qti.alpha-1edtech.com/api/assessments

Common Use Cases
1. Creating Assessments
2. Managing Test Items
3. Scoring and Results

Integration Steps
1. Register your application
2. Obtain API credentials
3. Implement OAuth2 flow
4. Start making API calls
  `,
  type: 'google-docs',
  metadata: {
    format: 'text',
    documentId: '16cIsRjdXXcxOKUXQNzpQ0P86RJk1u9h_AcwXS8IvXIY',
    lastModified: '2024-01-01T00:00:00Z'
  },
  extractedAt: new Date('2024-01-01T00:00:00Z'),
  apiEndpoints: [
    {
      path: '/assessments',
      method: 'GET',
      summary: 'Get assessments',
      description: 'Retrieve all assessments for the authenticated user'
    }
  ],
  codeExamples: [
    {
      language: 'bash',
      code: 'curl -H "Authorization: Bearer YOUR_TOKEN" https://qti.alpha-1edtech.com/api/assessments',
      description: 'Example API request with authentication',
      context: 'Authentication example'
    }
  ]
};

export const mockLoomVideoContent: CrawledContent = {
  url: 'https://www.loom.com/share/4416a3fccfcf4bf8aa9fa62103fa4cff',
  title: 'TimeBack - OpenBadge API Walkthrough',
  content: `
Video Transcript:
Welcome to the OpenBadge API walkthrough. In this video, we'll cover:

1. Setting up OpenBadge credentials
2. Creating badge templates
3. Issuing badges to learners
4. Verifying badge authenticity

The OpenBadge API allows you to create and manage digital credentials...

Key endpoints covered:
- POST /badges - Create badge template
- POST /badges/{id}/issue - Issue badge to recipient
- GET /badges/{id}/verify - Verify badge authenticity

Code examples shown in video:
const badge = await fetch('/api/badges', {
  method: 'POST',
  body: JSON.stringify({
    name: 'JavaScript Fundamentals',
    criteria: 'Complete all JS exercises'
  })
});
  `,
  type: 'loom-video',
  metadata: {
    videoId: '4416a3fccfcf4bf8aa9fa62103fa4cff',
    duration: '15:30',
    transcript: true
  },
  extractedAt: new Date('2024-01-01T00:00:00Z'),
  apiEndpoints: [
    {
      path: '/badges',
      method: 'POST',
      summary: 'Create badge template',
      description: 'Creates a new badge template for issuing'
    },
    {
      path: '/badges/{id}/issue',
      method: 'POST',
      summary: 'Issue badge to recipient',
      description: 'Issues a badge to a specific learner'
    },
    {
      path: '/badges/{id}/verify',
      method: 'GET',
      summary: 'Verify badge authenticity',
      description: 'Verifies the authenticity of an issued badge'
    }
  ],
  codeExamples: [
    {
      language: 'javascript',
      code: `const badge = await fetch('/api/badges', {
  method: 'POST',
  body: JSON.stringify({
    name: 'JavaScript Fundamentals',
    criteria: 'Complete all JS exercises'
  })
});`,
      description: 'Creating a badge template',
      context: 'Badge creation example from video'
    }
  ]
};

export const mockStoredDocument: StoredDocument = {
  id: 'qti-doc-123',
  url: 'https://qti.alpha-1edtech.com/openapi.yaml',
  api: 'qti',
  title: 'QTI API Documentation',
  content: mockSwaggerContent.content,
  metadata: {
    crawledAt: new Date('2024-01-01T00:00:00Z'),
    lastUpdated: new Date('2024-01-01T00:00:00Z'),
    version: '1.0.0',
    contentHash: 'abc123',
    format: 'swagger',
    size: 1024
  },
  endpoints: [
    {
      id: 'endpoint-1',
      documentId: 'qti-doc-123',
      path: '/assessments',
      method: 'GET',
      summary: 'Get assessments',
      tags: ['assessments'],
      responses: { '200': { description: 'Success' } }
    }
  ],
  schemas: [
    {
      id: 'schema-1',
      documentId: 'qti-doc-123',
      name: 'Assessment',
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' }
      }
    }
  ],
  codeExamples: [
    {
      id: 'example-1',
      documentId: 'qti-doc-123',
      language: 'javascript',
      code: 'fetch("/assessments").then(r => r.json())',
      description: 'Fetch assessments'
    }
  ]
};

export const mockSearchResults = [
  {
    type: 'endpoint' as const,
    item: {
      path: '/assessments',
      method: 'GET',
      summary: 'Get assessments',
      api: 'qti'
    },
    relevanceScore: 0.95,
    snippet: 'Get all assessments for the authenticated user'
  },
  {
    type: 'schema' as const,
    item: {
      name: 'Assessment',
      type: 'object',
      api: 'qti',
      description: 'Assessment data model'
    },
    relevanceScore: 0.87,
    snippet: 'Assessment object with id, title, and metadata'
  },
  {
    type: 'code_example' as const,
    item: {
      language: 'javascript',
      code: 'fetch("/assessments")',
      api: 'qti',
      description: 'Fetch assessments example'
    },
    relevanceScore: 0.82,
    snippet: 'JavaScript code to fetch assessments from API'
  }
];

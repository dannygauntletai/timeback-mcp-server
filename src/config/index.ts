import { z } from 'zod';
import dotenv from 'dotenv';
import { IntegrationConfigSchema } from './integration.js';

dotenv.config();

const ConfigSchema = z.object({
  server: z.object({
    name: z.string().default('timeback-mcp-server'),
    version: z.string().default('1.0.0'),
  }),
  timeback: z.object({
    qti: z.object({
      baseUrl: z.string().url().default('https://qti.alpha-1edtech.com/api'),
    }),
    oneroster: z.object({
      baseUrl: z.string().url().default('https://api.alpha-1edtech.com'),
    }),
    caliper: z.object({
      baseUrl: z.string().url().default('https://caliper.alpha-1edtech.com'),
    }),
    powerpath: z.object({
      baseUrl: z.string().url().default('https://api.alpha-1edtech.com'),
    }),
    case: z.object({
      baseUrl: z.string().url().default('https://api.alpha-1edtech.com'),
    }),
  }),
  auth: z.object({
    tokenUrl: z.string().url().default('https://alpha-auth-production-idp.auth.us-west-2.amazoncognito.com/oauth2/token'),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
  crawler: z.object({
    enabled: z.boolean().default(true),
    schedule: z.object({
      interval: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
      time: z.string().default('02:00'), // 2 AM UTC
    }),
    retryPolicy: z.object({
      maxRetries: z.number().default(3),
      retryDelay: z.number().default(5000), // 5 seconds
      backoffMultiplier: z.number().default(2),
    }),
    rateLimit: z.object({
      requestsPerMinute: z.number().default(30),
      delayBetweenRequests: z.number().default(2000), // 2 seconds
    }),
    timeout: z.number().default(30000), // 30 seconds
    documentationUrls: z.object({
      qti: z.array(z.object({
        url: z.string().url(),
        type: z.enum(['swagger', 'scalar', 'google_docs', 'loom_video']),
        priority: z.number().default(1),
      })).default([
        { url: 'https://qti.alpha-1edtech.com/docs/', type: 'swagger', priority: 1 },
        { url: 'https://qti.alpha-1edtech.com/openapi.yaml', type: 'swagger', priority: 1 },
        { url: 'https://docs.google.com/document/d/16cIsRjdXXcxOKUXQNzpQ0P86RJk1u9h_AcwXS8IvXIY/edit?tab=t.f3h055ah8oii#heading=h.2lox6lc1lhxe', type: 'google_docs', priority: 2 },
      ]),
      oneroster: z.array(z.object({
        url: z.string().url(),
        type: z.enum(['swagger', 'scalar', 'google_docs', 'loom_video']),
        priority: z.number().default(1),
      })).default([
        { url: 'https://api.alpha-1edtech.com/scalar/', type: 'scalar', priority: 1 },
        { url: 'https://api.alpha-1edtech.com/openapi.yaml', type: 'swagger', priority: 1 },
      ]),
      caliper: z.array(z.object({
        url: z.string().url(),
        type: z.enum(['swagger', 'scalar', 'google_docs', 'loom_video']),
        priority: z.number().default(1),
      })).default([
        { url: 'https://caliper.alpha-1edtech.com/', type: 'swagger', priority: 1 },
        { url: 'https://caliper.alpha-1edtech.com/openapi.yaml', type: 'swagger', priority: 1 },
      ]),
      powerpath: z.array(z.object({
        url: z.string().url(),
        type: z.enum(['swagger', 'scalar', 'google_docs', 'loom_video']),
        priority: z.number().default(1),
      })).default([
        { url: 'https://api.alpha-1edtech.com/scalar?api=powerpath-api', type: 'scalar', priority: 1 },
        { url: 'https://api.alpha-1edtech.com/powerpath/openapi.yaml', type: 'swagger', priority: 1 },
      ]),
      case: z.array(z.object({
        url: z.string().url(),
        type: z.enum(['swagger', 'scalar', 'google_docs', 'loom_video']),
        priority: z.number().default(1),
      })).default([
        { url: 'https://api.alpha-1edtech.com/scalar?api=case-api', type: 'scalar', priority: 1 },
        { url: 'https://api.alpha-1edtech.com/case/openapi.yaml', type: 'swagger', priority: 1 },
      ]),
      openbadge: z.array(z.object({
        url: z.string().url(),
        type: z.enum(['swagger', 'scalar', 'google_docs', 'loom_video']),
        priority: z.number().default(1),
      })).default([
        { url: 'https://www.loom.com/share/4416a3fccfcf4bf8aa9fa62103fa4cff', type: 'loom_video', priority: 2 },
      ]),
      clr: z.array(z.object({
        url: z.string().url(),
        type: z.enum(['swagger', 'scalar', 'google_docs', 'loom_video']),
        priority: z.number().default(1),
      })).default([
        { url: 'https://www.loom.com/share/264f6aa20bdf4a2a93f167549b7b4cf6', type: 'loom_video', priority: 2 },
      ]),
    }),
  }),
  integration: IntegrationConfigSchema.optional(),
});

const config = ConfigSchema.parse({
  server: {
    name: process.env.MCP_SERVER_NAME,
    version: process.env.MCP_SERVER_VERSION,
  },
  timeback: {
    qti: {
      baseUrl: process.env.TIMEBACK_QTI_BASE_URL,
    },
    oneroster: {
      baseUrl: process.env.TIMEBACK_ONEROSTER_BASE_URL,
    },
    caliper: {
      baseUrl: process.env.TIMEBACK_CALIPER_BASE_URL,
    },
    powerpath: {
      baseUrl: process.env.TIMEBACK_POWERPATH_BASE_URL,
    },
    case: {
      baseUrl: process.env.TIMEBACK_CASE_BASE_URL,
    },
  },
  auth: {
    tokenUrl: process.env.OAUTH2_TOKEN_URL,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  },
  logging: {
    level: process.env.LOG_LEVEL as any,
  },
  crawler: {
    enabled: process.env.CRAWLER_ENABLED === 'false' ? false : true,
    schedule: {
      interval: (process.env.CRAWLER_SCHEDULE_INTERVAL as any) || 'daily',
      time: process.env.CRAWLER_SCHEDULE_TIME || '02:00',
    },
    retryPolicy: {
      maxRetries: parseInt(process.env.CRAWLER_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.CRAWLER_RETRY_DELAY || '5000'),
      backoffMultiplier: parseFloat(process.env.CRAWLER_BACKOFF_MULTIPLIER || '2'),
    },
    rateLimit: {
      requestsPerMinute: parseInt(process.env.CRAWLER_REQUESTS_PER_MINUTE || '30'),
      delayBetweenRequests: parseInt(process.env.CRAWLER_DELAY_BETWEEN_REQUESTS || '2000'),
    },
    timeout: parseInt(process.env.CRAWLER_TIMEOUT || '30000'),
    documentationUrls: {
      qti: [],
      oneroster: [],
      caliper: [],
      powerpath: [],
      case: [],
      openbadge: [],
      clr: [],
    },
  },
  integration: {
    enabled: process.env.INTEGRATION_ENABLED === 'true',
    patterns: {
      serverChaining: process.env.INTEGRATION_SERVER_CHAINING === 'true',
      toolComposition: process.env.INTEGRATION_TOOL_COMPOSITION === 'true',
      sharedResources: process.env.INTEGRATION_SHARED_RESOURCES === 'true',
      eventDriven: process.env.INTEGRATION_EVENT_DRIVEN === 'true',
      sseIntegration: process.env.INTEGRATION_SSE === 'true',
    },
    downstreamServers: [],
    sseEndpoints: {
      enabled: process.env.INTEGRATION_SSE_ENABLED === 'true',
      port: parseInt(process.env.INTEGRATION_SSE_PORT || '3001'),
      cors: {
        origins: process.env.INTEGRATION_SSE_CORS_ORIGINS?.split(',') || ['*'],
      },
    },
  },
});

export type Config = z.infer<typeof ConfigSchema>;
export { config };

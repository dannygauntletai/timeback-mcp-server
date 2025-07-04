import { z } from 'zod';

export const IntegrationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  patterns: z.object({
    serverChaining: z.boolean().default(false),
    toolComposition: z.boolean().default(false),
    sharedResources: z.boolean().default(false),
    eventDriven: z.boolean().default(false),
    sseIntegration: z.boolean().default(false),
  }),
  downstreamServers: z.array(z.object({
    name: z.string(),
    transport: z.enum(['stdio', 'sse', 'http', 'websocket']),
    url: z.string().optional(),
    auth: z.object({
      type: z.enum(['none', 'oauth2', 'bearer']),
      credentials: z.record(z.string()).optional(),
    }).optional(),
  })).default([]),
  sseEndpoints: z.object({
    enabled: z.boolean().default(false),
    port: z.number().default(3001),
    cors: z.object({
      origins: z.array(z.string()).default(['*']),
    }),
  }),
});

export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;

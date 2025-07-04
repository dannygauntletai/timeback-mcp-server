import { z } from 'zod';
import dotenv from 'dotenv';

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
});

export type Config = z.infer<typeof ConfigSchema>;
export { config };

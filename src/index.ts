#!/usr/bin/env node

import { TimeBackMcpServer } from './server/mcp-server.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    const server = new TimeBackMcpServer();
    await server.run();
  } catch (error) {
    logger.error('Failed to start TimeBack MCP Server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

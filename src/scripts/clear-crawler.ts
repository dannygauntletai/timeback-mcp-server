#!/usr/bin/env node

import { DocumentationIndexer } from '../services/documentation-indexer.js';
import { logger } from '../utils/logger.js';

async function clearCrawlerCache() {
  logger.info('Clearing TimeBack documentation crawler cache...');
  
  try {
    const indexer = new DocumentationIndexer();
    
    await indexer.clearIndex();
    
    console.log('🗑️  Crawler cache cleared successfully');
    console.log('📝 All indexed documentation has been removed');
    console.log('💡 Run "npm run crawler:init" to re-initialize the crawler');
    
  } catch (error) {
    logger.error('Failed to clear crawler cache:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  clearCrawlerCache();
}

#!/usr/bin/env node

import { DocumentationIndexer } from '../services/documentation-indexer.js';
import { logger } from '../utils/logger.js';

async function getCrawlerStatus() {
  logger.info('Checking TimeBack documentation crawler status...');
  
  try {
    const indexer = new DocumentationIndexer();
    
    const stats = await indexer.getIndexStats();
    
    console.log('\n📊 TimeBack Documentation Crawler Status');
    console.log('==========================================');
    console.log(`📄 Total Documents: ${stats.totalDocuments}`);
    console.log(`🔍 Total Searchable Content: ${stats.totalContent} characters`);
    console.log(`🏷️  Unique Tags: ${stats.uniqueTags}`);
    console.log(`🔗 Relationships: ${stats.relationships}`);
    console.log(`📅 Last Updated: ${stats.lastUpdated || 'Never'}`);
    
    if (stats.apiBreakdown) {
      console.log('\n📋 API Documentation Breakdown:');
      for (const [api, count] of Object.entries(stats.apiBreakdown)) {
        console.log(`  ${api}: ${count} documents`);
      }
    }
    
    if (stats.recentErrors && stats.recentErrors.length > 0) {
      console.log('\n⚠️  Recent Errors:');
      stats.recentErrors.forEach((error: string, index: number) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n✅ Status check completed');
    
  } catch (error) {
    logger.error('Failed to get crawler status:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  getCrawlerStatus();
}

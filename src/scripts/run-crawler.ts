#!/usr/bin/env node

import { DocumentationCrawler } from '../services/documentation-crawler.js';
import { DocumentationIndexer } from '../services/documentation-indexer.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

async function runCrawler() {
  logger.info('Running TimeBack documentation crawler...');
  
  try {
    const crawlerOptions = {
      maxRetries: config.crawler.retryPolicy.maxRetries,
      retryDelay: config.crawler.retryPolicy.retryDelay,
      timeout: config.crawler.timeout,
      respectRobotsTxt: true,
      rateLimit: config.crawler.rateLimit.delayBetweenRequests
    };

    const crawler = new DocumentationCrawler(crawlerOptions);
    const indexer = new DocumentationIndexer();

    await crawler.initialize();

    const timebackUrls = [
      'https://qti.alpha-1edtech.com/docs/',
      'https://qti.alpha-1edtech.com/openapi.yaml',
      'https://api.alpha-1edtech.com/scalar/',
      'https://api.alpha-1edtech.com/openapi.yaml',
      'https://caliper.alpha-1edtech.com/',
      'https://caliper.alpha-1edtech.com/openapi.yaml',
      'https://api.alpha-1edtech.com/scalar?api=powerpath-api',
      'https://api.alpha-1edtech.com/powerpath/openapi.yaml',
      'https://api.alpha-1edtech.com/scalar?api=case-api',
      'https://api.alpha-1edtech.com/case/openapi.yaml'
    ];

    logger.info(`Crawling ${timebackUrls.length} documentation sources...`);
    const results = await crawler.crawlMultipleUrls(timebackUrls);
    
    let successCount = 0;
    let failureCount = 0;
    
    const validResults = results.filter(result => result.content);
    const failedResults = results.filter(result => !result.content);
    
    if (validResults.length > 0) {
      await indexer.indexCrawledContent(validResults);
      successCount = validResults.length;
      logger.info(`✓ Crawled and indexed ${successCount} documents`);
    }
    
    failureCount = failedResults.length;
    if (failureCount > 0) {
      logger.warn(`✗ Failed to crawl ${failureCount} documents`);
    }

    await crawler.close();
    
    logger.info(`Crawler run completed: ${successCount} successful, ${failureCount} failed`);
    
  } catch (error) {
    logger.error('Crawler run failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCrawler();
}

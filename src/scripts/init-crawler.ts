#!/usr/bin/env node

import { DocumentationCrawler } from '../services/documentation-crawler.js';
import { DocumentationIndexer } from '../services/documentation-indexer.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

async function initializeCrawler() {
  logger.info('Initializing TimeBack documentation crawler...');
  
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
    logger.info('Crawler initialized successfully');

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

    logger.info(`Starting initial crawl of ${timebackUrls.length} documentation sources...`);
    const results = await crawler.crawlMultipleUrls(timebackUrls);
    
    logger.info(`Crawled ${results.length} documents successfully`);
    
    const validResults = results.filter(result => result.content);
    if (validResults.length > 0) {
      await indexer.indexCrawledContent(validResults);
      logger.info(`Indexed ${validResults.length} documents successfully`);
    }
    
    const failedCount = results.length - validResults.length;
    if (failedCount > 0) {
      logger.warn(`Failed to crawl ${failedCount} documents`);
    }

    await crawler.close();
    logger.info('Initial crawler setup completed successfully!');
    
  } catch (error) {
    logger.error('Failed to initialize crawler:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  initializeCrawler();
}

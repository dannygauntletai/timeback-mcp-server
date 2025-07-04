import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface CrawledContent {
  url: string;
  title: string;
  content: string;
  type: 'swagger' | 'scalar' | 'google-docs' | 'loom-video';
  metadata: Record<string, any>;
  extractedAt: Date;
  apiEndpoints?: ApiEndpoint[];
  schemas?: Schema[];
  codeExamples?: CodeExample[];
}

export interface ApiEndpoint {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  responses?: Record<string, any>;
  tags?: string[];
}

export interface Schema {
  name: string;
  type: string;
  properties?: Record<string, any>;
  description?: string;
  example?: any;
}

export interface CodeExample {
  language: string;
  code: string;
  description?: string;
  context?: string;
}

export interface Parameter {
  name: string;
  in: string;
  required: boolean;
  type: string;
  description?: string;
}

export interface CrawlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  respectRobotsTxt?: boolean;
  userAgent?: string;
  rateLimit?: number;
}

export class DocumentationCrawler {
  private browser: Browser | null = null;
  private options: CrawlerOptions;
  private lastRequestTime = 0;

  constructor(options: CrawlerOptions = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      respectRobotsTxt: true,
      userAgent: 'TimeBack-MCP-Server/1.0.0 (+https://github.com/dannygauntletai/timeback-mcp-server)',
      rateLimit: 1000,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    try {
      logger.info('Initializing documentation crawler browser');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });
      logger.info('Documentation crawler browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser:', error);
      throw new Error(`Failed to initialize crawler browser: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Documentation crawler browser closed');
    }
  }

  async crawlUrl(url: string): Promise<CrawledContent> {
    await this.initialize();
    
    const documentationType = this.detectDocumentationType(url);
    logger.info(`Crawling ${documentationType} documentation`, { url });

    switch (documentationType) {
      case 'swagger':
        return await this.crawlSwaggerDocs(url);
      case 'scalar':
        return await this.crawlScalarDocs(url);
      case 'google-docs':
        return await this.crawlGoogleDocs(url);
      case 'loom-video':
        return await this.crawlLoomVideo(url);
      default:
        throw new Error(`Unsupported documentation type for URL: ${url}`);
    }
  }

  private detectDocumentationType(url: string): CrawledContent['type'] {
    if (url.includes('qti.alpha-1edtech.com/docs') || url.includes('/openapi.yaml') || url.includes('swagger')) {
      return 'swagger';
    }
    if (url.includes('api.alpha-1edtech.com/scalar') || url.includes('/scalar')) {
      return 'scalar';
    }
    if (url.includes('docs.google.com')) {
      return 'google-docs';
    }
    if (url.includes('loom.com')) {
      return 'loom-video';
    }
    return 'swagger'; // Default fallback
  }

  private async crawlSwaggerDocs(url: string): Promise<CrawledContent> {
    return await this.withRetry(async () => {
      await this.respectRateLimit();
      
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const page = await this.browser.newPage();
      
      try {
        await page.setUserAgent(this.options.userAgent!);
        await page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: this.options.timeout 
        });

        await page.waitForSelector('.swagger-ui', { timeout: 10000 }).catch(() => {
          logger.warn('Swagger UI selector not found, proceeding with generic extraction');
        });

        const content = await page.evaluate(() => {
          const title = document.title || 'API Documentation';
          const bodyText = document.body.innerText || '';
          
          const endpoints: any[] = [];
          const operations = document.querySelectorAll('.opblock');
          operations.forEach(op => {
            const method = op.querySelector('.opblock-summary-method')?.textContent?.trim();
            const path = op.querySelector('.opblock-summary-path')?.textContent?.trim();
            const summary = op.querySelector('.opblock-summary-description')?.textContent?.trim();
            
            if (method && path) {
              endpoints.push({ method, path, summary });
            }
          });

          const schemas: any[] = [];
          const schemaElements = document.querySelectorAll('.model-container');
          schemaElements.forEach(schema => {
            const name = schema.querySelector('.model-title')?.textContent?.trim();
            const description = schema.querySelector('.model-description')?.textContent?.trim();
            
            if (name) {
              schemas.push({ name, description });
            }
          });

          return {
            title,
            bodyText,
            endpoints,
            schemas,
          };
        });

        let openApiSpec = null;
        const specUrl = url.replace('/docs', '/openapi.yaml').replace('/swagger', '/openapi.yaml');
        if (specUrl !== url) {
          try {
            const specResponse = await page.goto(specUrl, { timeout: 10000 });
            if (specResponse?.ok()) {
              openApiSpec = await specResponse.text();
            }
          } catch (error) {
            logger.debug('Could not fetch OpenAPI spec:', { specUrl, error });
          }
        }

        return {
          url,
          title: content.title,
          content: content.bodyText,
          type: 'swagger' as const,
          metadata: {
            openApiSpec,
            userAgent: this.options.userAgent,
          },
          extractedAt: new Date(),
          apiEndpoints: content.endpoints,
          schemas: content.schemas,
        };

      } finally {
        await page.close();
      }
    });
  }

  private async crawlScalarDocs(url: string): Promise<CrawledContent> {
    return await this.withRetry(async () => {
      await this.respectRateLimit();
      
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const page = await this.browser.newPage();
      
      try {
        await page.setUserAgent(this.options.userAgent!);
        await page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: this.options.timeout 
        });

        await page.waitForSelector('[data-testid="scalar-api-reference"]', { timeout: 10000 }).catch(() => {
          logger.warn('Scalar API reference selector not found, proceeding with generic extraction');
        });

        const content = await page.evaluate(() => {
          const title = document.title || 'API Documentation';
          const bodyText = document.body.innerText || '';
          
          const endpoints: any[] = [];
          const operationElements = document.querySelectorAll('[data-testid*="operation"]');
          operationElements.forEach(op => {
            const methodElement = op.querySelector('[data-testid*="method"]');
            const pathElement = op.querySelector('[data-testid*="path"]');
            const summaryElement = op.querySelector('[data-testid*="summary"]');
            
            const method = methodElement?.textContent?.trim();
            const path = pathElement?.textContent?.trim();
            const summary = summaryElement?.textContent?.trim();
            
            if (method && path) {
              endpoints.push({ method, path, summary });
            }
          });

          const authInfo = document.querySelector('[data-testid*="auth"]')?.textContent?.trim();

          const codeExamples: any[] = [];
          const codeBlocks = document.querySelectorAll('pre code, .code-block');
          codeBlocks.forEach((block, index) => {
            const code = block.textContent?.trim();
            if (code && code.length > 10) {
              const language = block.className.includes('javascript') ? 'javascript' :
                             block.className.includes('python') ? 'python' :
                             block.className.includes('curl') ? 'curl' : 'unknown';
              
              codeExamples.push({
                language,
                code,
                context: `Example ${index + 1}`,
              });
            }
          });

          return {
            title,
            bodyText,
            endpoints,
            authInfo,
            codeExamples,
          };
        });

        return {
          url,
          title: content.title,
          content: content.bodyText,
          type: 'scalar' as const,
          metadata: {
            authInfo: content.authInfo,
            userAgent: this.options.userAgent,
          },
          extractedAt: new Date(),
          apiEndpoints: content.endpoints,
          codeExamples: content.codeExamples,
        };

      } finally {
        await page.close();
      }
    });
  }

  private async crawlGoogleDocs(url: string): Promise<CrawledContent> {
    return await this.withRetry(async () => {
      await this.respectRateLimit();
      
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const page = await this.browser.newPage();
      
      try {
        await page.setUserAgent(this.options.userAgent!);
        await page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: this.options.timeout 
        });

        await page.waitForSelector('.kix-document-content', { timeout: 15000 }).catch(() => {
          logger.warn('Google Docs content selector not found, proceeding with generic extraction');
        });

        const content = await page.evaluate(() => {
          const title = document.title || 'Google Docs';
          
          const contentElement = document.querySelector('.kix-document-content') || document.body;
          const bodyText = contentElement.textContent || '';
          
          const headings: any[] = [];
          const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, .kix-paragraphrenderer-heading');
          headingElements.forEach((heading, index) => {
            const text = heading.textContent?.trim();
            const level = heading.tagName ? parseInt(heading.tagName.charAt(1)) : 1;
            
            if (text) {
              headings.push({
                level,
                text,
                index,
              });
            }
          });

          const links: any[] = [];
          const linkElements = document.querySelectorAll('a[href]');
          linkElements.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent?.trim();
            
            if (href && text) {
              links.push({ href, text });
            }
          });

          const tables: any[] = [];
          const tableElements = document.querySelectorAll('table');
          tableElements.forEach((table, index) => {
            const rows: any[] = [];
            const rowElements = table.querySelectorAll('tr');
            
            rowElements.forEach(row => {
              const cells = Array.from(row.querySelectorAll('td, th')).map(cell => 
                cell.textContent?.trim() || ''
              );
              if (cells.length > 0) {
                rows.push(cells);
              }
            });
            
            if (rows.length > 0) {
              tables.push({ index, rows });
            }
          });

          return {
            title,
            bodyText,
            headings,
            links,
            tables,
          };
        });

        return {
          url,
          title: content.title,
          content: content.bodyText,
          type: 'google-docs' as const,
          metadata: {
            headings: content.headings,
            links: content.links,
            tables: content.tables,
            userAgent: this.options.userAgent,
          },
          extractedAt: new Date(),
        };

      } finally {
        await page.close();
      }
    });
  }

  private async crawlLoomVideo(url: string): Promise<CrawledContent> {
    return await this.withRetry(async () => {
      await this.respectRateLimit();
      
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const page = await this.browser.newPage();
      
      try {
        await page.setUserAgent(this.options.userAgent!);
        await page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: this.options.timeout 
        });

        await page.waitForSelector('video, .video-container', { timeout: 10000 }).catch(() => {
          logger.warn('Loom video selector not found, proceeding with generic extraction');
        });

        const content = await page.evaluate(() => {
          const title = document.title || 'Loom Video';
          const bodyText = document.body.innerText || '';
          
          const videoElement = document.querySelector('video');
          const duration = videoElement?.duration;
          const poster = videoElement?.poster;
          
          const descriptionElement = document.querySelector('[data-testid="video-description"], .description, .video-description');
          const description = descriptionElement?.textContent?.trim();
          
          const transcriptElement = document.querySelector('[data-testid="transcript"], .transcript');
          const transcript = transcriptElement?.textContent?.trim();
          
          const videoTitleElement = document.querySelector('h1, .video-title, [data-testid="video-title"]');
          const videoTitle = videoTitleElement?.textContent?.trim() || title;
          
          return {
            title: videoTitle,
            bodyText,
            description,
            transcript,
            duration,
            poster,
          };
        });

        return {
          url,
          title: content.title,
          content: content.bodyText,
          type: 'loom-video' as const,
          metadata: {
            description: content.description,
            transcript: content.transcript,
            duration: content.duration,
            poster: content.poster,
            userAgent: this.options.userAgent,
          },
          extractedAt: new Date(),
        };

      } finally {
        await page.close();
      }
    });
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.options.maxRetries!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`Crawler attempt ${attempt} failed:`, { 
          error: lastError.message,
          attempt,
          maxRetries: this.options.maxRetries 
        });
        
        if (attempt < this.options.maxRetries!) {
          await this.delay(this.options.retryDelay! * attempt);
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.options.rateLimit!) {
      const waitTime = this.options.rateLimit! - timeSinceLastRequest;
      logger.debug(`Rate limiting: waiting ${waitTime}ms`);
      await this.delay(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async crawlMultipleUrls(urls: string[]): Promise<CrawledContent[]> {
    const results: CrawledContent[] = [];
    
    logger.info(`Starting to crawl ${urls.length} URLs`);
    
    for (const url of urls) {
      try {
        const content = await this.crawlUrl(url);
        results.push(content);
        logger.info(`Successfully crawled: ${url}`);
      } catch (error) {
        logger.error(`Failed to crawl ${url}:`, error);
      }
    }
    
    logger.info(`Completed crawling ${results.length}/${urls.length} URLs successfully`);
    return results;
  }
}

import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { DocumentationCrawler } from './documentation-crawler.js';
import { DocumentationStore } from './documentation-store.js';

export interface CrawlerJob {
  id: string;
  api: string;
  url: string;
  type: 'swagger' | 'scalar' | 'google_docs' | 'loom_video';
  priority: number;
  scheduledAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRun?: Date;
  nextRun?: Date;
  retryCount: number;
  error?: string;
}

export interface SchedulerStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  lastRunTime?: Date;
  nextRunTime?: Date;
  averageRunTime: number;
}

export class CrawlerScheduler {
  private crawler: DocumentationCrawler;
  private store: DocumentationStore;
  private jobs: Map<string, CrawlerJob> = new Map();
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private runStats: number[] = [];

  constructor(crawler: DocumentationCrawler, store: DocumentationStore) {
    this.crawler = crawler;
    this.store = store;
  }

  async initialize(): Promise<void> {
    try {
      await this.createJobsFromConfig();
      this.scheduleNextRun();
      logger.info('Crawler scheduler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize crawler scheduler:', error);
      throw new Error(`Scheduler initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createJobsFromConfig(): Promise<void> {
    const { documentationUrls } = config.crawler;
    
    for (const [api, urls] of Object.entries(documentationUrls)) {
      for (const urlConfig of urls) {
        const job: CrawlerJob = {
          id: this.generateJobId(api, urlConfig.url),
          api,
          url: urlConfig.url,
          type: urlConfig.type,
          priority: urlConfig.priority,
          scheduledAt: new Date(),
          status: 'pending',
          retryCount: 0,
          nextRun: this.calculateNextRun()
        };
        
        this.jobs.set(job.id, job);
      }
    }
    
    logger.info(`Created ${this.jobs.size} crawler jobs from configuration`);
  }

  private calculateNextRun(): Date {
    const now = new Date();
    const { interval, time } = config.crawler.schedule;
    
    switch (interval) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      
      case 'daily':
        const [hours, minutes] = time.split(':').map(Number);
        const nextRun = new Date(now);
        nextRun.setHours(hours, minutes, 0, 0);
        
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        
        return nextRun;
      
      case 'weekly':
        const weeklyRun = new Date(now);
        const [weeklyHours, weeklyMinutes] = time.split(':').map(Number);
        weeklyRun.setHours(weeklyHours, weeklyMinutes, 0, 0);
        
        const daysUntilSunday = (7 - weeklyRun.getDay()) % 7;
        weeklyRun.setDate(weeklyRun.getDate() + (daysUntilSunday || 7));
        
        return weeklyRun;
      
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 24 hours
    }
  }

  private scheduleNextRun(): void {
    if (!config.crawler.enabled) {
      logger.info('Crawler is disabled in configuration');
      return;
    }

    const nextRun = this.calculateNextRun();
    const delay = nextRun.getTime() - Date.now();
    
    if (this.intervalId) {
      clearTimeout(this.intervalId);
    }
    
    this.intervalId = setTimeout(() => {
      this.runCrawlerJobs();
    }, delay);
    
    logger.info(`Next crawler run scheduled for: ${nextRun.toISOString()}`);
  }

  async runCrawlerJobs(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Crawler jobs already running, skipping this run');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      logger.info('Starting scheduled crawler run');
      
      const jobsToRun = Array.from(this.jobs.values())
        .filter(job => job.status === 'pending' || job.status === 'failed')
        .sort((a, b) => a.priority - b.priority);
      
      let successCount = 0;
      let failureCount = 0;
      
      for (const job of jobsToRun) {
        try {
          await this.runSingleJob(job);
          successCount++;
        } catch (error) {
          logger.error(`Job ${job.id} failed:`, error);
          failureCount++;
        }
        
        await this.delay(config.crawler.rateLimit.delayBetweenRequests);
      }
      
      const runTime = Date.now() - startTime;
      this.runStats.push(runTime);
      
      if (this.runStats.length > 10) {
        this.runStats = this.runStats.slice(-10);
      }
      
      logger.info(`Crawler run completed: ${successCount} successful, ${failureCount} failed, ${runTime}ms total`);
      
    } catch (error) {
      logger.error('Crawler run failed:', error);
    } finally {
      this.isRunning = false;
      this.scheduleNextRun();
    }
  }

  private async runSingleJob(job: CrawlerJob): Promise<void> {
    job.status = 'running';
    job.lastRun = new Date();
    
    try {
      logger.debug(`Running crawler job: ${job.api} - ${job.url}`);
      
      const crawledContent = await this.crawler.crawlUrl(job.url);
      await this.store.storeDocument(crawledContent);
      
      job.status = 'completed';
      job.retryCount = 0;
      job.error = undefined;
      job.nextRun = this.calculateNextRun();
      
      logger.debug(`Job completed successfully: ${job.id}`);
      
    } catch (error) {
      job.retryCount++;
      job.error = error instanceof Error ? error.message : 'Unknown error';
      
      if (job.retryCount >= config.crawler.retryPolicy.maxRetries) {
        job.status = 'failed';
        logger.error(`Job ${job.id} failed after ${job.retryCount} retries: ${job.error}`);
      } else {
        job.status = 'pending';
        const retryDelay = config.crawler.retryPolicy.retryDelay * 
          Math.pow(config.crawler.retryPolicy.backoffMultiplier, job.retryCount - 1);
        
        setTimeout(() => {
          if (job.status === 'pending') {
            this.runSingleJob(job).catch(err => {
              logger.error(`Retry failed for job ${job.id}:`, err);
            });
          }
        }, retryDelay);
        
        logger.warn(`Job ${job.id} failed, scheduling retry ${job.retryCount}/${config.crawler.retryPolicy.maxRetries} in ${retryDelay}ms`);
      }
    }
  }

  async runJobNow(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.error(`Job not found: ${jobId}`);
      return false;
    }

    if (job.status === 'running') {
      logger.warn(`Job ${jobId} is already running`);
      return false;
    }

    try {
      await this.runSingleJob(job);
      return job.status === 'completed';
    } catch (error) {
      logger.error(`Manual job run failed for ${jobId}:`, error);
      return false;
    }
  }

  async runApiJobs(api: string): Promise<{ success: number; failed: number }> {
    const apiJobs = Array.from(this.jobs.values()).filter(job => job.api === api);
    
    let success = 0;
    let failed = 0;
    
    for (const job of apiJobs) {
      try {
        await this.runSingleJob(job);
        if (job.status === 'completed') {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        logger.error(`API job failed for ${job.id}:`, error);
      }
      
      await this.delay(config.crawler.rateLimit.delayBetweenRequests);
    }
    
    logger.info(`API ${api} jobs completed: ${success} successful, ${failed} failed`);
    return { success, failed };
  }

  getJob(jobId: string): CrawlerJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobsByApi(api: string): CrawlerJob[] {
    return Array.from(this.jobs.values()).filter(job => job.api === api);
  }

  getJobsByStatus(status: CrawlerJob['status']): CrawlerJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  getStats(): SchedulerStats {
    const jobs = Array.from(this.jobs.values());
    const lastRunTimes = jobs.map(job => job.lastRun).filter(Boolean) as Date[];
    const nextRunTimes = jobs.map(job => job.nextRun).filter(Boolean) as Date[];
    
    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(job => job.status === 'pending').length,
      runningJobs: jobs.filter(job => job.status === 'running').length,
      completedJobs: jobs.filter(job => job.status === 'completed').length,
      failedJobs: jobs.filter(job => job.status === 'failed').length,
      lastRunTime: lastRunTimes.length > 0 ? new Date(Math.max(...lastRunTimes.map(d => d.getTime()))) : undefined,
      nextRunTime: nextRunTimes.length > 0 ? new Date(Math.min(...nextRunTimes.map(d => d.getTime()))) : undefined,
      averageRunTime: this.runStats.length > 0 ? this.runStats.reduce((a, b) => a + b, 0) / this.runStats.length : 0
    };
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }
    
    while (this.isRunning) {
      await this.delay(1000);
    }
    
    logger.info('Crawler scheduler stopped');
  }

  private generateJobId(api: string, url: string): string {
    const hash = this.simpleHash(url);
    return `${api}-${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

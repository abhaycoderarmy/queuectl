const { fork } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const JSONStorage = require('../storage/JSONStorage');
const JobManager = require('./JobManager');
const RetryManager = require('./RetryManager');
const JobExecutor = require('./JobExecutor');
const { JOB_STATES, WORKERS_FILE } = require('../constants');
const Logger = require('../utils/logger');

/**
 * WorkerManager - Manages worker processes
 */
class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.workersStorage = new JSONStorage(WORKERS_FILE);
    this.jobManager = new JobManager();
    this.retryManager = new RetryManager(this.jobManager);
    this.jobExecutor = new JobExecutor(this.jobManager, this.retryManager);
    this.isShuttingDown = false;
  }

  /**
   * Start worker processes
   */
  async startWorkers(count = 1) {
    Logger.info(`Starting ${count} worker(s)...`);

    for (let i = 0; i < count; i++) {
      await this.startWorker();
    }

    Logger.success(`${count} worker(s) started successfully`);
  }

  /**
   * Start a single worker
   */
  async startWorker() {
    const workerId = uuidv4();
    const worker = {
      id: workerId,
      pid: process.pid,
      status: 'running',
      started_at: new Date().toISOString(),
      jobs_processed: 0
    };

    this.workers.set(workerId, worker);
    await this.saveWorkerState(workerId, worker);

    // Start worker loop
    this.runWorkerLoop(workerId);

    return worker;
  }

  /**
   * Main worker loop
   */
  async runWorkerLoop(workerId) {
    const worker = this.workers.get(workerId);

    while (!this.isShuttingDown && worker.status === 'running') {
      try {
        // Check for retryable jobs first
        const retryableJobs = await this.retryManager.getRetryableJobs();
        for (const job of retryableJobs) {
          await this.retryManager.markForRetry(job.id);
        }

        // Get next pending job
        const job = await this.getNextJob();

        if (job) {
          // Acquire lock on the job
          const locked = await this.tryLockJob(job.id, workerId);

          if (locked) {
            Logger.debug(`Worker ${workerId} processing job ${job.id}`);

            // Execute the job
            await this.jobExecutor.execute(job);

            // Update worker stats
            worker.jobs_processed++;
            await this.saveWorkerState(workerId, worker);
          }
        } else {
          // No jobs available, wait before polling again
          const config = await this.jobManager.getConfig();
          await this.sleep(config.workerPollInterval || 1000);
        }

      } catch (error) {
        Logger.error(`Worker ${workerId} error:`, error);
        await this.sleep(1000);
      }
    }

    // Worker stopped
    await this.removeWorker(workerId);
  }

  /**
   * Get next pending job
   */
  async getNextJob() {
    const pendingJobs = await this.jobManager.getJobsByState(JOB_STATES.PENDING);
    return pendingJobs[0] || null;
  }

  /**
   * Try to acquire lock on a job
   */
  async tryLockJob(jobId, workerId) {
    try {
      // Perform an atomic compare-and-set update to acquire the lock.
      const updated = await this.jobManager.atomicUpdateJob(jobId, (job) => {
        // If job is not pending or already locked, return it unchanged
        if (!job || job.state !== JOB_STATES.PENDING || job.locked_by) {
          return job;
        }

        // Set locked_by and locked_at atomically
        return {
          ...job,
          locked_by: workerId,
          locked_at: new Date().toISOString()
        };
      });

      // Lock acquired only if locked_by equals this workerId
      return updated && updated.locked_by === workerId;
    } catch (error) {
      return false;
    }
  }

  /**
   * Stop all workers gracefully
   */
  async stopWorkers() {
    Logger.info('Stopping all workers gracefully...');
    this.isShuttingDown = true;

    // Wait for current jobs to finish
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.workers.size > 0 && Date.now() - startTime < maxWaitTime) {
      await this.sleep(500);
    }

    // Force stop remaining workers
    for (const [workerId, worker] of this.workers.entries()) {
      await this.removeWorker(workerId);
    }

    Logger.success('All workers stopped');
  }

  /**
   * Remove a worker
   */
  async removeWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = 'stopped';
      worker.stopped_at = new Date().toISOString();
      await this.saveWorkerState(workerId, worker);
      this.workers.delete(workerId);
    }
  }

  /**
   * Get active workers
   */
  async getActiveWorkers() {
    const workers = await this.workersStorage.read();
    return Object.values(workers).filter(w => w.status === 'running');
  }

  /**
   * Save worker state to storage
   */
  async saveWorkerState(workerId, worker) {
    await this.workersStorage.write(workerId, worker);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = async () => {
      if (!this.isShuttingDown) {
        await this.stopWorkers();
        process.exit(0);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

module.exports = WorkerManager;
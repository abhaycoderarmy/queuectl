const { v4: uuidv4 } = require('uuid');
const JobQueue = require('./JobQueue');
const Executor = require('../utils/executor');
const Logger = require('../utils/logger');
const Config = require('./Config');
const fs = require('fs');
const path = require('path');

const WORKERS_FILE = './data/workers.json';

class Worker {
  constructor(workerId) {
    this.workerId = workerId || uuidv4();
    this.jobQueue = new JobQueue();
    this.isRunning = false;
    this.currentJob = null;
  }

  async start() {
    this.isRunning = true;
    Logger.success(`Worker ${this.workerId} started`);
    
    this.registerWorker();

    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());

    while (this.isRunning) {
      try {
        const job = this.jobQueue.getNextJob(this.workerId);
        
        if (job) {
          this.currentJob = job;
          Logger.info(`Worker ${this.workerId} picked up job ${job.id}`);
          await this.processJob(job);
          this.currentJob = null;
        } else {
          // No jobs available, wait before polling again
          await this.sleep(Config.get('WORKER_POLL_INTERVAL'));
        }
      } catch (error) {
        Logger.error(`Worker error: ${error.message}`);
        await this.sleep(Config.get('WORKER_POLL_INTERVAL'));
      }
    }

    this.unregisterWorker();
    Logger.info(`Worker ${this.workerId} stopped`);
  }

  async processJob(job) {
    try {
      Logger.info(`Executing: ${job.command}`);
      const result = await Executor.execute(job.command, Config.get('JOB_TIMEOUT'));

      if (result.success) {
        this.jobQueue.updateJobSuccess(job.id, result.stdout || result.stderr);
        Logger.success(`Job ${job.id} completed successfully`);
      } else {
        const errorMsg = result.stderr || `Command failed with exit code ${result.exitCode}`;
        this.jobQueue.updateJobFailure(job.id, errorMsg);
        Logger.warning(`Job ${job.id} failed: ${errorMsg}`);
      }
    } catch (error) {
      this.jobQueue.updateJobFailure(job.id, error.message);
      Logger.error(`Job ${job.id} error: ${error.message}`);
    }
  }

  gracefulShutdown() {
    Logger.warning('Received shutdown signal...');
    this.isRunning = false;

    if (this.currentJob) {
      Logger.info(`Waiting for current job ${this.currentJob.id} to complete...`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  registerWorker() {
    const workers = this.loadWorkers();
    workers[this.workerId] = {
      id: this.workerId,
      pid: process.pid,
      startedAt: new Date().toISOString()
    };
    this.saveWorkers(workers);
  }

  unregisterWorker() {
    const workers = this.loadWorkers();
    delete workers[this.workerId];
    this.saveWorkers(workers);
  }

  loadWorkers() {
    try {
      if (fs.existsSync(WORKERS_FILE)) {
        return JSON.parse(fs.readFileSync(WORKERS_FILE, 'utf8'));
      }
    } catch (error) {
      Logger.debug(`Error loading workers: ${error.message}`);
    }
    return {};
  }

  saveWorkers(workers) {
    try {
      const dir = path.dirname(WORKERS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(WORKERS_FILE, JSON.stringify(workers, null, 2));
    } catch (error) {
      Logger.debug(`Error saving workers: ${error.message}`);
    }
  }

  static getActiveWorkers() {
    try {
      if (fs.existsSync(WORKERS_FILE)) {
        return JSON.parse(fs.readFileSync(WORKERS_FILE, 'utf8'));
      }
    } catch (error) {
      return {};
    }
    return {};
  }

  static stopAllWorkers() {
    const workers = Worker.getActiveWorkers();
    let stoppedCount = 0;

    for (const workerId in workers) {
      const worker = workers[workerId];
      try {
        process.kill(worker.pid, 'SIGTERM');
        stoppedCount++;
      } catch (error) {
        Logger.debug(`Could not stop worker ${workerId}: ${error.message}`);
      }
    }

    // Clear workers file
    try {
      fs.writeFileSync(WORKERS_FILE, JSON.stringify({}));
    } catch (error) {
      Logger.debug(`Error clearing workers file: ${error.message}`);
    }

    return stoppedCount;
  }
}

module.exports = Worker;
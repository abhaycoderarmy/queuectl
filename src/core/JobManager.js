const { v4: uuidv4 } = require('uuid');
const JSONStorage = require('../storage/JSONStorage');
const { JOB_STATES, JOBS_FILE, DLQ_FILE, CONFIG_FILE, DEFAULT_CONFIG } = require('../constants');
const Logger = require('../utils/logger');
const Validators = require('../utils/validators');

/**
 * JobManager - Core job lifecycle management
 */
class JobManager {
  constructor() {
    this.jobsStorage = new JSONStorage(JOBS_FILE);
    this.dlqStorage = new JSONStorage(DLQ_FILE);
    this.configStorage = new JSONStorage(CONFIG_FILE);
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      // Read config directly to avoid recursion (getConfig calls initialize)
      const config = await this.configStorage.read('config');
      if (!config || !config.maxRetries) {
        await this.configStorage.write('config', DEFAULT_CONFIG);
      }
      this.initialized = true;
    }
  }

  async createJob(jobData) {
    await this.initialize();
    
    const validation = Validators.validateJobPayload(jobData);
    if (!validation.valid) {
      throw new Error(`Invalid job: ${validation.errors.join(', ')}`);
    }

    const config = await this.getConfig();
    const now = new Date().toISOString();

    const job = {
      id: jobData.id || uuidv4(),
      command: jobData.command,
      state: JOB_STATES.PENDING,
      attempts: 0,
      max_retries: jobData.max_retries !== undefined ? jobData.max_retries : config.maxRetries,
      created_at: now,
      updated_at: now,
      last_error: null,
      output: null
    };

    await this.jobsStorage.write(job.id, job);
    return job;
  }

  async getJob(jobId) {
    await this.initialize();
    return await this.jobsStorage.read(jobId);
  }

  async getAllJobs() {
    await this.initialize();
    const jobs = await this.jobsStorage.read();
    return Object.values(jobs);
  }

  async getJobsByState(state) {
    const jobs = await this.getAllJobs();
    return jobs.filter(job => job.state === state);
  }

  async updateJob(jobId, updates) {
    await this.initialize();
    return await this.jobsStorage.update(jobId, (job) => {
      if (!job) throw new Error(`Job ${jobId} not found`);
      return {
        ...job,
        ...updates,
        updated_at: new Date().toISOString()
      };
    });
  }

  /**
   * atomicUpdateJob - perform an atomic update using an updater function
   * The updater function receives the current job and should return the new job object.
   */
  async atomicUpdateJob(jobId, updaterFn) {
    await this.initialize();
    return await this.jobsStorage.update(jobId, (job) => {
      if (!job) throw new Error(`Job ${jobId} not found`);
      const updated = updaterFn(job);
      return {
        ...updated,
        updated_at: new Date().toISOString()
      };
    });
  }

  async deleteJob(jobId) {
    await this.initialize();
    await this.jobsStorage.delete(jobId);
  }

  async moveToDLQ(job, reason) {
    await this.initialize();
    const dlqEntry = {
      ...job,
      state: JOB_STATES.DEAD,
      dlq_reason: reason,
      moved_to_dlq_at: new Date().toISOString()
    };

    await this.dlqStorage.write(job.id, dlqEntry);
    await this.deleteJob(job.id);
    
    Logger.warn(`Job ${job.id} moved to DLQ: ${reason}`);
    return dlqEntry;
  }

  async getDLQJobs() {
    await this.initialize();
    const dlq = await this.dlqStorage.read();
    return Object.values(dlq);
  }

  async retryFromDLQ(jobId) {
    await this.initialize();
    const dlqJob = await this.dlqStorage.read(jobId);
    
    if (!dlqJob) {
      throw new Error(`Job ${jobId} not found in DLQ`);
    }

    const retriedJob = {
      ...dlqJob,
      state: JOB_STATES.PENDING,
      attempts: 0,
      last_error: null,
      updated_at: new Date().toISOString()
    };

    await this.jobsStorage.write(jobId, retriedJob);
    await this.dlqStorage.delete(jobId);
    
    Logger.success(`Job ${jobId} moved from DLQ back to queue`);
    return retriedJob;
  }

  async getConfig() {
    await this.initialize();
    const config = await this.configStorage.read('config');
    return config || DEFAULT_CONFIG;
  }

  async updateConfig(updates) {
    await this.initialize();
    const config = await this.getConfig();
    const newConfig = { ...config, ...updates };
    await this.configStorage.write('config', newConfig);
    return newConfig;
  }

  async getStats() {
    await this.initialize();
    const jobs = await this.getAllJobs();
    const dlqJobs = await this.getDLQJobs();

    const stats = {
      total: jobs.length,
      pending: jobs.filter(j => j.state === JOB_STATES.PENDING).length,
      processing: jobs.filter(j => j.state === JOB_STATES.PROCESSING).length,
      completed: jobs.filter(j => j.state === JOB_STATES.COMPLETED).length,
      failed: jobs.filter(j => j.state === JOB_STATES.FAILED).length,
      dead: dlqJobs.length
    };

    return stats;
  }
}

module.exports = JobManager;
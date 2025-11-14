const { JOB_STATES } = require('../constants');
const Logger = require('../utils/logger');

/**
 * RetryManager - Handles job retry logic with exponential backoff
 */
class RetryManager {
  constructor(jobManager) {
    this.jobManager = jobManager;
  }

  /**
   * Calculate exponential backoff delay
   * Formula: delay = base ^ attempts (in seconds)
   */
  calculateBackoff(attempts, backoffBase = 2) {
    const delaySeconds = Math.pow(backoffBase, attempts);
    return delaySeconds * 1000; // Convert to milliseconds
  }

  /**
   * Check if a job should be retried
   */
  shouldRetry(job) {
    return job.attempts < job.max_retries;
  }

  /**
   * Schedule a job for retry with exponential backoff
   */
  async scheduleRetry(job, error) {
    if (this.shouldRetry(job)) {
      const config = await this.jobManager.getConfig();
      const delay = this.calculateBackoff(job.attempts, config.backoffBase);
      const retryAt = new Date(Date.now() + delay).toISOString();

      await this.jobManager.updateJob(job.id, {
        state: JOB_STATES.FAILED,
        last_error: error.message || String(error),
        retry_at: retryAt
      });

      Logger.warn(`Job ${job.id} will retry in ${delay / 1000}s (attempt ${job.attempts}/${job.max_retries})`);
      return true;
    } else {
      // Move to DLQ
      await this.jobManager.moveToDLQ(job, `Max retries (${job.max_retries}) exceeded`);
      return false;
    }
  }

  /**
   * Get jobs that are ready to be retried
   */
  async getRetryableJobs() {
    const failedJobs = await this.jobManager.getJobsByState(JOB_STATES.FAILED);
    const now = Date.now();

    return failedJobs.filter(job => {
      if (!job.retry_at) return false;
      return new Date(job.retry_at).getTime() <= now;
    });
  }

  /**
   * Mark job as ready for retry
   */
  async markForRetry(jobId) {
    const job = await this.jobManager.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.state !== JOB_STATES.FAILED) {
      throw new Error(`Job ${jobId} is not in failed state`);
    }

    await this.jobManager.updateJob(jobId, {
      state: JOB_STATES.PENDING,
      retry_at: null
    });

    Logger.info(`Job ${jobId} marked for retry`);
  }
}

module.exports = RetryManager;
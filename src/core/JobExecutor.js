const { exec } = require('child_process');
const { promisify } = require('util');
const { JOB_STATES } = require('../constants');
const Logger = require('../utils/logger');

const execAsync = promisify(exec);

/**
 * JobExecutor - Executes shell commands for jobs
 */
class JobExecutor {
  constructor(jobManager, retryManager) {
    this.jobManager = jobManager;
    this.retryManager = retryManager;
  }

  /**
   * Execute a job's command
   */
  async execute(job) {
    Logger.info(`Executing job ${job.id}: ${job.command}`);

    try {
      // Update job state to processing
      await this.jobManager.updateJob(job.id, {
        state: JOB_STATES.PROCESSING,
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1
      });

      // Execute the command with timeout
      const config = await this.jobManager.getConfig();
      const { stdout, stderr } = await this.executeWithTimeout(
        job.command,
        config.jobTimeout || 300000
      );

      // Mark as completed
      await this.jobManager.updateJob(job.id, {
        state: JOB_STATES.COMPLETED,
        output: stdout || stderr,
        completed_at: new Date().toISOString()
      });

      Logger.success(`Job ${job.id} completed successfully`);
      return { success: true, output: stdout };

    } catch (error) {
      Logger.error(`Job ${job.id} failed:`, error);

      // Get updated job (with incremented attempts)
      const updatedJob = await this.jobManager.getJob(job.id);

      // Schedule retry or move to DLQ
      await this.retryManager.scheduleRetry(updatedJob, error);

      return { success: false, error: error.message };
    }
  }

  /**
   * Execute command with timeout
   */
  async executeWithTimeout(command, timeout) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      try {
        const result = await execAsync(command, {
          timeout,
          maxBuffer: 1024 * 1024 * 10 // 10MB
        });
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Validate if command is safe to execute
   */
  validateCommand(command) {
    if (!command || typeof command !== 'string') {
      throw new Error('Invalid command');
    }

    // Add any additional validation rules here
    // For example, blocking dangerous commands
    const dangerousPatterns = [
      'rm -rf /',
      'mkfs',
      ':(){:|:&};:' // fork bomb
    ];

    for (const pattern of dangerousPatterns) {
      if (command.includes(pattern)) {
        throw new Error(`Dangerous command detected: ${pattern}`);
      }
    }

    return true;
  }
}

module.exports = JobExecutor;
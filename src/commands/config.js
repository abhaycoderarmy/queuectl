const JobManager = require('../core/JobManager');
const Logger = require('../utils/logger');
const chalk = require('chalk');

async function setConfig(key, value) {
  try {
    const jobManager = new JobManager();

    // Validate and convert value
    const configUpdates = {};
    
    switch (key) {
      case 'max-retries':
      case 'maxRetries':
        const retries = parseInt(value);
        if (isNaN(retries) || retries < 0) {
          Logger.error('max-retries must be a non-negative integer');
          process.exit(1);
        }
        configUpdates.maxRetries = retries;
        break;

      case 'backoff-base':
      case 'backoffBase':
        const base = parseFloat(value);
        if (isNaN(base) || base <= 1) {
          Logger.error('backoff-base must be greater than 1');
          process.exit(1);
        }
        configUpdates.backoffBase = base;
        break;

      case 'poll-interval':
      case 'workerPollInterval':
        const interval = parseInt(value);
        if (isNaN(interval) || interval < 100) {
          Logger.error('poll-interval must be at least 100ms');
          process.exit(1);
        }
        configUpdates.workerPollInterval = interval;
        break;

      case 'job-timeout':
      case 'jobTimeout':
        const timeout = parseInt(value);
        if (isNaN(timeout) || timeout < 1000) {
          Logger.error('job-timeout must be at least 1000ms');
          process.exit(1);
        }
        configUpdates.jobTimeout = timeout;
        break;

      default:
        Logger.error(`Unknown configuration key: ${key}`);
        Logger.info('Valid keys: max-retries, backoff-base, poll-interval, job-timeout');
        process.exit(1);
    }

    const newConfig = await jobManager.updateConfig(configUpdates);
    
    Logger.success('Configuration updated successfully');
    await showConfig();

  } catch (error) {
    Logger.error('Failed to update configuration:', error);
    process.exit(1);
  }
}

async function showConfig() {
  try {
    const jobManager = new JobManager();
    const config = await jobManager.getConfig();

    console.log(chalk.bold.cyan('\n⚙️  Current Configuration\n'));
    console.log(`Max Retries:      ${config.maxRetries}`);
    console.log(`Backoff Base:     ${config.backoffBase}`);
    console.log(`Poll Interval:    ${config.workerPollInterval}ms`);
    console.log(`Job Timeout:      ${config.jobTimeout / 1000}s`);
    console.log('');

  } catch (error) {
    Logger.error('Failed to get configuration:', error);
    process.exit(1);
  }
}

module.exports = {
  setConfig,
  showConfig
};
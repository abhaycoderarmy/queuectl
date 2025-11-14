const JobManager = require('../core/JobManager');
const Logger = require('../utils/logger');
const chalk = require('chalk');
const Validators = require('../utils/validators');

async function listCommand(options) {
  try {
    const jobManager = new JobManager();
    let jobs;

    if (options.state) {
      // Validate state
      if (!Validators.validateJobState(options.state)) {
        Logger.error(`Invalid state: ${options.state}`);
        Logger.info('Valid states: pending, processing, completed, failed, dead');
        process.exit(1);
      }
      jobs = await jobManager.getJobsByState(options.state);
    } else {
      jobs = await jobManager.getAllJobs();
    }

    if (jobs.length === 0) {
      Logger.info('No jobs found');
      return;
    }

    console.log(chalk.bold.cyan(`\n📋 Jobs ${options.state ? `(${options.state})` : ''}\n`));

    // Display jobs in a formatted table
    jobs.forEach(job => {
      const stateColor = getStateColor(job.state);
      console.log(chalk.bold(`ID: ${job.id}`));
      console.log(`  Command:    ${job.command}`);
      console.log(`  State:      ${stateColor(job.state)}`);
      console.log(`  Attempts:   ${job.attempts}/${job.max_retries}`);
      console.log(`  Created:    ${new Date(job.created_at).toLocaleString()}`);
      
      if (job.last_error) {
        console.log(chalk.red(`  Error:      ${job.last_error}`));
      }
      
      if (job.output) {
        console.log(chalk.gray(`  Output:     ${job.output.substring(0, 100)}${job.output.length > 100 ? '...' : ''}`));
      }
      
      if (job.retry_at) {
        const retryTime = new Date(job.retry_at);
        const now = new Date();
        const remaining = Math.max(0, Math.floor((retryTime - now) / 1000));
        console.log(chalk.yellow(`  Retry in:   ${remaining}s`));
      }
      
      console.log('');
    });

    console.log(chalk.gray(`Total: ${jobs.length} job(s)\n`));

  } catch (error) {
    Logger.error('Failed to list jobs:', error);
    process.exit(1);
  }
}

function getStateColor(state) {
  const colors = {
    pending: chalk.yellow,
    processing: chalk.blue,
    completed: chalk.green,
    failed: chalk.red,
    dead: chalk.magenta
  };
  return colors[state] || chalk.white;
}

module.exports = listCommand;
const JobManager = require('../core/JobManager');
const WorkerManager = require('../core/WorkerManager');
const Logger = require('../utils/logger');
const chalk = require('chalk');

async function statusCommand() {
  try {
    const jobManager = new JobManager();
    const workerManager = new WorkerManager();

    // Get job statistics
    const stats = await jobManager.getStats();
    
    // Get active workers
    const workers = await workerManager.getActiveWorkers();

    console.log(chalk.bold.cyan('\n📊 Queue Status\n'));
    console.log(chalk.bold('Job Statistics:'));
    console.log(`  Total Jobs:      ${stats.total}`);
    console.log(chalk.yellow(`  Pending:         ${stats.pending}`));
    console.log(chalk.blue(`  Processing:      ${stats.processing}`));
    console.log(chalk.green(`  Completed:       ${stats.completed}`));
    console.log(chalk.red(`  Failed:          ${stats.failed}`));
    console.log(chalk.magenta(`  Dead (DLQ):      ${stats.dead}`));

    console.log(chalk.bold('\n👷 Active Workers:'));
    if (workers.length === 0) {
      console.log(chalk.gray('  No active workers'));
    } else {
      console.log(`  Count:           ${workers.length}`);
      workers.forEach(worker => {
        console.log(`  - Worker ${worker.id.substring(0, 8)}: ${worker.jobs_processed} jobs processed`);
      });
    }

    // Get configuration
    const config = await jobManager.getConfig();
    console.log(chalk.bold('\n⚙️  Configuration:'));
    console.log(`  Max Retries:     ${config.maxRetries}`);
    console.log(`  Backoff Base:    ${config.backoffBase}`);
    console.log(`  Poll Interval:   ${config.workerPollInterval}ms`);
    console.log(`  Job Timeout:     ${config.jobTimeout / 1000}s`);
    console.log('');

  } catch (error) {
    Logger.error('Failed to get status:', error);
    process.exit(1);
  }
}

module.exports = statusCommand;
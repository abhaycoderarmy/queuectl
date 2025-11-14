const JobManager = require('../core/JobManager');
const Logger = require('../utils/logger');
const chalk = require('chalk');

async function listDLQ() {
  try {
    const jobManager = new JobManager();
    const dlqJobs = await jobManager.getDLQJobs();

    if (dlqJobs.length === 0) {
      Logger.info('Dead Letter Queue is empty');
      return;
    }

    console.log(chalk.bold.magenta('\n💀 Dead Letter Queue\n'));

    dlqJobs.forEach(job => {
      console.log(chalk.bold(`ID: ${job.id}`));
      console.log(`  Command:      ${job.command}`);
      console.log(`  Attempts:     ${job.attempts}/${job.max_retries}`);
      console.log(chalk.red(`  Reason:       ${job.dlq_reason}`));
      console.log(`  Moved to DLQ: ${new Date(job.moved_to_dlq_at).toLocaleString()}`);
      
      if (job.last_error) {
        console.log(chalk.red(`  Last Error:   ${job.last_error}`));
      }
      
      console.log('');
    });

    console.log(chalk.gray(`Total: ${dlqJobs.length} job(s) in DLQ\n`));

  } catch (error) {
    Logger.error('Failed to list DLQ:', error);
    process.exit(1);
  }
}

async function retryDLQ(jobId) {
  try {
    const jobManager = new JobManager();
    await jobManager.retryFromDLQ(jobId);

    Logger.success(`Job ${jobId} has been moved back to the queue`);
    Logger.info('The job will be processed by the next available worker');

  } catch (error) {
    Logger.error(`Failed to retry job ${jobId}:`, error);
    process.exit(1);
  }
}

module.exports = {
  listDLQ,
  retryDLQ
};
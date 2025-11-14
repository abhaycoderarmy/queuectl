const JobQueue = require('../core/JobQueue');
const Logger = require('../utils/logger');
const chalk = require('chalk');

function listDLQ() {
  const queue = new JobQueue();
  const jobs = queue.getDLQJobs();
  queue.close();

  if (jobs.length === 0) {
    Logger.info('Dead Letter Queue is empty');
    return;
  }

  console.log(chalk.bold('\n💀 Dead Letter Queue\n'));

  const tableData = jobs.map(job => ({
    ID: job.id.substring(0, 12) + '...',
    Command: job.command.substring(0, 30) + (job.command.length > 30 ? '...' : ''),
    Attempts: job.attempts,
    Error: (job.error || '').substring(0, 40) + (job.error && job.error.length > 40 ? '...' : ''),
    Updated: new Date(job.updated_at).toLocaleString()
  }));

  console.table(tableData);
}

function retryDLQ(jobId) {
  const queue = new JobQueue();
  const success = queue.retryDLQJob(jobId);
  queue.close();

  if (success) {
    Logger.success(`Job ${jobId} moved back to pending queue`);
  } else {
    Logger.error(`Job ${jobId} not found in DLQ`);
    process.exit(1);
  }
}

module.exports = {
  listDLQ,
  retryDLQ
};
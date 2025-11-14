const JobQueue = require('../core/JobQueue');
const Logger = require('../utils/logger');
const chalk = require('chalk');

function listCommand(state) {
  const queue = new JobQueue();
  const jobs = queue.listJobs(state);
  queue.close();

  if (jobs.length === 0) {
    Logger.info(`No jobs found${state ? ` with state: ${state}` : ''}`);
    return;
  }

  console.log(chalk.bold(`\n📋 Jobs ${state ? `(${state})` : '(all)'}\n`));

  const tableData = jobs.slice(0, 50).map(job => ({
    ID: job.id.substring(0, 12) + '...',
    Command: job.command.substring(0, 40) + (job.command.length > 40 ? '...' : ''),
    State: getStateColor(job.state),
    Attempts: `${job.attempts}/${job.max_retries}`,
    Created: new Date(job.created_at).toLocaleString()
  }));

  console.table(tableData);

  if (jobs.length > 50) {
    Logger.info(`Showing 50 of ${jobs.length} jobs`);
  }
}

function getStateColor(state) {
  const colors = {
    pending: chalk.yellow(state),
    processing: chalk.blue(state),
    completed: chalk.green(state),
    failed: chalk.red(state),
    dead: chalk.magenta(state)
  };
  return colors[state] || state;
}

module.exports = listCommand;
const JobQueue = require('../core/JobQueue');
const Worker = require('../core/Worker');
const Logger = require('../utils/logger');
const chalk = require('chalk');

function statusCommand() {
  const queue = new JobQueue();
  const stats = queue.getStatistics();
  const workers = Worker.getActiveWorkers();
  queue.close();

  console.log(chalk.bold('\n📊 Queue Status\n'));
  
  console.log(chalk.cyan('Job Statistics:'));
  console.log(`  Pending:    ${chalk.yellow(stats.pending)}`);
  console.log(`  Processing: ${chalk.blue(stats.processing)}`);
  console.log(`  Completed:  ${chalk.green(stats.completed)}`);
  console.log(`  Failed:     ${chalk.red(stats.failed)}`);
  console.log(`  Dead (DLQ): ${chalk.magenta(stats.dead)}`);
  console.log(`  Total:      ${chalk.bold(Object.values(stats).reduce((a, b) => a + b, 0))}`);

  console.log(chalk.cyan('\nActive Workers:'));
  const workerList = Object.values(workers);
  if (workerList.length > 0) {
    workerList.forEach(worker => {
      console.log(`  ${chalk.green('●')} Worker ${worker.id.substring(0, 8)} (PID: ${worker.pid})`);
    });
  } else {
    console.log(`  ${chalk.gray('No active workers')}`);
  }
  
  console.log('');
}

module.exports = statusCommand;
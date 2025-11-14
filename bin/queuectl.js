#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const enqueueCommand = require('../src/commands/enqueue');
const { startWorkers, stopWorkers } = require('../src/commands/worker');
const statusCommand = require('../src/commands/status');
const listCommand = require('../src/commands/list');
const { listDLQ, retryDLQ } = require('../src/commands/dlq');
const { setConfig, showConfig } = require('../src/commands/config');

const program = new Command();

program
  .name('queuectl')
  .description('CLI-based background job queue system with worker management')
  .version('1.0.0');

// Enqueue command
program
  .command('enqueue [job-json]')
  .description('Add a new job to the queue')
  .option('-f, --file <path>', 'Read job JSON from file')
  .action(async (jobJson, options) => {
    try {
      // If --file provided, read the file and use its contents
      if (options && options.file) {
        const filePath = path.resolve(process.cwd(), options.file);
  let content = await fs.readFile(filePath, 'utf8');
  // strip UTF-8 BOM if present
  content = content.replace(/^\uFEFF/, '');
  return enqueueCommand(content);
      }

      // Support shorthand: if jobJson starts with '@', treat the rest as a file path
      if (typeof jobJson === 'string' && jobJson.startsWith('@')) {
        const filePath = path.resolve(process.cwd(), jobJson.slice(1));
  let content = await fs.readFile(filePath, 'utf8');
  // strip UTF-8 BOM if present
  content = content.replace(/^\uFEFF/, '');
  return enqueueCommand(content);
      }

      // Otherwise pass the string directly (existing behavior)
  // strip BOM from inline argument just in case
  if (typeof jobJson === 'string') jobJson = jobJson.replace(/^\uFEFF/, '');
  return enqueueCommand(jobJson);
    } catch (err) {
      console.error(chalk.red('Failed to read job JSON file:'), err.message || err);
      process.exit(1);
    }
  });

// Worker commands
const worker = program
  .command('worker')
  .description('Manage worker processes');

worker
  .command('start')
  .description('Start one or more workers')
  .option('-c, --count <number>', 'Number of workers to start', '1')
  .action(startWorkers);

worker
  .command('stop')
  .description('Stop running workers gracefully')
  .action(stopWorkers);

// Status command
program
  .command('status')
  .description('Show summary of all job states and active workers')
  .action(statusCommand);

// List command
program
  .command('list')
  .description('List jobs by state')
  .option('-s, --state <state>', 'Filter by state (pending, processing, completed, failed, dead)')
  .action(listCommand);

// DLQ commands
const dlq = program
  .command('dlq')
  .description('Manage Dead Letter Queue');

dlq
  .command('list')
  .description('View all jobs in DLQ')
  .action(listDLQ);

dlq
  .command('retry <job-id>')
  .description('Retry a job from DLQ')
  .action(retryDLQ);

// Config commands
const config = program
  .command('config')
  .description('Manage configuration');

config
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(setConfig);

config
  .command('show')
  .description('Show current configuration')
  .action(showConfig);

// Display banner
console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════╗
║                                       ║
║          QueueCTL v1.0.0              ║
║   Job Queue Management System         ║
║                                       ║
╚═══════════════════════════════════════╝
`));

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
#!/usr/bin/env node

const { Command } = require('commander');
const enqueueCommand = require('../src/commands/enqueue');
const { startWorkers, stopWorkers } = require('../src/commands/worker');
const statusCommand = require('../src/commands/status');
const listCommand = require('../src/commands/list');
const { listDLQ, retryDLQ } = require('../src/commands/dlq');
const { setConfig, getConfig } = require('../src/commands/config');

const program = new Command();

program
  .name('queuectl')
  .description('CLI-based background job queue system')
  .version('1.0.0');

// Enqueue command
program
  .command('enqueue <job-json>')
  .description('Add a new job to the queue')
  .action(enqueueCommand);

// Worker commands
const worker = program.command('worker').description('Manage workers');

worker
  .command('start')
  .option('--count <number>', 'Number of workers to start', '1')
  .description('Start one or more workers')
  .action((options) => startWorkers(options.count));

worker
  .command('stop')
  .description('Stop all running workers')
  .action(stopWorkers);

// Status command
program
  .command('status')
  .description('Show queue status and statistics')
  .action(statusCommand);

// List command
program
  .command('list')
  .option('--state <state>', 'Filter by job state (pending, processing, completed, failed, dead)')
  .description('List jobs')
  .action((options) => listCommand(options.state));

// DLQ commands
const dlq = program.command('dlq').description('Manage Dead Letter Queue');

dlq
  .command('list')
  .description('List jobs in Dead Letter Queue')
  .action(listDLQ);

dlq
  .command('retry <job-id>')
  .description('Retry a job from Dead Letter Queue')
  .action(retryDLQ);

// Config commands
const config = program.command('config').description('Manage configuration');

config
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(setConfig);

config
  .command('get [key]')
  .description('Get configuration value(s)')
  .action(getConfig);

program.parse();
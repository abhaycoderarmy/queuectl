const { spawn } = require('child_process');
const Worker = require('../core/Worker');
const Logger = require('../utils/logger');

function startWorkers(count) {
  const numWorkers = parseInt(count) || 1;
  
  if (numWorkers < 1 || numWorkers > 10) {
    Logger.error('Worker count must be between 1 and 10');
    process.exit(1);
  }

  Logger.info(`Starting ${numWorkers} worker(s)...`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = spawn('node', ['-e', `
      const Worker = require('./src/core/Worker');
      const worker = new Worker();
      worker.start();
    `], {
      detached: true,
      stdio: 'inherit',
      cwd: process.cwd()
    });

    worker.unref();
  }

  Logger.success(`${numWorkers} worker(s) started`);
}

function stopWorkers() {
  const stoppedCount = Worker.stopAllWorkers();
  
  if (stoppedCount > 0) {
    Logger.success(`Stopped ${stoppedCount} worker(s)`);
  } else {
    Logger.info('No active workers found');
  }
}

module.exports = {
  startWorkers,
  stopWorkers
};
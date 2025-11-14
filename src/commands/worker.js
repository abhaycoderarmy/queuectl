const WorkerManager = require('../core/WorkerManager');
const Logger = require('../utils/logger');

async function startWorkers(options) {
  try {
    const count = parseInt(options.count) || 1;

    if (count < 1 || count > 10) {
      Logger.error('Worker count must be between 1 and 10');
      process.exit(1);
    }

    const workerManager = new WorkerManager();
    workerManager.setupGracefulShutdown();

    await workerManager.startWorkers(count);

    // Keep process alive
    await new Promise(() => {});

  } catch (error) {
    Logger.error('Failed to start workers:', error);
    process.exit(1);
  }
}

async function stopWorkers() {
  try {
    const workerManager = new WorkerManager();
    await workerManager.stopWorkers();
  } catch (error) {
    Logger.error('Failed to stop workers:', error);
    process.exit(1);
  }
}

module.exports = {
  startWorkers,
  stopWorkers
};
// Job states
const JobState = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DEAD: 'dead'
};

// Default configuration
const DefaultConfig = {
  MAX_RETRIES: 3,
  BACKOFF_BASE: 2,
  WORKER_POLL_INTERVAL: 1000, // ms
  JOB_TIMEOUT: 300000 // 5 minutes
};

// Database paths
const DB_PATH = './data/queuectl.db';
const CONFIG_PATH = './data/config.json';

module.exports = {
  JobState,
  DefaultConfig,
  DB_PATH,
  CONFIG_PATH
};
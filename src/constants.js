const path = require('path');

// Job states
const JOB_STATES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DEAD: 'dead'
};

// File paths
const DATA_DIR = path.join(__dirname, '../data');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const DLQ_FILE = path.join(DATA_DIR, 'dlq.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const WORKERS_FILE = path.join(DATA_DIR, 'workers.json');

// Default configuration
const DEFAULT_CONFIG = {
  maxRetries: 3,
  backoffBase: 2,
  workerPollInterval: 1000, // ms
  jobTimeout: 300000 // 5 minutes
};

// Exit codes
const EXIT_CODES = {
  SUCCESS: 0,
  FAILURE: 1
};

module.exports = {
  JOB_STATES,
  DATA_DIR,
  JOBS_FILE,
  DLQ_FILE,
  CONFIG_FILE,
  WORKERS_FILE,
  DEFAULT_CONFIG,
  EXIT_CODES
};
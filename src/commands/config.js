const Config = require('../core/Config');
const Logger = require('../utils/logger');
const chalk = require('chalk');

function setConfig(key, value) {
  const validKeys = ['MAX_RETRIES', 'BACKOFF_BASE', 'WORKER_POLL_INTERVAL', 'JOB_TIMEOUT'];
  
  const upperKey = key.toUpperCase().replace(/-/g, '_');
  
  if (!validKeys.includes(upperKey)) {
    Logger.error(`Invalid config key. Valid keys: ${validKeys.join(', ')}`);
    process.exit(1);
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    Logger.error('Config value must be a number');
    process.exit(1);
  }

  Config.set(upperKey, numValue);
  Logger.success(`Config updated: ${upperKey} = ${numValue}`);
}

function getConfig(key) {
  if (key) {
    const upperKey = key.toUpperCase().replace(/-/g, '_');
    const value = Config.get(upperKey);
    if (value !== undefined) {
      console.log(`${upperKey}: ${value}`);
    } else {
      Logger.error(`Config key not found: ${upperKey}`);
      process.exit(1);
    }
  } else {
    const config = Config.getAll();
    console.log(chalk.bold('\n⚙️  Configuration\n'));
    for (const [key, value] of Object.entries(config)) {
      console.log(`${chalk.cyan(key)}: ${value}`);
    }
    console.log('');
  }
}

module.exports = {
  setConfig,
  getConfig
};
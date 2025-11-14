const chalk = require('chalk');

class Logger {
  static info(message, data = null) {
    console.log(chalk.blue('ℹ'), message);
    if (data) console.log(data);
  }

  static success(message, data = null) {
    console.log(chalk.green('✓'), message);
    if (data) console.log(data);
  }

  static error(message, error = null) {
    console.error(chalk.red('✗'), message);
    if (error) console.error(chalk.red(error.message || error));
  }

  static warn(message, data = null) {
    console.warn(chalk.yellow('⚠'), message);
    if (data) console.log(data);
  }

  static debug(message, data = null) {
    if (process.env.DEBUG) {
      console.log(chalk.gray('⚙'), message);
      if (data) console.log(data);
    }
  }

  static table(data) {
    console.table(data);
  }

  static json(data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

module.exports = Logger;
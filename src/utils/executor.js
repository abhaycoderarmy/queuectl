const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class Executor {
  static async execute(command, timeout = 300000) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        shell: true,
        maxBuffer: 1024 * 1024 * 10 // 10MB
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error) {
      return {
        success: false,
        stdout: error.stdout ? error.stdout.trim() : '',
        stderr: error.stderr ? error.stderr.trim() : error.message,
        exitCode: error.code || 1
      };
    }
  }
}

module.exports = Executor;
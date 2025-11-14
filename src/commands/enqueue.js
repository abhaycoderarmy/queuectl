const JobQueue = require('../core/JobQueue');
const Logger = require('../utils/logger');

function enqueueCommand(jobJson) {
  try {
    const jobData = JSON.parse(jobJson);
    
    if (!jobData.command) {
      Logger.error('Job must have a "command" field');
      process.exit(1);
    }

    const queue = new JobQueue();
    const job = queue.enqueue(jobData);
    queue.close();

    Logger.success(`Job enqueued successfully`);
    console.log(JSON.stringify(job, null, 2));
  } catch (error) {
    Logger.error(`Failed to enqueue job: ${error.message}`);
    process.exit(1);
  }
}

module.exports = enqueueCommand;
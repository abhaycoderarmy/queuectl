const { v4: uuidv4 } = require('uuid');
const { formatISO } = require('date-fns');
const DatabaseManager = require('./Database');
const { JobState } = require('../constants');
const Config = require('./Config');

class JobQueue {
  constructor() {
    this.dbManager = new DatabaseManager();
    this.db = this.dbManager.db;
  }

  enqueue(jobData) {
    const job = {
      id: jobData.id || uuidv4(),
      command: jobData.command,
      state: JobState.PENDING,
      attempts: 0,
      max_retries: jobData.max_retries || Config.get('MAX_RETRIES'),
      created_at: formatISO(new Date()),
      updated_at: formatISO(new Date())
    };

    const stmt = this.db.prepare(`
      INSERT INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
      VALUES (@id, @command, @state, @attempts, @max_retries, @created_at, @updated_at)
    `);

    stmt.run(job);
    return job;
  }

  getNextJob(workerId) {
    const now = formatISO(new Date());
    
    // Try to get pending job or failed job ready for retry
    const stmt = this.db.prepare(`
      UPDATE jobs
      SET state = @processing,
          worker_id = @workerId,
          started_at = @now,
          updated_at = @now
      WHERE id = (
        SELECT id FROM jobs
        WHERE (state = @pending OR (state = @failed AND (next_retry_at IS NULL OR next_retry_at <= @now)))
        ORDER BY created_at ASC
        LIMIT 1
      )
      RETURNING *
    `);

    try {
      const job = stmt.get({
        processing: JobState.PROCESSING,
        pending: JobState.PENDING,
        failed: JobState.FAILED,
        workerId,
        now
      });
      return job || null;
    } catch (error) {
      return null;
    }
  }

  updateJobSuccess(jobId, output) {
    const stmt = this.db.prepare(`
      UPDATE jobs
      SET state = @completed,
          output = @output,
          completed_at = @now,
          updated_at = @now
      WHERE id = @jobId
    `);

    stmt.run({
      jobId,
      completed: JobState.COMPLETED,
      output,
      now: formatISO(new Date())
    });
  }

  updateJobFailure(jobId, error) {
    const job = this.getJobById(jobId);
    const newAttempts = job.attempts + 1;
    
    if (newAttempts >= job.max_retries) {
      // Move to DLQ
      const stmt = this.db.prepare(`
        UPDATE jobs
        SET state = @dead,
            attempts = @attempts,
            error = @error,
            updated_at = @now
        WHERE id = @jobId
      `);

      stmt.run({
        jobId,
        dead: JobState.DEAD,
        attempts: newAttempts,
        error,
        now: formatISO(new Date())
      });
    } else {
      // Schedule retry with exponential backoff
      const backoffBase = Config.get('BACKOFF_BASE');
      const delaySeconds = Math.pow(backoffBase, newAttempts);
      const nextRetry = new Date(Date.now() + delaySeconds * 1000);

      const stmt = this.db.prepare(`
        UPDATE jobs
        SET state = @failed,
            attempts = @attempts,
            error = @error,
            next_retry_at = @nextRetry,
            worker_id = NULL,
            updated_at = @now
        WHERE id = @jobId
      `);

      stmt.run({
        jobId,
        failed: JobState.FAILED,
        attempts: newAttempts,
        error,
        nextRetry: formatISO(nextRetry),
        now: formatISO(new Date())
      });
    }
  }

  getJobById(jobId) {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
    return stmt.get(jobId);
  }

  listJobs(state = null) {
    let stmt;
    if (state) {
      stmt = this.db.prepare('SELECT * FROM jobs WHERE state = ? ORDER BY created_at DESC');
      return stmt.all(state);
    } else {
      stmt = this.db.prepare('SELECT * FROM jobs ORDER BY created_at DESC');
      return stmt.all();
    }
  }

  getStatistics() {
    const stmt = this.db.prepare(`
      SELECT 
        state,
        COUNT(*) as count
      FROM jobs
      GROUP BY state
    `);

    const results = stmt.all();
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dead: 0
    };

    results.forEach(row => {
      stats[row.state] = row.count;
    });

    return stats;
  }

  getDLQJobs() {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE state = ? ORDER BY updated_at DESC');
    return stmt.all(JobState.DEAD);
  }

  retryDLQJob(jobId) {
    const stmt = this.db.prepare(`
      UPDATE jobs
      SET state = @pending,
          attempts = 0,
          error = NULL,
          next_retry_at = NULL,
          updated_at = @now
      WHERE id = @jobId AND state = @dead
    `);

    const result = stmt.run({
      jobId,
      pending: JobState.PENDING,
      dead: JobState.DEAD,
      now: formatISO(new Date())
    });

    return result.changes > 0;
  }

  close() {
    this.dbManager.close();
  }
}

module.exports = JobQueue;
const JobManager = require('../core/JobManager');
const Logger = require('../utils/logger');

async function enqueueCommand(jobJson) {
  try {
    // normalize and try to parse JSON; if parsing fails, attempt a safe repair
    let payload = typeof jobJson === 'string' ? jobJson.trim() : jobJson;
    // strip BOM if present
    if (typeof payload === 'string') payload = payload.replace(/^\uFEFF/, '');

    let jobData;
    try {
      jobData = JSON.parse(payload);
    } catch (firstErr) {
      // Attempt to repair common PowerShell quoting/stripping issues
      try {
        const repaired = repairPossiblyStrippedJson(payload);
        jobData = JSON.parse(repaired);
        Logger.warn('Input JSON parsed after applying a heuristic repair for PowerShell-style input');
      } catch (repairErr) {
        // rethrow original parse error to keep message accurate
        throw firstErr;
      }
    }
    const jobManager = new JobManager();
    
    const job = await jobManager.createJob(jobData);
    
    Logger.success(`Job enqueued successfully!`);
    Logger.json({
      id: job.id,
      command: job.command,
      state: job.state,
      max_retries: job.max_retries,
      created_at: job.created_at
    });

  } catch (error) {
    Logger.error('Failed to enqueue job:', error);
    process.exit(1);
  }
}

function repairPossiblyStrippedJson(input) {
  if (typeof input !== 'string') return input;
  let s = input.trim();
  // If it already looks like JSON (starts with { or [), proceed
  if (!s.startsWith('{') && !s.startsWith('[')) return s;

  // Replace single quotes with double quotes (common alternative)
  if (s.indexOf("'") !== -1 && s.indexOf('"') === -1) {
    s = s.replace(/'/g, '"');
  }

  // Quote unquoted keys: {id: -> {"id":
  s = s.replace(/([\{,]\s*)([A-Za-z0-9_\-]+)\s*:/g, '$1"$2":');

  // Quote unquoted string values (value stops at comma or closing brace)
  // Avoid quoting values that start with quote, digit, brace, bracket, true, false, null
  s = s.replace(/:\s*([^"\d\{\[\]\},][^,\}]*)/g, function(_, val) {
    const trimmed = val.trim();
    // if boolean/null/number-like, leave as is
    if (/^(true|false|null)$/i.test(trimmed)) return ': ' + trimmed;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return ': ' + trimmed;
    // otherwise quote the string value
    // escape any existing double quotes inside
    const escaped = trimmed.replace(/"/g, '\\"');
    return ': "' + escaped + '"';
  });

  return s;
}

module.exports = enqueueCommand;
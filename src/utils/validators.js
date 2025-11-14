const { JOB_STATES } = require('../constants');

class Validators {
  static validateJobPayload(payload) {
    const errors = [];

    if (!payload.id || typeof payload.id !== 'string') {
      errors.push('Job ID is required and must be a string');
    }

    if (!payload.command || typeof payload.command !== 'string') {
      errors.push('Command is required and must be a string');
    }

    if (payload.max_retries !== undefined && 
        (!Number.isInteger(payload.max_retries) || payload.max_retries < 0)) {
      errors.push('max_retries must be a non-negative integer');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateJobState(state) {
    return Object.values(JOB_STATES).includes(state);
  }

  static validatePositiveInteger(value, fieldName) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${fieldName} must be a positive integer`);
    }
  }
}

module.exports = Validators;
/**
 * Abstract Storage Interface
 * Defines the contract for persistent storage implementations
 */
class Storage {
  async read(key) {
    throw new Error('read() must be implemented');
  }

  async write(key, data) {
    throw new Error('write() must be implemented');
  }

  async update(key, updateFn) {
    throw new Error('update() must be implemented');
  }

  async delete(key) {
    throw new Error('delete() must be implemented');
  }

  async exists(key) {
    throw new Error('exists() must be implemented');
  }
}

module.exports = Storage;
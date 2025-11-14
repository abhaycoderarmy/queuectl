const fs = require('fs').promises;
const path = require('path');
const Storage = require('./Storage');

/**
 * JSON File-based Storage Implementation
 * Thread-safe operations with file locking simulation
 */
class JSONStorage extends Storage {
  constructor(filePath) {
    super();
    this.filePath = filePath;
    this.lockFile = `${filePath}.lock`;
    this.initializeFile();
  }

  async initializeFile() {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      
      try {
        await fs.access(this.filePath);
      } catch {
        await fs.writeFile(this.filePath, JSON.stringify({}), 'utf-8');
      }
    } catch (error) {
      console.error(`Failed to initialize ${this.filePath}:`, error);
    }
  }

  async acquireLock(timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        await fs.writeFile(this.lockFile, process.pid.toString(), { flag: 'wx' });
        return true;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    throw new Error('Failed to acquire lock');
  }

  async releaseLock() {
    try {
      await fs.unlink(this.lockFile);
    } catch (error) {
      // Lock file might not exist
    }
  }

  async read(key = null) {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);
      return key ? data[key] : data;
    } catch (error) {
      return key ? undefined : {};
    }
  }

  async write(key, value) {
    await this.acquireLock();
    try {
      const data = await this.read();
      data[key] = value;
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } finally {
      await this.releaseLock();
    }
  }

  async update(key, updateFn) {
    await this.acquireLock();
    try {
      const data = await this.read();
      data[key] = updateFn(data[key]);
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      return data[key];
    } finally {
      await this.releaseLock();
    }
  }

  async delete(key) {
    await this.acquireLock();
    try {
      const data = await this.read();
      delete data[key];
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } finally {
      await this.releaseLock();
    }
  }

  async exists(key) {
    const data = await this.read();
    return key in data;
  }

  async writeAll(data) {
    await this.acquireLock();
    try {
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } finally {
      await this.releaseLock();
    }
  }
}

module.exports = JSONStorage;
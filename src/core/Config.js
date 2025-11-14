const fs = require('fs');
const path = require('path');
const { DefaultConfig, CONFIG_PATH } = require('../constants');

class Config {
  constructor() {
    this.configPath = CONFIG_PATH;
    this.ensureDataDir();
    this.config = this.load();
  }

  ensureDataDir() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return { ...DefaultConfig, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Error loading config, using defaults:', error.message);
    }
    return { ...DefaultConfig };
  }

  save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving config:', error.message);
      return false;
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.save();
  }

  getAll() {
    return { ...this.config };
  }
}

module.exports = new Config();
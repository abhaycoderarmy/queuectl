# QueueCTL - Background Job Queue System

A production-grade CLI-based background job queue system built with Node.js, featuring worker processes, automatic retries with exponential backoff, and a Dead Letter Queue (DLQ).

## 🎥 Demo Video

[Link to Demo Video](https://drive.google.com/your-demo-video-link)

## ✨ Features

- ✅ **CLI-based Job Queue Management** - Enqueue and manage jobs via command line
- ✅ **Multiple Worker Support** - Run multiple workers in parallel
- ✅ **Automatic Retries** - Failed jobs retry with exponential backoff
- ✅ **Dead Letter Queue** - Permanently failed jobs moved to DLQ for review
- ✅ **Persistent Storage** - SQLite database ensures jobs survive restarts
- ✅ **Configurable Settings** - Adjust retry count, backoff, and timeouts
- ✅ **Graceful Shutdown** - Workers finish current jobs before stopping
- ✅ **Job Locking** - Prevents duplicate processing across workers
- ✅ **Rich CLI Output** - Colored, formatted output for better UX

## 🚀 Quick Start

### Prerequisites

- Node.js 14.x or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/queuectl.git
cd queuectl

# Install dependencies
npm install

# Link the CLI globally (optional)
npm link
```

### Basic Usage

```bash
# Enqueue a job
queuectl enqueue '{"command":"echo Hello World"}'

# Start workers
queuectl worker start --count 3

# Check status
queuectl status

# List jobs
queuectl list --state pending

# Stop workers
queuectl worker stop

# View DLQ
queuectl dlq list

# Retry failed job
queuectl dlq retry <job-id>
```

## 📚 Documentation

### Job Structure

Each job contains the following fields:

```json
{
  "id": "unique-job-id",           // Auto-generated if not provided
  "command": "echo 'Hello'",       // Shell command to execute
  "state": "pending",              // Current job state
  "attempts": 0,                   // Number of execution attempts
  "max_retries": 3,                // Maximum retry attempts
  "created_at": "2025-11-04T10:30:00Z",
  "updated_at": "2025-11-04T10:30:00Z"
}
```

### Job Lifecycle

```
pending → processing → completed ✓
    ↓          ↓
    └── failed ──→ (retry with backoff)
         ↓
    dead (DLQ)
```

### CLI Commands

#### Enqueue Jobs

```bash
# Basic job
queuectl enqueue '{"command":"echo Hello"}'

# With custom ID
queuectl enqueue '{"id":"job123","command":"sleep 5"}'

# With custom retry count
queuectl enqueue '{"command":"curl api.com","max_retries":5}'
```

#### Worker Management

```bash
# Start single worker
queuectl worker start

# Start multiple workers
queuectl worker start --count 5

# Stop all workers
queuectl worker stop
```

#### Monitoring

```bash
# View queue status
queuectl status

# List all jobs
queuectl list

# List by state
queuectl list --state pending
queuectl list --state completed
queuectl list --state failed
```

#### Dead Letter Queue

```bash
# List DLQ jobs
queuectl dlq list

# Retry a specific job
queuectl dlq retry job-id-here
```

#### Configuration

```bash
# View all config
queuectl config get

# Set max retries
queuectl config set max-retries 5

# Set backoff base (exponential)
queuectl config set backoff-base 2

# Set worker poll interval (ms)
queuectl config set worker-poll-interval 2000

# Set job timeout (ms)
queuectl config set job-timeout 60000
```

## 🏗️ Architecture

### Component Overview

```
┌─────────────┐
│   CLI       │  Command-line interface
└──────┬──────┘
       │
┌──────▼──────┐
│  Commands   │  Command handlers
└──────┬──────┘
       │
┌──────▼──────┐
│  JobQueue   │  Queue management logic
└──────┬──────┘
       │
┌──────▼──────┐
│  Database   │  SQLite storage
└─────────────┘

┌─────────────┐
│  Workers    │  Parallel job processors
└──────┬──────┘
       │
┌──────▼──────┐
│  Executor   │  Shell command execution
└─────────────┘
```

### Key Components

1. **Database (SQLite)**
   - Persistent job storage
   - WAL mode for concurrent access
   - Indexed for fast queries

2. **JobQueue**
   - Job enqueuing and retrieval
   - State management
   - Retry logic with exponential backoff
   - DLQ management

3. **Worker**
   - Polls for pending jobs
   - Executes commands via child process
   - Updates job status
   - Graceful shutdown support

4. **Executor**
   - Safe command execution
   - Timeout handling
   - Exit code detection

5. **Config**
   - JSON-based configuration
   - Runtime updates
   - Defaults with overrides

### Retry Mechanism

Failed jobs retry with exponential backoff:

```
delay = backoff_base ^ attempts

Example with base=2:
- Attempt 1 fails → retry after 2¹ = 2 seconds
- Attempt 2 fails → retry after 2² = 4 seconds
- Attempt 3 fails → retry after 2³ = 8 seconds
- After max_retries → moved to DLQ
```

### Concurrency & Locking

- Jobs are locked when picked up by a worker (worker_id assignment)
- Database updates use transactions to prevent race conditions
- Multiple workers can safely process different jobs

## 🧪 Testing

### Run Test Suite

```bash
npm test
```

### Manual Test Scenarios

```bash
# Test 1: Basic job completion
queuectl enqueue '{"command":"echo Test1"}'
queuectl worker start --count 1
sleep 2
queuectl status
queuectl worker stop

# Test 2: Failed job with retry
queuectl enqueue '{"command":"exit 1","max_retries":2}'
queuectl worker start --count 1
sleep 10
queuectl dlq list
queuectl worker stop

# Test 3: Multiple workers
for i in {1..10}; do queuectl enqueue "{\"command\":\"sleep 1\"}"; done
queuectl worker start --count 3
sleep 5
queuectl status
queuectl worker stop

# Test 4: Invalid command
queuectl enqueue '{"command":"nonexistentcmd"}'
queuectl worker start --count 1
sleep 8
queuectl list --state dead
queuectl worker stop

# Test 5: Job persistence (restart test)
queuectl enqueue '{"command":"echo Persistent"}'
# Restart your terminal or machine
queuectl worker start --count 1
sleep 2
queuectl list --state completed
```

## 📊 Configuration Options

| Key | Default | Description |
|-----|---------|-------------|
| MAX_RETRIES | 3 | Maximum retry attempts before DLQ |
| BACKOFF_BASE | 2 | Exponential backoff base (delay = base^attempts) |
| WORKER_POLL_INTERVAL | 1000 | Worker polling interval in milliseconds |
| JOB_TIMEOUT | 300000 | Maximum job execution time (5 minutes) |

## 🔍 Assumptions & Trade-offs

### Assumptions
- Commands are shell-compatible and safe to execute
- SQLite provides sufficient performance for the use case
- Workers run on the same machine as the database
- No job priority system needed initially

### Trade-offs
- **SQLite vs. Redis**: Chose SQLite for simplicity and zero external dependencies
- **Polling vs. Events**: Using polling for simplicity; could use file watchers for better efficiency
- **Single Machine**: Designed for single-machine deployment; would need distributed locking for multi-machine
- **No Job Priority**: All jobs treated equally; could add priority queues as enhancement

## 🌟 Future Enhancements

- [ ] Job priority queues
- [ ] Scheduled/delayed jobs
- [ ] Job output logging to files
- [ ] Metrics and execution statistics
- [ ] Web dashboard for monitoring
- [ ] Webhook notifications on job completion
- [ ] Job dependencies and workflows
- [ ] Rate limiting per job type

## 📝 Project Structure

```
queuectl/
├── bin/
│   └── queuectl.js          # CLI entry point
├── src/
│   ├── core/
│   │   ├── Database.js      # SQLite database management
│   │   ├── JobQueue.js      # Job queue operations
│   │   ├── Worker.js        # Worker process logic
│   │   └── Config.js        # Configuration management
│   ├── commands/
│   │   ├── enqueue.js       # Enqueue command
│   │   ├── worker.js        # Worker commands
│   │   ├── status.js        # Status command
│   │   ├── list.js          # List command
│   │   ├── dlq.js           # DLQ commands
│   │   └── config.js        # Config commands
│   ├── utils/
│   │   ├── logger.js        # Logging utilities
│   │   └── executor.js      # Command executor
│   └── constants.js         # Application constants
├── tests/
│   └── test-scenarios.js    # Test suite
├── data/                    # Database and config files
├── package.json
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Your Name - [GitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- Built for QueueCTL Backend Developer Internship Assignment
- Inspired by production queue systems like Sidekiq, Bull, and BullMQ

---

**Note**: This is a demonstration project built for educational purposes. For production use, consider additional features like authentication, monitoring, and distributed architecture.
# QueueCTL - Job Queue Management System

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-grade CLI-based background job queue system with worker management, automatic retry with exponential backoff, and Dead Letter Queue (DLQ) support.

## 🎬 Demo & Architecture

- Demo video: **[Watch the Demo Video](https://youtu.be/h8cP_wxBPYs?si=BgdR4uv7_SVs9fl1)**
- Demo automation script: `scripts/demo-automation.ps1` (PowerShell demo that enqueues a job, starts a worker, and verifies results)
- Architecture docs: `docs/architecture.md` — design overview and component map

## ✨ Features

- ✅ **CLI-based job queue management** - Full control via command-line interface
- ✅ **Multiple concurrent workers** - Process jobs in parallel
- ✅ **Automatic retry mechanism** - Exponential backoff for failed jobs
- ✅ **Dead Letter Queue (DLQ)** - Handle permanently failed jobs
- ✅ **Persistent storage** - Jobs survive system restarts (JSON-based)
- ✅ **Job locking** - Prevents duplicate processing
- ✅ **Graceful shutdown** - Workers finish current jobs before stopping
- ✅ **Configurable** - Adjust retries, backoff, and timeouts
- ✅ **Comprehensive logging** - Track job lifecycle
- ✅ **Job state tracking** - Monitor pending, processing, completed, failed, and dead jobs

## 📋 Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Commands](#-commands)
- [Architecture](#-architecture)
- [Testing](#-testing)
- [Configuration](#-configuration)
- [Assumptions & Trade-offs](#-assumptions--trade-offs)

## 🚀 Installation

### Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0

### Setup
# QueueCTL — CLI Job Queue (Node.js)

![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)


QueueCTL is a small, production-minded CLI job queue. It supports enqueuing shell commands, running multiple workers, automatic retries with exponential backoff, and a Dead Letter Queue (DLQ). Jobs are persisted to JSON files so state survives restarts.

Quick links
- Installation & usage: below
- Tests: `npm test` (cross-platform Node runner)
- CI: GitHub Actions (runs `npm test`)

## Quick start

Requirements: Node.js >= 14, npm

Clone and install:

```bash
git clone https://github.com/abhaycoderarmy/queuectl.git
cd queuectl
npm install
```

Run locally (no global install required):

```bash
# enqueue a job from JSON file
node ./bin/queuectl.js enqueue -f job.json

# or inline (PowerShell users: see Windows tips below)
node ./bin/queuectl.js enqueue '{"id":"job1","command":"echo Hello"}'

# start 2 workers
node ./bin/queuectl.js worker start --count 2

# status
node ./bin/queuectl.js status
```

Optional: link the CLI globally so you can run `queuectl` directly:

```bash
npm link
queuectl --help
```

## Commands (examples)

- Enqueue job (file): `node ./bin/queuectl.js enqueue -f job.json`
- Enqueue job (inline JSON): `node ./bin/queuectl.js enqueue '{"command":"echo hi"}'`
- Start workers: `node ./bin/queuectl.js worker start --count 3`
- Stop workers: `node ./bin/queuectl.js worker stop`
- List jobs: `node ./bin/queuectl.js list --state pending`
- DLQ list: `node ./bin/queuectl.js dlq list`
- DLQ retry: `node ./bin/queuectl.js dlq retry <job-id>`
- Config set: `node ./bin/queuectl.js config set max-retries 5`

PowerShell notes
- PowerShell may strip or mangle quotes. Use file input (`-f`) when possible.
- You can also use the `@file` shorthand: `node ./bin/queuectl.js enqueue @job.json`.
- The CLI strips UTF-8 BOMs and includes a heuristic repair for common PowerShell quoting issues, but complex JSON should be submitted via a file.

## Testing

Run the cross-platform test suite:

```bash
npm test
```

This executes `tests/test-scenarios.js`, which validates:
- Basic job completion
- Retry/backoff and DLQ
- Multiple workers
- Invalid command handling
- Configuration and DLQ retry

Tests clean up generated files and reset `data/*.json` after running.

## Architecture (overview)

- CLI (`bin/queuectl.js`) — commander-based CLI wiring
- JobManager (`src/core/JobManager.js`) — job lifecycle, persistence API
- WorkerManager (`src/core/WorkerManager.js`) — worker loop, locking
- JobExecutor (`src/core/JobExecutor.js`) — executes shell commands with timeout
- RetryManager (`src/core/RetryManager.js`) — backoff and DLQ handling
- JSONStorage (`src/storage/JSONStorage.js`) — file-based persistence with simple file locking

Jobs are stored under `data/`:

```
data/
├─ jobs.json   # active jobs
├─ dlq.json    # dead letter queue
├─ config.json # configuration
└─ workers.json
```

## Configuration

Defaults are in `src/constants.js`:

```json
{
  "maxRetries": 3,
  "backoffBase": 2,
  "workerPollInterval": 1000,
  "jobTimeout": 300000
}
```

Change via CLI, e.g.:

```
node ./bin/queuectl.js config set max-retries 5
```

Backoff formula: `delay = base ^ attempts` (seconds). Attempts start at 1 when first retried.

## Implementation notes & trade-offs

- Persistence uses JSON files for simplicity — good for demos and small workloads. For production consider Redis or a relational DB.
- Locking is implemented via atomic updates and a `.lock` file to avoid concurrent file writes. Stale locks may require manual cleanup or a TTL enhancement.
- The test runner is Node-based and cross-platform.

## Contributing / Next steps

- Add CI badges and publish a release.
- Replace JSON storage with Redis or SQLite for scale.
- Add metrics or a simple UI for monitoring.




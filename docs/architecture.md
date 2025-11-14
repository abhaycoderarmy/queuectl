# QueueCTL — Architecture Overview

This document briefly describes the architecture and main components of the QueueCTL project. It is intended for reviewers and maintainers to quickly understand the design, data shapes, error modes, and where to extend functionality.

## High-level components

- CLI (entrypoint)
  - `bin/queuectl.js` — wires `commander` commands to handlers under `src/commands`.
  - Commands: `enqueue`, `worker`, `list`, `status`, `dlq`, `config`.

- Commands (user operations)
  - Located in `src/commands/` and convert CLI args into calls to core managers.

- Core managers
  - `src/core/JobManager.js` — CRUD for job records, persistent updates, atomic update helper.
  - `src/core/WorkerManager.js` — worker lifecycle, polling loop, `tryLockJob()` uses atomic update.
  - `src/core/JobExecutor.js` — executes job commands (with timeout), captures stdout/stderr and marks success/failure.
  - `src/core/RetryManager.js` — calculates next `retry_at`, implements exponential backoff and moves jobs to DLQ after max retries.

- Storage
  - `src/storage/JSONStorage.js` — file-based persistence under `data/` with a `.lock` mechanism to avoid concurrent writes. Primary data files: `data/jobs.json`, `data/workers.json`, `data/dlq.json`.

## Data shapes

- Job record (example)

```
{
  "id": "demo-001",
  "command": "echo Hello",
  "state": "completed|pending|processing|dead",
  "attempts": 1,
  "max_retries": 5,
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "last_error": null,
  "output": "...",
  "locked_by": "worker-id",
  "locked_at": "ISO timestamp",
  "started_at": "ISO timestamp",
  "completed_at": "ISO timestamp"
}
```

## Locking & Concurrency

- Locking is implemented via an optimistic atomic update wrapper in `JobManager.atomicUpdateJob(jobId, updaterFn)` which reads the latest job record, applies an updater function, and writes back the change only if the job state/read timestamp hasn't changed. This prevents duplicate processing.

- Storage-level file locking: `JSONStorage` uses a `.lock` file and atomic write semantics to reduce corruption risk on concurrent access.

## Retry strategy

- Retry backoff uses a base (configurable, `backoffBase`) and computes delay as base^attempts (seconds) for subsequent `retry_at` timestamps. After exceeding `max_retries`, jobs are moved to the DLQ.

## Failure modes & mitigations

- Node process restart: job records are persisted in `data/*.json` so state is recovered on restart.
- Stale locks: currently locks are set with timestamps; adding TTL and stale-lock cleanup is a suggested enhancement.
- Command timeouts are enforced in `JobExecutor` to avoid runaway processes.

## Extensibility

- Replace `JSONStorage` with a database-backed storage by implementing the same `read/write/update/delete` interface.
- Add lock TTL reaper in `WorkerManager` to recover from crashed workers.

## Useful files

- `bin/queuectl.js` — CLI entrypoint
- `src/commands/` — CLI handlers
- `src/core/` — Job/Worker/Retry/Executor
- `src/storage/JSONStorage.js` — persistence
- `tests/` — Node-based test runner (`tests/test-scenarios.js`)

---
Generated: Please keep documentation in sync with code if you refactor core behaviors.

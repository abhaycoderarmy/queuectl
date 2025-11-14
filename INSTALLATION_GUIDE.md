# Complete Installation & Usage Guide

## 📦 Step-by-Step Installation

### 1. Create Project Directory

```bash
mkdir queuectl
cd queuectl
```

### 2. Initialize npm Project

```bash
npm init -y
```

### 3. Install Dependencies

```bash
npm install commander chalk uuid
```

### 4. Create Folder Structure

```bash
# Create all directories
mkdir -p bin src/commands src/core src/storage src/utils data tests

# Create data directory placeholder
touch data/.gitkeep
```

### 5. Make bin/queuectl.js Executable

```bash
chmod +x bin/queuectl.js
```

### 6. Link CLI Globally

```bash
npm link
```

## 🎯 Quick Usage Examples

### Example 1: Simple Echo Job

```bash
# Enqueue
queuectl enqueue '{"id":"echo-job","command":"echo Hello from QueueCTL"}'

# Start worker
queuectl worker start --count 1

# Check status (in another terminal)
queuectl status

# View completed jobs
queuectl list --state completed
```

## Windows (PowerShell) Quick Steps

The CLI supports reading job JSON from a file which avoids PowerShell quoting issues. Example PowerShell workflow:

```powershell
cd "C:\path\to\queuectl"
npm install

# Create a job JSON file (use UTF8 encoding)
Set-Content -Path .\job.json -Value '{"id":"echo-job","command":"echo Hello from QueueCTL"}' -Encoding UTF8

# Enqueue using file flag
node .\bin\queuectl.js enqueue -f .\job.json

# Or after npm link
queuectl enqueue -f .\job.json
```

Notes:
- You can also use `node .\\bin\\queuectl.js enqueue @job.json` to pass a file via the `@` shorthand.
- If you prefer inline JSON, use single quotes as the outer wrapper in PowerShell: `node .\\bin\\queuectl.js enqueue '{"command":"echo Hi"}'`.
- The test script `tests/test-scenarios.sh` requires a Bash environment — use Git Bash or WSL to run `npm test` on Windows.

### Example 2: Long Running Job

```bash
# Enqueue 10-second job
queuectl enqueue '{"id":"long-job","command":"sleep 10 && echo Done"}'

# Start worker and monitor
queuectl worker start --count 1

# Check processing status
queuectl list --state processing
```

### Example 3: Failed Job with Retry

```bash
# Configure retry settings
queuectl config set max-retries 3
queuectl config set backoff-base 2

# Enqueue failing job
queuectl enqueue '{"id":"fail-job","command":"exit 1"}'

# Start worker
queuectl worker start --count 1

# Monitor retries (check every few seconds)
queuectl list --state failed

# After max retries, check DLQ
queuectl dlq list
```

### Example 4: Multiple Workers Processing Jobs

```bash
# Enqueue multiple jobs
for i in {1..10}; do
  queuectl enqueue "{\"id\":\"job-$i\",\"command\":\"echo Processing job $i && sleep 2\"}"
done

# Start 3 workers
queuectl worker start --count 3

# Monitor progress
watch -n 1 queuectl status
```

### Example 5: DLQ Management

```bash
# View DLQ
queuectl dlq list

# Retry specific job
queuectl dlq retry fail-job

# Start worker to process
queuectl worker start --count 1
```

## 🔧 Troubleshooting

### Issue: "queuectl: command not found"

**Solution:**
```bash
# Re-link the CLI
cd /path/to/queuectl
npm link

# Or use npx
npx queuectl status
```

### Issue: Workers not processing jobs

**Solution:**
```bash
# Check if jobs are in pending state
queuectl list --state pending

# Restart workers
queuectl worker start --count 1

# Check logs for errors
```

### Issue: Jobs stuck in processing state

**Solution:**
```bash
# Kill existing workers
pkill -f "queuectl worker"

# Clear lock files
rm data/*.lock

# Restart workers
queuectl worker start --count 1
```

### Issue: Permission denied errors

**Solution:**
```bash
# Make bin file executable
chmod +x bin/queuectl.js

# Check data directory permissions
chmod 755 data
```

## 🎬 Recording Demo Video

### Setup for Recording

1. Clear existing data:
```bash
rm data/*.json
```

2. Set up terminal with good colors:
```bash
export TERM=xterm-256color
```

### Demo Script

```bash
# 1. Show help
queuectl --help

# 2. Show initial status
queuectl status

# 3. Enqueue some jobs
queuectl enqueue '{"id":"demo-1","command":"echo Hello World"}'
queuectl enqueue '{"id":"demo-2","command":"sleep 3 && echo Job 2 done"}'
queuectl enqueue '{"id":"demo-3","command":"exit 1","max_retries":2}'

# 4. Show pending jobs
queuectl list --state pending

# 5. Start workers
queuectl worker start --count 2

# (In another terminal window)
# 6. Monitor status
watch -n 1 queuectl status

# 7. List completed jobs
queuectl list --state completed

# 8. Show DLQ
queuectl dlq list

# 9. Retry DLQ job
queuectl dlq retry demo-3

# 10. Show configuration
queuectl config show
```

### Recording Tips

- Use a terminal with at least 120x40 size
- Use clear, contrasting colors
- Speak clearly while demonstrating
- Show each command's output
- Demonstrate error handling
- Show multiple terminal windows
- Total duration: 3-5 minutes

## 📊 Sample Output

### Status Command Output
```
╔═══════════════════════════════════════╗
║                                       ║
║          QueueCTL v1.0.0              ║
║   Job Queue Management System         ║
║                                       ║
╚═══════════════════════════════════════╝

📊 Queue Status

Job Statistics:
  Total Jobs:      10
  Pending:         2
  Processing:      1
  Completed:       6
  Failed:          0
  Dead (DLQ):      1

👷 Active Workers:
  Count:           3
  - Worker 8f2a1b3c: 4 jobs processed
  - Worker 7d9c2e4a: 3 jobs processed
  - Worker 6b8a1f5d: 2 jobs processed

⚙️  Configuration:
  Max Retries:     3
  Backoff Base:    2
  Poll Interval:   1000ms
  Job Timeout:     300s
```

## 🚀 Advanced Usage

### Batch Job Submission

```bash
#!/bin/bash
# batch-jobs.sh

for i in {1..100}; do
  queuectl enqueue "{\"command\":\"./process-data.sh $i\"}"
done
```

### Monitoring Script

```bash
#!/bin/bash
# monitor.sh

while true; do
  clear
  echo "=== Queue Status ==="
  queuectl status
  echo ""
  echo "=== Recent Failures ==="
  queuectl list --state failed | head -20
  sleep 5
done
```

### Job Template

```bash
# Create a job template
cat > job-template.json << EOF
{
  "id": "unique-job-id",
  "command": "your-command-here",
  "max_retries": 3
}
EOF

# Submit using template
queuectl enqueue "$(cat job-template.json)"
```

## 📝 Best Practices

1. **Job IDs**: Use descriptive, unique IDs
2. **Commands**: Test commands locally first
3. **Retries**: Set appropriate retry limits
4. **Workers**: Match worker count to CPU cores
5. **Monitoring**: Regularly check DLQ
6. **Cleanup**: Archive old completed jobs periodically

## 🎓 Next Steps

After installation:

1. ✅ Run the test suite: `npm test`
2. ✅ Try example commands above
3. ✅ Record your demo video
4. ✅ Review the architecture documentation
5. ✅ Customize for your needs

## 🐛 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "EACCES: permission denied" | File permissions | `chmod 755 bin/queuectl.js` |
| "Module not found" | Missing dependencies | `npm install` |
| "Failed to acquire lock" | Stale lock file | `rm data/*.lock` |
| "Command not found: queuectl" | Not linked | `npm link` |

## 📞 Need Help?

- Check the main README.md
- Review test-scenarios.sh for examples
- Inspect data/*.json files for state
- Enable debug mode: `DEBUG=true queuectl status`
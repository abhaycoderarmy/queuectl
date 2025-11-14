<#
Demo automation script for queuectl (PowerShell)
- Creates a demo job JSON file (job-demo.json)
- Starts a background worker job
- Enqueues the demo job from file
- Polls status until completion or timeout
- Prints job list and status
- Stops the background worker and optionally cleans up files

Usage: From repo root (this script assumes relative paths):
    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\demo-automation.ps1
#>

# Ensure script dir and set repository root as working directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
# repository root is parent of the scripts folder
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
Set-Location $repoRoot
Write-Host "Working directory:" (Get-Location)

# Parameters
$jobFile = ".\job-demo.json"
$jobId = "demo-001"
$workerTimeoutSeconds = 30
$pollIntervalSeconds = 1
$cleanup = $true  # set to $false if you don't want cleanup

# Create demo job file (UTF8 without BOM)
$jobJson = @'
{
  "id": "demo-001",
  "command": "echo Hello from queuectl",
  "meta": { "demo": true }
}
'@
$jobJson | Out-File -FilePath $jobFile -Encoding utf8
Write-Host "Created demo job file:" $jobFile

# Start the worker as a background job
Write-Host "Starting worker in background job..."
$workerJob = Start-Job -Name "queuectl-worker" -ScriptBlock {
    # set working dir for the background job and run the worker
    Set-Location $using:repoRoot
    Write-Output "[worker] starting (background job)"
    node .\bin\queuectl.js worker start
}
Start-Sleep -Seconds 1
Write-Host "Worker job started (Id=$($workerJob.Id)). Giving it a moment to initialize..."

# Enqueue the job from the file
Write-Host "Enqueueing job from file: $jobFile"
$enqueueResult = node .\bin\queuectl.js enqueue -f $jobFile 2>&1
Write-Host $enqueueResult

# Poll status until completed or timeout
$elapsed = 0
$completed = $false
Write-Host "Waiting up to $workerTimeoutSeconds seconds for job $jobId to complete..."
while ($elapsed -lt $workerTimeoutSeconds) {
    Start-Sleep -Seconds $pollIntervalSeconds
    $elapsed += $pollIntervalSeconds

    $statusOutput = node .\bin\queuectl.js status $jobId 2>&1
    Write-Host "[status check]" $statusOutput

    if ($statusOutput -match "completed") {
        $completed = $true
        break
    }
    if ($statusOutput -match "failed|error") {
        # detect failures
        break
    }
}

if ($completed) {
    Write-Host "Job $jobId completed successfully."
} else {
    Write-Host "Job not completed within timeout (elapsed: $elapsed s). Check worker output."
}

# Show list and dlq
Write-Host "\n--- Jobs list ---"
node .\bin\queuectl.js list
Write-Host "\n--- Job status ---"
node .\bin\queuectl.js status $jobId
Write-Host "\n--- DLQ list ---"
node .\bin\queuectl.js dlq list

# Stop and remove the background worker job if it's still running
$jobState = (Get-Job -Name "queuectl-worker" -ErrorAction SilentlyContinue)
if ($null -ne $jobState) {
    Write-Host "Stopping background worker job (Id=$($jobState.Id))..."
    Stop-Job -Job $jobState -ErrorAction SilentlyContinue
    Remove-Job -Job $jobState -ErrorAction SilentlyContinue
    Write-Host "Worker job stopped and removed."
}

# Optional cleanup
if ($cleanup) {
    Write-Host "Cleaning up demo file and (optionally) data file modifications..."
    if (Test-Path $jobFile) { Remove-Item $jobFile -Force }

    # Reset data files carefully (overwrite jobs/dlq/workers). Uncomment if you want to reset all data.
    # Write-Host "Resetting data files (jobs.json, dlq.json, workers.json)..."
    # @'{ "jobs":[], "workers":[], "dlq": [] }'@ | Out-File -FilePath .\data\jobs.json -Encoding utf8
    # @'{ "workers": [] }'@ | Out-File -FilePath .\data\workers.json -Encoding utf8
    # @'{ "dlq": [] }'@ | Out-File -FilePath .\data\dlq.json -Encoding utf8

    Write-Host "Cleanup complete."
}

Write-Host "Demo script finished."

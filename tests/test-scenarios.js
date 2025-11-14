const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BIN = 'node';
const CLI_PATH = path.join(__dirname, '..', 'bin', 'queuectl.js');

function run(args, opts = {}) {
  const res = spawnSync(BIN, [CLI_PATH, ...args], { encoding: 'utf8', ...opts });
  return { code: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

function startWorker(count = 1) {
  const child = spawn(BIN, [CLI_PATH, 'worker', 'start', '--count', String(count)], {
    stdio: 'inherit'
  });
  return child;
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runTests() {
  console.log('🧪 Running QueueCTL Test Scenarios (Node runner)...');

  let passed = 0;
  let failed = 0;

  function ok(name) { console.log('\x1b[32m✓\x1b[0m', name); passed++; }
  function no(name) { console.log('\x1b[31m✗\x1b[0m', name); failed++; }

  // Helper to write job files
  function writeJobFile(filename, obj) {
    const p = path.join(__dirname, filename);
    fs.writeFileSync(p, JSON.stringify(obj), 'utf8');
    return p;
  }

  // Test 1: Basic Job Completion
  console.log('\n=== Test 1: Basic Job Completion ===');
  const job1 = { id: 'test-1', command: 'echo Hello World' };
  const job1File = writeJobFile('job-test-1.json', job1);
  run(['enqueue', '-f', job1File]);
  await sleep(1000);
  const worker1 = startWorker(1);
  await sleep(3000);
  worker1.kill();
  await sleep(500);
  const res1 = run(['list', '--state', 'completed']);
  if (res1.stdout.includes('test-1')) ok('Basic job completed successfully'); else no('Basic job did not complete');

  // Test 2: Failed Job with Retry
  console.log('\n=== Test 2: Failed Job with Retry ===');
  const job2 = { id: 'test-2', command: 'node -e "process.exit(1)"', max_retries: 2 };
  const job2File = writeJobFile('job-test-2.json', job2);
  run(['enqueue', '-f', job2File]);
  await sleep(1000);
  const worker2 = startWorker(1);
  await sleep(5000);
  worker2.kill();
  await sleep(500);
  const dlqList = run(['dlq', 'list']);
  if (dlqList.stdout.includes('test-2')) ok('Failed job moved to DLQ after retries'); else no('Failed job not in DLQ');

  // Test 3: Multiple Workers
  console.log('\n=== Test 3: Multiple Workers ===');
  const jobs3 = [
    { id: 'test-3a', command: 'node -e "setTimeout(()=>console.log(\'A\'),1000)"' },
    { id: 'test-3b', command: 'node -e "setTimeout(()=>console.log(\'B\'),1000)"' },
    { id: 'test-3c', command: 'node -e "setTimeout(()=>console.log(\'C\'),1000)"' }
  ];
  jobs3.forEach((j, i) => {
    const p = writeJobFile(`job-test-3-${i}.json`, j);
    run(['enqueue', '-f', p]);
  });
  await sleep(1000);
  const worker3 = startWorker(3);
  await sleep(4000);
  worker3.kill();
  await sleep(500);
  const completed3 = run(['list', '--state', 'completed']);
  const cCount = (completed3.stdout.match(/test-3/g) || []).length;
  if (cCount === 3) ok('Multiple workers processed jobs successfully'); else no(`Multiple workers test failed (completed: ${cCount}/3)`);

  // Test 4: Invalid Command
  console.log('\n=== Test 4: Invalid Command ===');
  const job4 = { id: 'test-4', command: 'nonexistent_command_xyz', max_retries: 1 };
  const job4File = writeJobFile('job-test-4.json', job4);
  run(['enqueue', '-f', job4File]);
  await sleep(1000);
  const worker4 = startWorker(1);
  await sleep(4000);
  worker4.kill();
  await sleep(500);
  const dlq4 = run(['dlq', 'list']);
  if (dlq4.stdout.includes('test-4')) ok('Invalid command handled gracefully'); else no('Invalid command not handled properly');

  // Test 5: Configuration
  console.log('\n=== Test 5: Configuration ===');
  run(['config', 'set', 'max-retries', '5']);
  run(['config', 'set', 'backoff-base', '3']);
  const conf = run(['config', 'show']);
  if (conf.stdout.includes('Max Retries') && conf.stdout.includes('5')) ok('Configuration set successfully'); else no('Configuration not set');

  // Test 6: DLQ Retry
  console.log('\n=== Test 6: DLQ Retry ===');
  run(['dlq', 'retry', 'test-2']);
  await sleep(1000);
  const pending = run(['list', '--state', 'pending']);
  if (pending.stdout.includes('test-2')) ok('DLQ retry moved job back to queue'); else no('DLQ retry failed');

  // Test 7: Status Command
  console.log('\n=== Test 7: Status Command ===');
  const status = run(['status']);
  if (status.stdout.includes('Queue Status')) ok('Status command works'); else no('Status command failed');

  // Summary
  console.log('\n================================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('================================');

  // Cleanup generated test job files and reset data files
  try {
    const testFiles = fs.readdirSync(__dirname).filter(f => f.startsWith('job-test-') && f.endsWith('.json'));
    for (const f of testFiles) {
      fs.unlinkSync(path.join(__dirname, f));
    }

    const dataDir = path.join(__dirname, '..', 'data');
    const resetFiles = ['jobs.json', 'dlq.json', 'workers.json'];
    for (const rf of resetFiles) {
      const p = path.join(dataDir, rf);
      try {
        fs.writeFileSync(p, JSON.stringify({}, null, 2), 'utf8');
      } catch (e) {
        // ignore
      }
    }
  } catch (cleanupErr) {
    console.error('Cleanup error:', cleanupErr);
  }

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(2);
});

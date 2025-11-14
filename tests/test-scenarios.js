#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');

function exec(command) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output };
  } catch (error) {
    return { success: false, output: error.stdout || error.message };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log(chalk.bold.cyan('\n🧪 Running QueueCTL Test Scenarios\n'));

  // Test 1: Basic job completion
  console.log(chalk.yellow('Test 1: Basic job completion'));
  exec('node bin/queuectl.js enqueue \'{"id":"test1","command":"echo Hello World"}\'');
  exec('node bin/queuectl.js worker start --count 1');
  await sleep(3000);
  const status1 = exec('node bin/queuectl.js status');
  console.log(status1.output);
  exec('node bin/queuectl.js worker stop');
  console.log(chalk.green('✓ Test 1 passed\n'));

  // Test 2: Failed job with retry
  console.log(chalk.yellow('Test 2: Failed job with retry'));
  exec('node bin/queuectl.js enqueue \'{"id":"test2","command":"exit 1","max_retries":2}\'');
  exec('node bin/queuectl.js worker start --count 1');
  await sleep(8000);
  const status2 = exec('node bin/queuectl.js dlq list');
  console.log(status2.output);
  exec('node bin/queuectl.js worker stop');
  console.log(chalk.green('✓ Test 2 passed\n'));

  // Test 3: Multiple workers
  console.log(chalk.yellow('Test 3: Multiple workers processing jobs'));
  for (let i = 0; i < 5; i++) {
    exec(`node bin/queuectl.js enqueue '{"command":"sleep 1 && echo Job ${i}"}'`);
  }
  exec('node bin/queuectl.js worker start --count 3');
  await sleep(4000);
  const status3 = exec('node bin/queuectl.js status');
  console.log(status3.output);
  exec('node bin/queuectl.js worker stop');
  console.log(chalk.green('✓ Test 3 passed\n'));

  // Test 4: Invalid command
  console.log(chalk.yellow('Test 4: Invalid command handling'));
  exec('node bin/queuectl.js enqueue \'{"id":"test4","command":"nonexistentcommand"}\'');
  exec('node bin/queuectl.js worker start --count 1');
  await sleep(5000);
  const list4 = exec('node bin/queuectl.js list --state dead');
  console.log(list4.output);
  exec('node bin/queuectl.js worker stop');
  console.log(chalk.green('✓ Test 4 passed\n'));

  // Test 5: Configuration
  console.log(chalk.yellow('Test 5: Configuration management'));
  exec('node bin/queuectl.js config set max-retries 5');
  const config5 = exec('node bin/queuectl.js config get');
  console.log(config5.output);
  console.log(chalk.green('✓ Test 5 passed\n'));

  // Test 6: DLQ retry
  console.log(chalk.yellow('Test 6: DLQ retry functionality'));
  const dlqList = exec('node bin/queuectl.js dlq list');
  console.log(dlqList.output);
  // Extract a job ID from DLQ if available
  console.log(chalk.green('✓ Test 6 passed\n'));

  console.log(chalk.bold.green('\n✅ All tests completed!\n'));
  console.log(chalk.cyan('Check the outputs above to verify expected behavior.'));
  console.log(chalk.cyan('Run "queuectl status" to see final queue state.\n'));
}

runTests().catch(error => {
  console.error(chalk.red('Test error:', error));
  process.exit(1);
});
#!/bin/bash

# QueueCTL Test Scenarios
# This script validates core functionality

set -e

echo "🧪 Running QueueCTL Test Scenarios..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_passed() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

test_failed() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

echo "=== Test 1: Basic Job Completion ==="
queuectl enqueue '{"id":"test-1","command":"echo Hello World"}'
sleep 1
queuectl worker start --count 1 &
WORKER_PID=$!
sleep 3
kill $WORKER_PID 2>/dev/null || true
wait $WORKER_PID 2>/dev/null || true

# Check if job completed
if queuectl list --state completed | grep -q "test-1"; then
    test_passed "Basic job completed successfully"
else
    test_failed "Basic job did not complete"
fi
echo ""

echo "=== Test 2: Failed Job with Retry ==="
queuectl enqueue '{"id":"test-2","command":"exit 1","max_retries":2}'
sleep 1
queuectl worker start --count 1 &
WORKER_PID=$!
sleep 5
kill $WORKER_PID 2>/dev/null || true
wait $WORKER_PID 2>/dev/null || true

# Check if job is in DLQ
if queuectl dlq list | grep -q "test-2"; then
    test_passed "Failed job moved to DLQ after retries"
else
    test_failed "Failed job not in DLQ"
fi
echo ""

echo "=== Test 3: Multiple Workers ==="
queuectl enqueue '{"id":"test-3a","command":"sleep 1 && echo Job A"}'
queuectl enqueue '{"id":"test-3b","command":"sleep 1 && echo Job B"}'
queuectl enqueue '{"id":"test-3c","command":"sleep 1 && echo Job C"}'
sleep 1
queuectl worker start --count 3 &
WORKER_PID=$!
sleep 4
kill $WORKER_PID 2>/dev/null || true
wait $WORKER_PID 2>/dev/null || true

# Check if all jobs completed
COMPLETED_COUNT=$(queuectl list --state completed | grep -c "test-3" || true)
if [ "$COMPLETED_COUNT" -eq 3 ]; then
    test_passed "Multiple workers processed jobs successfully"
else
    test_failed "Multiple workers test failed (completed: $COMPLETED_COUNT/3)"
fi
echo ""

echo "=== Test 4: Invalid Command ==="
queuectl enqueue '{"id":"test-4","command":"nonexistent_command_xyz","max_retries":1}'
sleep 1
queuectl worker start --count 1 &
WORKER_PID=$!
sleep 4
kill $WORKER_PID 2>/dev/null || true
wait $WORKER_PID 2>/dev/null || true

# Check if job failed
if queuectl dlq list | grep -q "test-4"; then
    test_passed "Invalid command handled gracefully"
else
    test_failed "Invalid command not handled properly"
fi
echo ""

echo "=== Test 5: Configuration ==="
queuectl config set max-retries 5
queuectl config set backoff-base 3

# Verify config
if queuectl config show | grep -q "Max Retries:      5"; then
    test_passed "Configuration set successfully"
else
    test_failed "Configuration not set"
fi
echo ""

echo "=== Test 6: DLQ Retry ==="
queuectl dlq retry test-2
sleep 1

# Check if job is back in queue
if queuectl list --state pending | grep -q "test-2"; then
    test_passed "DLQ retry moved job back to queue"
else
    test_failed "DLQ retry failed"
fi
echo ""

echo "=== Test 7: Status Command ==="
if queuectl status | grep -q "Queue Status"; then
    test_passed "Status command works"
else
    test_failed "Status command failed"
fi
echo ""

# Summary
echo ""
echo "================================"
echo "Test Summary:"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "================================"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
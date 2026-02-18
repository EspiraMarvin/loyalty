#!/bin/bash

# k6 Performance Benchmark Script
# Runs smoke test and displays key metrics

set -e

echo "=============================================="
echo "  k6 Performance Benchmark - Offers Resolver"
echo "=============================================="
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "Error: k6 is not installed"
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   See https://k6.io/docs/get-started/installation/"
    echo "  Windows: choco install k6"
    echo ""
    exit 1
fi

# Check if server is running
GRAPHQL_URL="${GRAPHQL_URL:-http://localhost:3000/graphql}"
echo " Checking if server is running at $GRAPHQL_URL..."
if ! curl -s -o /dev/null -w "%{http_code}" "$GRAPHQL_URL" | grep -q "200\|400"; then
    echo " Error: Server is not responding at $GRAPHQL_URL"
    echo ""
    echo "Start the server first:"
    echo "  Docker: docker-compose up -d"
    echo "  Local:  pnpm start:dev"
    echo ""
    exit 1
fi
echo "Server is running"
echo ""

# Run smoke test
echo "Running smoke test (30s, 5 VUs)..."
echo ""

RESULT=$(k6 run k6-smoke-test.js 2>&1)

echo "$RESULT"
echo ""

# Extract key metrics
AVG_DURATION=$(echo "$RESULT" | grep "http_req_duration" | awk '{print $3}' | sed 's/avg=//')
P95_DURATION=$(echo "$RESULT" | grep "http_req_duration" | awk '{print $8}' | sed 's/p(95)=//')
ERROR_RATE=$(echo "$RESULT" | grep "http_req_failed" | awk '{print $3}')
TOTAL_REQUESTS=$(echo "$RESULT" | grep "http_reqs" | awk '{print $3}')

echo "=============================================="
echo "   Key Metrics Summary"
echo "=============================================="
echo "Average Response Time: $AVG_DURATION"
echo "P95 Response Time:     $P95_DURATION"
echo "Error Rate:            $ERROR_RATE"
echo "Total Requests:        $TOTAL_REQUESTS"
echo ""

# Check if metrics are good
if echo "$RESULT" | grep -q "✓.*100.00%"; then
    echo "All checks passed!"
    echo ""
    echo "Performance rating:"
    
    # Check if average is below 500ms
    AVG_MS=$(echo "$AVG_DURATION" | sed 's/ms//' | sed 's/s/*1000/' | bc 2>/dev/null || echo "999")
    
    if (( $(echo "$AVG_MS < 500" | bc -l 2>/dev/null || echo "0") )); then
        echo "   Excellent (< 500ms average)"
    elif (( $(echo "$AVG_MS < 1000" | bc -l 2>/dev/null || echo "0") )); then
        echo "  Good (< 1s average)"
    else
        echo "Acceptable (> 1s average)"
    fi
else
    echo "Some checks failed. Review results above."
fi

echo ""
echo " Run full load test with:"
echo "   k6 run k6-load-test.js"
echo ""
echo "=============================================="

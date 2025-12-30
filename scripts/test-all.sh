#!/bin/bash

# Housarr Full Test Suite
# Run all frontend and backend tests

set -e

echo "=================================================="
echo "  Housarr Full Test Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

# Frontend Unit Tests
echo ""
echo "${YELLOW}Running Frontend Unit Tests...${NC}"
echo "--------------------------------------------------"
cd frontend
if npm run test:run; then
    echo "${GREEN}✓ Frontend unit tests passed${NC}"
else
    echo "${RED}✗ Frontend unit tests failed${NC}"
    FAILED=1
fi
cd ..

# Frontend E2E Tests (optional, requires backend)
if [ "$1" == "--e2e" ]; then
    echo ""
    echo "${YELLOW}Running Frontend E2E Tests...${NC}"
    echo "--------------------------------------------------"
    cd frontend
    if npx playwright test; then
        echo "${GREEN}✓ Frontend E2E tests passed${NC}"
    else
        echo "${RED}✗ Frontend E2E tests failed${NC}"
        FAILED=1
    fi
    cd ..
fi

# Backend Tests
echo ""
echo "${YELLOW}Running Backend Tests...${NC}"
echo "--------------------------------------------------"
cd backend
if php artisan test; then
    echo "${GREEN}✓ Backend tests passed${NC}"
else
    echo "${RED}✗ Backend tests failed${NC}"
    FAILED=1
fi
cd ..

# Summary
echo ""
echo "=================================================="
if [ $FAILED -eq 0 ]; then
    echo "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo "${RED}Some tests failed. See above for details.${NC}"
    exit 1
fi

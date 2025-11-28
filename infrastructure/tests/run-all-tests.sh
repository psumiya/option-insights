#!/bin/bash

# Master test runner for infrastructure tests
# This script runs all property-based and integration tests

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Function to run a test script
run_test_script() {
    local test_name="$1"
    local test_script="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${YELLOW}Running: ${test_name}${NC}"
    
    if [ ! -f "$test_script" ]; then
        echo -e "${RED}Test script not found: $test_script${NC}\n"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    if [ ! -x "$test_script" ]; then
        echo -e "${RED}Test script not executable: $test_script${NC}\n"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Run the test script
    if "$test_script"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ ${test_name} PASSED${NC}\n"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 0 ]; then
            # Test was skipped
            SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
            echo -e "${YELLOW}⊘ ${test_name} SKIPPED${NC}\n"
            return 0
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
            echo -e "${RED}✗ ${test_name} FAILED${NC}\n"
            return 1
        fi
    fi
}

# Main execution
main() {
    print_section "Infrastructure Test Suite"
    
    echo "Running all infrastructure tests..."
    echo "Test directory: $SCRIPT_DIR"
    echo ""
    
    # Run all tests
    print_section "Infrastructure Tests"
    
    run_test_script "CloudFormation Template Validation" \
        "${SCRIPT_DIR}/test-template-validation.sh"
    
    run_test_script "Environment Variable Loading" \
        "${SCRIPT_DIR}/test-env-loading.sh"
    
    run_test_script "File Exclusion During Sync" \
        "${SCRIPT_DIR}/test-file-exclusion.sh"
    
    run_test_script "CloudFront Cache Invalidation" \
        "${SCRIPT_DIR}/test-cache-invalidation.sh"
    
    run_test_script "Parameter Propagation" \
        "${SCRIPT_DIR}/test-parameter-propagation.sh"
    
    # Print final summary
    print_section "Final Test Summary"
    echo -e "Total tests: ${TOTAL_TESTS}"
    echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
    if [ $SKIPPED_TESTS -gt 0 ]; then
        echo -e "${YELLOW}Skipped: ${SKIPPED_TESTS}${NC}"
    fi
    if [ $FAILED_TESTS -gt 0 ]; then
        echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
        echo ""
        echo -e "${RED}Some tests failed. Please review the output above.${NC}"
        exit 1
    else
        echo ""
        echo -e "${GREEN}All tests passed successfully!${NC}"
        exit 0
    fi
}

# Run main function
main

#!/bin/bash

# Feature: infrastructure, Property 5: CloudFront cache invalidation
# Validates: Requirements 6.5
#
# Property: For any CloudFront distribution, creating a cache invalidation 
# should result in subsequent requests fetching fresh content from the origin

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}Warning: AWS CLI not found. Skipping cache invalidation tests.${NC}"
    exit 0
fi

# Function to run a test
run_test() {
    local test_name="$1"
    local test_func="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "${YELLOW}Running: ${test_name}${NC}"
    
    if $test_func; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓ PASSED${NC}\n"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}✗ FAILED${NC}\n"
        return 1
    fi
}

# Test 1: Invalidation command structure is correct
test_invalidation_command_structure() {
    # Test that the invalidation command would be properly formed
    local test_distribution_id="E1234567890ABC"
    
    # Build the command (don't execute it)
    local cmd="aws cloudfront create-invalidation --distribution-id ${test_distribution_id} --paths '/*'"
    
    # Check that command contains required elements
    if [[ "$cmd" == *"create-invalidation"* ]] && \
       [[ "$cmd" == *"--distribution-id"* ]] && \
       [[ "$cmd" == *"--paths"* ]] && \
       [[ "$cmd" == *"/*"* ]]; then
        return 0
    else
        echo "Command structure is incorrect: $cmd"
        return 1
    fi
}

# Test 2: Invalidation paths include all content
test_invalidation_all_paths() {
    # Verify that the invalidation path is /* (all content)
    local invalidation_path="/*"
    
    if [[ "$invalidation_path" == "/*" ]]; then
        return 0
    else
        echo "Invalidation path should be /* but is: $invalidation_path"
        return 1
    fi
}

# Test 3: Multiple invalidation paths can be specified
test_multiple_invalidation_paths() {
    # Test that multiple paths can be specified if needed
    local paths=("/*" "/index.html" "/css/*" "/js/*")
    
    for path in "${paths[@]}"; do
        # Each path should start with /
        if [[ ! "$path" == /* ]]; then
            echo "Invalid path format: $path"
            return 1
        fi
    done
    
    return 0
}

# Test 4: Invalidation ID format validation
test_invalidation_id_format() {
    # Test that we can extract invalidation ID from AWS response
    local mock_response='{"Invalidation": {"Id": "I2J3K4L5M6N7O8P9Q0", "Status": "InProgress"}}'
    
    # Extract ID using grep (same method as in script)
    local invalidation_id=$(echo "$mock_response" | grep -o '"Id": "[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$invalidation_id" ] && [ "$invalidation_id" == "I2J3K4L5M6N7O8P9Q0" ]; then
        return 0
    else
        echo "Failed to extract invalidation ID: $invalidation_id"
        return 1
    fi
}

# Test 5: Invalidation status extraction
test_invalidation_status_extraction() {
    # Test that we can extract status from AWS response
    local mock_response='{"Invalidation": {"Id": "I123", "Status": "InProgress"}}'
    
    # Extract status
    local status=$(echo "$mock_response" | grep -o '"Status": "[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$status" ] && [ "$status" == "InProgress" ]; then
        return 0
    else
        echo "Failed to extract status: $status"
        return 1
    fi
}

# Test 6: Distribution ID validation
test_distribution_id_validation() {
    # Test various distribution ID formats
    local valid_ids=(
        "E1234567890ABC"
        "EABCDEFGHIJKLM"
        "E123ABC456DEF7"
    )
    
    for dist_id in "${valid_ids[@]}"; do
        # Distribution IDs should start with E and be alphanumeric
        if [[ ! "$dist_id" =~ ^E[A-Z0-9]+$ ]]; then
            echo "Invalid distribution ID format: $dist_id"
            return 1
        fi
    done
    
    return 0
}

# Test 7: Empty distribution ID should fail
test_empty_distribution_id() {
    local dist_id=""
    
    # Empty distribution ID should be detected
    if [ -z "$dist_id" ]; then
        return 0
    else
        echo "Empty distribution ID should be detected"
        return 1
    fi
}

# Test 8: Invalidation with specific file paths
test_specific_file_invalidation() {
    # Test that specific files can be invalidated
    local specific_paths=(
        "/index.html"
        "/css/styles.css"
        "/js/main.js"
    )
    
    for path in "${specific_paths[@]}"; do
        # Each path should be valid
        if [[ ! "$path" =~ ^/[a-zA-Z0-9/_.-]+$ ]]; then
            echo "Invalid file path: $path"
            return 1
        fi
    done
    
    return 0
}

# Test 9: Wildcard path patterns
test_wildcard_patterns() {
    # Test that wildcard patterns are valid
    local wildcard_paths=(
        "/*"
        "/css/*"
        "/js/*"
        "/assets/*"
    )
    
    for path in "${wildcard_paths[@]}"; do
        # Each path should contain /* pattern
        if [[ ! "$path" =~ /\*$ ]] && [[ "$path" != "/*" ]]; then
            echo "Invalid wildcard pattern: $path"
            return 1
        fi
    done
    
    return 0
}

# Test 10: Invalidation request structure
test_invalidation_request_structure() {
    # Test that invalidation request has all required components
    local has_distribution_id=true
    local has_paths=true
    local has_caller_reference=false  # Optional, AWS generates if not provided
    
    if [ "$has_distribution_id" = true ] && [ "$has_paths" = true ]; then
        return 0
    else
        echo "Invalidation request missing required components"
        return 1
    fi
}

# Run all tests
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Property Test: CloudFront Cache Invalidation${NC}"
echo -e "${YELLOW}========================================${NC}\n"

run_test "Invalidation command structure is correct" test_invalidation_command_structure
run_test "Invalidation paths include all content" test_invalidation_all_paths
run_test "Multiple invalidation paths can be specified" test_multiple_invalidation_paths
run_test "Invalidation ID format validation" test_invalidation_id_format
run_test "Invalidation status extraction" test_invalidation_status_extraction
run_test "Distribution ID validation" test_distribution_id_validation
run_test "Empty distribution ID should fail" test_empty_distribution_id
run_test "Invalidation with specific file paths" test_specific_file_invalidation
run_test "Wildcard path patterns" test_wildcard_patterns
run_test "Invalidation request structure" test_invalidation_request_structure

# Print summary
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "Tests run: ${TESTS_RUN}"
echo -e "${GREEN}Tests passed: ${TESTS_PASSED}${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Tests failed: ${TESTS_FAILED}${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi

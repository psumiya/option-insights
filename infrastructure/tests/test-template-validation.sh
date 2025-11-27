#!/bin/bash

# Feature: infrastructure, Property 1: CloudFormation template validation
# Validates: Requirements 6.2
#
# Property: For any CloudFormation template file, validating the template 
# syntax should either succeed with no errors or fail with specific syntax 
# error messages

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

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRASTRUCTURE_DIR="$(dirname "$SCRIPT_DIR")"

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}Warning: AWS CLI not found. Skipping template validation tests.${NC}"
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

# Test 1: Valid CloudFormation template
test_valid_template() {
    local template_file="${INFRASTRUCTURE_DIR}/templates/cloudformation.yaml"
    
    if [ ! -f "$template_file" ]; then
        echo "Template file not found"
        return 1
    fi
    
    # Validate template - should succeed
    if aws cloudformation validate-template \
        --template-body "file://${template_file}" \
        --region us-east-1 \
        > /dev/null 2>&1; then
        return 0
    else
        echo "Template validation failed"
        return 1
    fi
}

# Test 2: Invalid template - malformed YAML
test_invalid_yaml() {
    local temp_template=$(mktemp /tmp/template.XXXXXX.yaml)
    cat > "$temp_template" << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: Invalid template
Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties
      BucketName: test-bucket
EOF
    
    # Validate template - should fail
    if aws cloudformation validate-template \
        --template-body "file://${temp_template}" \
        --region us-east-1 \
        > /dev/null 2>&1; then
        rm -f "$temp_template"
        echo "Expected validation to fail but it succeeded"
        return 1
    else
        rm -f "$temp_template"
        return 0
    fi
}

# Test 3: Invalid template - unknown resource type
test_invalid_resource_type() {
    local temp_template=$(mktemp /tmp/template.XXXXXX.yaml)
    cat > "$temp_template" << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: Invalid resource type
Resources:
  InvalidResource:
    Type: AWS::Invalid::ResourceType
    Properties:
      Name: test
EOF
    
    # Validate template - should fail
    if aws cloudformation validate-template \
        --template-body "file://${temp_template}" \
        --region us-east-1 \
        > /dev/null 2>&1; then
        rm -f "$temp_template"
        echo "Expected validation to fail but it succeeded"
        return 1
    else
        rm -f "$temp_template"
        return 0
    fi
}

# Test 4: Valid minimal template
test_valid_minimal_template() {
    local temp_template=$(mktemp /tmp/template.XXXXXX.yaml)
    cat > "$temp_template" << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: Minimal valid template
Resources:
  TestBucket:
    Type: AWS::S3::Bucket
EOF
    
    # Validate template - should succeed
    if aws cloudformation validate-template \
        --template-body "file://${temp_template}" \
        --region us-east-1 \
        > /dev/null 2>&1; then
        rm -f "$temp_template"
        return 0
    else
        rm -f "$temp_template"
        echo "Template validation failed"
        return 1
    fi
}

# Test 5: Empty template file
test_empty_template() {
    local temp_template=$(mktemp /tmp/template.XXXXXX.yaml)
    # Create empty file
    touch "$temp_template"
    
    # Validate template - should fail (empty template)
    if aws cloudformation validate-template \
        --template-body "file://${temp_template}" \
        --region us-east-1 \
        > /dev/null 2>&1; then
        rm -f "$temp_template"
        echo "Expected validation to fail but it succeeded"
        return 1
    else
        rm -f "$temp_template"
        return 0
    fi
}

# Run all tests
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Property Test: CloudFormation Template Validation${NC}"
echo -e "${YELLOW}========================================${NC}\n"

run_test "Valid CloudFormation template (actual template)" test_valid_template
run_test "Invalid template - malformed YAML" test_invalid_yaml
run_test "Invalid template - unknown resource type" test_invalid_resource_type
run_test "Valid minimal template" test_valid_minimal_template
run_test "Empty template file" test_empty_template

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

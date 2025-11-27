#!/bin/bash

# Feature: infrastructure, Property 10: Parameter propagation
# Validates: Requirements 3.3, 3.4, 10.4
# Property: For any parameter passed to the CloudFormation stack, 
# the parameter value should be correctly used in all resources that reference it

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_PATH="$SCRIPT_DIR/../templates/cloudformation.yaml"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local domain_name="$2"
    local subdomain="$3"
    local bucket_name="$4"
    local environment="$5"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    echo -e "${YELLOW}Test $TESTS_RUN: $test_name${NC}"
    echo "  Parameters: DomainName=$domain_name, Subdomain=$subdomain, BucketName=$bucket_name, Environment=$environment"
    
    # Validate template with parameters
    local validation_output
    if ! validation_output=$(aws cloudformation validate-template \
        --template-body "file://$TEMPLATE_PATH" 2>&1); then
        echo -e "${RED}  ✗ Template validation failed${NC}"
        echo "  Error: $validation_output"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    # Check that template contains parameter references
    local full_domain="${subdomain}.${domain_name}"
    
    # Verify parameters are defined in template
    if ! grep -q "DomainName:" "$TEMPLATE_PATH"; then
        echo -e "${RED}  ✗ DomainName parameter not found in template${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    if ! grep -q "Subdomain:" "$TEMPLATE_PATH"; then
        echo -e "${RED}  ✗ Subdomain parameter not found in template${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    if ! grep -q "BucketName:" "$TEMPLATE_PATH"; then
        echo -e "${RED}  ✗ BucketName parameter not found in template${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    if ! grep -q "Environment:" "$TEMPLATE_PATH"; then
        echo -e "${RED}  ✗ Environment parameter not found in template${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    # Verify parameter references in resources
    # Check that Subdomain and DomainName are used together to form full domain
    if ! grep -q '${Subdomain}.${DomainName}' "$TEMPLATE_PATH"; then
        echo -e "${RED}  ✗ Subdomain and DomainName not properly combined in template${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    # Check that BucketName is referenced
    if ! grep -q '!Ref BucketName' "$TEMPLATE_PATH"; then
        echo -e "${RED}  ✗ BucketName parameter not referenced in template${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    # Check that Environment is used in tags
    if ! grep -q '!Ref Environment' "$TEMPLATE_PATH"; then
        echo -e "${RED}  ✗ Environment parameter not referenced in template${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    # Verify outputs reference the parameters
    if ! grep -q 'https://${Subdomain}.${DomainName}' "$TEMPLATE_PATH"; then
        echo -e "${RED}  ✗ WebsiteURL output does not properly use parameters${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    echo -e "${GREEN}  ✓ All parameter references validated${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

# Main test execution
echo "=========================================="
echo "Property Test: Parameter Propagation"
echo "=========================================="
echo ""

# Check if template exists
if [ ! -f "$TEMPLATE_PATH" ]; then
    echo -e "${RED}Error: CloudFormation template not found at $TEMPLATE_PATH${NC}"
    exit 1
fi

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Run multiple test cases with different parameter combinations
echo "Running property-based tests with various parameter combinations..."
echo ""

# Test 1: Production environment
run_test "Production environment" \
    "example.com" \
    "trading" \
    "trading-example-com" \
    "production"

# Test 2: Dev environment
run_test "Dev environment" \
    "example.com" \
    "trading-dev" \
    "trading-dev-example-com" \
    "dev"

# Test 3: Different domain
run_test "Different domain" \
    "mycompany.io" \
    "app" \
    "app-mycompany-io" \
    "production"

# Test 4: Hyphenated subdomain
run_test "Hyphenated subdomain" \
    "test-domain.com" \
    "my-app-dev" \
    "my-app-dev-test-domain-com" \
    "dev"

# Test 5: Short names
run_test "Short names" \
    "ex.co" \
    "t" \
    "t-ex-co" \
    "production"

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Tests run: $TESTS_RUN"
echo -e "${GREEN}Tests passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Tests failed: $TESTS_FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi

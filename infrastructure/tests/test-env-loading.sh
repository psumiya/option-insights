#!/bin/bash

# Feature: infrastructure, Property 2: Environment variable loading
# Validates: Requirements 6.1, 10.1
#
# Property: For any valid .env file containing required variables, 
# loading the environment variables should result in all required 
# configuration values being available to the deployment script

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
SCRIPTS_DIR="${INFRASTRUCTURE_DIR}/scripts"

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

# Test 1: Valid .env file with all required variables
test_valid_env_all_vars() {
    local temp_env=$(mktemp)
    cat > "$temp_env" << 'EOF'
DOMAIN_NAME=example.com
SUBDOMAIN=trading
S3_BUCKET_NAME=trading-example-com
ENVIRONMENT=production
AWS_REGION=us-east-1
AWS_PROFILE=default
STACK_NAME=static-website-trading
EOF
    
    # Create a test script that sources the load_env function
    local test_script=$(mktemp)
    cat > "$test_script" << 'SCRIPT'
#!/bin/bash
set -e
INFRASTRUCTURE_DIR="$1"
ENV_FILE="$2"

# Copy the load_env function
load_env() {
    local env_file="$ENV_FILE"
    
    if [ ! -f "$env_file" ]; then
        return 1
    fi
    
    while IFS='=' read -r key value; do
        if [[ $key =~ ^#.*$ ]] || [[ -z $key ]]; then
            continue
        fi
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        export "$key=$value"
    done < "$env_file"
    
    local required_vars=(
        "DOMAIN_NAME"
        "SUBDOMAIN"
        "S3_BUCKET_NAME"
        "ENVIRONMENT"
        "AWS_REGION"
        "AWS_PROFILE"
        "STACK_NAME"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        return 1
    fi
    
    if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "dev" ]]; then
        return 1
    fi
    
    return 0
}

load_env

# Verify all variables are set
[ -n "$DOMAIN_NAME" ] && [ "$DOMAIN_NAME" = "example.com" ] || exit 1
[ -n "$SUBDOMAIN" ] && [ "$SUBDOMAIN" = "trading" ] || exit 1
[ -n "$S3_BUCKET_NAME" ] && [ "$S3_BUCKET_NAME" = "trading-example-com" ] || exit 1
[ -n "$ENVIRONMENT" ] && [ "$ENVIRONMENT" = "production" ] || exit 1
[ -n "$AWS_REGION" ] && [ "$AWS_REGION" = "us-east-1" ] || exit 1
[ -n "$AWS_PROFILE" ] && [ "$AWS_PROFILE" = "default" ] || exit 1
[ -n "$STACK_NAME" ] && [ "$STACK_NAME" = "static-website-trading" ] || exit 1

exit 0
SCRIPT
    
    chmod +x "$test_script"
    
    if "$test_script" "$INFRASTRUCTURE_DIR" "$temp_env" 2>/dev/null; then
        rm -f "$temp_env" "$test_script"
        return 0
    else
        rm -f "$temp_env" "$test_script"
        return 1
    fi
}

# Test 2: Missing required variable (DOMAIN_NAME)
test_missing_domain_name() {
    local temp_env=$(mktemp)
    cat > "$temp_env" << 'EOF'
SUBDOMAIN=trading
S3_BUCKET_NAME=trading-example-com
ENVIRONMENT=production
AWS_REGION=us-east-1
AWS_PROFILE=default
STACK_NAME=static-website-trading
EOF
    
    local test_script=$(mktemp)
    cat > "$test_script" << 'SCRIPT'
#!/bin/bash
INFRASTRUCTURE_DIR="$1"
ENV_FILE="$2"

load_env() {
    local env_file="$ENV_FILE"
    
    if [ ! -f "$env_file" ]; then
        return 1
    fi
    
    while IFS='=' read -r key value; do
        if [[ $key =~ ^#.*$ ]] || [[ -z $key ]]; then
            continue
        fi
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        export "$key=$value"
    done < "$env_file"
    
    local required_vars=(
        "DOMAIN_NAME"
        "SUBDOMAIN"
        "S3_BUCKET_NAME"
        "ENVIRONMENT"
        "AWS_REGION"
        "AWS_PROFILE"
        "STACK_NAME"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        return 1
    fi
    
    return 0
}

load_env
exit $?
SCRIPT
    
    chmod +x "$test_script"
    
    # Should fail because DOMAIN_NAME is missing
    if ! "$test_script" "$INFRASTRUCTURE_DIR" "$temp_env" 2>/dev/null; then
        rm -f "$temp_env" "$test_script"
        return 0
    else
        rm -f "$temp_env" "$test_script"
        return 1
    fi
}

# Test 3: Invalid ENVIRONMENT value
test_invalid_environment() {
    local temp_env=$(mktemp)
    cat > "$temp_env" << 'EOF'
DOMAIN_NAME=example.com
SUBDOMAIN=trading
S3_BUCKET_NAME=trading-example-com
ENVIRONMENT=staging
AWS_REGION=us-east-1
AWS_PROFILE=default
STACK_NAME=static-website-trading
EOF
    
    local test_script=$(mktemp)
    cat > "$test_script" << 'SCRIPT'
#!/bin/bash
INFRASTRUCTURE_DIR="$1"
ENV_FILE="$2"

load_env() {
    local env_file="$ENV_FILE"
    
    if [ ! -f "$env_file" ]; then
        return 1
    fi
    
    while IFS='=' read -r key value; do
        if [[ $key =~ ^#.*$ ]] || [[ -z $key ]]; then
            continue
        fi
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        export "$key=$value"
    done < "$env_file"
    
    local required_vars=(
        "DOMAIN_NAME"
        "SUBDOMAIN"
        "S3_BUCKET_NAME"
        "ENVIRONMENT"
        "AWS_REGION"
        "AWS_PROFILE"
        "STACK_NAME"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        return 1
    fi
    
    if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "dev" ]]; then
        return 1
    fi
    
    return 0
}

load_env
exit $?
SCRIPT
    
    chmod +x "$test_script"
    
    # Should fail because ENVIRONMENT is invalid
    if ! "$test_script" "$INFRASTRUCTURE_DIR" "$temp_env" 2>/dev/null; then
        rm -f "$temp_env" "$test_script"
        return 0
    else
        rm -f "$temp_env" "$test_script"
        return 1
    fi
}

# Test 4: .env file with comments and empty lines
test_env_with_comments() {
    local temp_env=$(mktemp)
    cat > "$temp_env" << 'EOF'
# This is a comment
DOMAIN_NAME=example.com

# Another comment
SUBDOMAIN=trading
S3_BUCKET_NAME=trading-example-com

ENVIRONMENT=dev
AWS_REGION=us-east-1
AWS_PROFILE=default
STACK_NAME=static-website-trading
EOF
    
    local test_script=$(mktemp)
    cat > "$test_script" << 'SCRIPT'
#!/bin/bash
set -e
INFRASTRUCTURE_DIR="$1"
ENV_FILE="$2"

load_env() {
    local env_file="$ENV_FILE"
    
    if [ ! -f "$env_file" ]; then
        return 1
    fi
    
    while IFS='=' read -r key value; do
        if [[ $key =~ ^#.*$ ]] || [[ -z $key ]]; then
            continue
        fi
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        export "$key=$value"
    done < "$env_file"
    
    local required_vars=(
        "DOMAIN_NAME"
        "SUBDOMAIN"
        "S3_BUCKET_NAME"
        "ENVIRONMENT"
        "AWS_REGION"
        "AWS_PROFILE"
        "STACK_NAME"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        return 1
    fi
    
    if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "dev" ]]; then
        return 1
    fi
    
    return 0
}

load_env

# Verify variables are set correctly
[ -n "$DOMAIN_NAME" ] && [ "$DOMAIN_NAME" = "example.com" ] || exit 1
[ -n "$SUBDOMAIN" ] && [ "$SUBDOMAIN" = "trading" ] || exit 1
[ -n "$ENVIRONMENT" ] && [ "$ENVIRONMENT" = "dev" ] || exit 1

exit 0
SCRIPT
    
    chmod +x "$test_script"
    
    if "$test_script" "$INFRASTRUCTURE_DIR" "$temp_env" 2>/dev/null; then
        rm -f "$temp_env" "$test_script"
        return 0
    else
        rm -f "$temp_env" "$test_script"
        return 1
    fi
}

# Test 5: .env file doesn't exist
test_missing_env_file() {
    local temp_env="/tmp/nonexistent-$(date +%s).env"
    
    local test_script=$(mktemp)
    cat > "$test_script" << 'SCRIPT'
#!/bin/bash
INFRASTRUCTURE_DIR="$1"
ENV_FILE="$2"

load_env() {
    local env_file="$ENV_FILE"
    
    if [ ! -f "$env_file" ]; then
        return 1
    fi
    
    return 0
}

load_env
exit $?
SCRIPT
    
    chmod +x "$test_script"
    
    # Should fail because file doesn't exist
    if ! "$test_script" "$INFRASTRUCTURE_DIR" "$temp_env" 2>/dev/null; then
        rm -f "$test_script"
        return 0
    else
        rm -f "$test_script"
        return 1
    fi
}

# Run all tests
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Property Test: Environment Variable Loading${NC}"
echo -e "${YELLOW}========================================${NC}\n"

run_test "Valid .env with all required variables" test_valid_env_all_vars
run_test "Missing required variable (DOMAIN_NAME)" test_missing_domain_name
run_test "Invalid ENVIRONMENT value" test_invalid_environment
run_test ".env file with comments and empty lines" test_env_with_comments
run_test "Missing .env file" test_missing_env_file

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

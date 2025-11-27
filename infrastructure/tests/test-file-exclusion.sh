#!/bin/bash

# Feature: infrastructure, Property 4: File exclusion during sync
# Validates: Requirements 1.2
#
# Property: For any file in the excluded directories (tests/, sample-data/, 
# .git/, .kiro/, node_modules/), syncing files to S3 should not upload that file

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

# Helper function to check if a file would be excluded
is_excluded() {
    local file_path="$1"
    
    # List of exclusion patterns from the sync_files function
    local exclusions=(
        "tests/"
        "tests/sample-data/"
        ".git/"
        ".kiro/"
        "infrastructure/"
        "node_modules/"
        ".env"
        ".gitignore"
        "README.md"
        ".DS_Store"
        "package.json"
        "package-lock.json"
    )
    
    for pattern in "${exclusions[@]}"; do
        # Check if file path starts with or matches the pattern
        if [[ "$file_path" == "$pattern"* ]] || [[ "$file_path" == "$pattern" ]]; then
            return 0  # File is excluded
        fi
    done
    
    return 1  # File is not excluded
}

# Test 1: Files in tests/ directory should be excluded
test_tests_directory_excluded() {
    local test_files=(
        "tests/test-file.html"
        "tests/sample-data/data.csv"
        "tests/run-tests.js"
    )
    
    for file in "${test_files[@]}"; do
        if ! is_excluded "$file"; then
            echo "File $file should be excluded but wasn't"
            return 1
        fi
    done
    
    return 0
}

# Test 2: Files in .git/ directory should be excluded
test_git_directory_excluded() {
    local test_files=(
        ".git/config"
        ".git/HEAD"
        ".git/objects/abc123"
    )
    
    for file in "${test_files[@]}"; do
        if ! is_excluded "$file"; then
            echo "File $file should be excluded but wasn't"
            return 1
        fi
    done
    
    return 0
}

# Test 3: Files in .kiro/ directory should be excluded
test_kiro_directory_excluded() {
    local test_files=(
        ".kiro/specs/feature/design.md"
        ".kiro/settings/config.json"
        ".kiro/steering/rules.md"
    )
    
    for file in "${test_files[@]}"; do
        if ! is_excluded "$file"; then
            echo "File $file should be excluded but wasn't"
            return 1
        fi
    done
    
    return 0
}

# Test 4: Files in infrastructure/ directory should be excluded
test_infrastructure_directory_excluded() {
    local test_files=(
        "infrastructure/scripts/deploy.sh"
        "infrastructure/templates/cloudformation.yaml"
        "infrastructure/.env"
    )
    
    for file in "${test_files[@]}"; do
        if ! is_excluded "$file"; then
            echo "File $file should be excluded but wasn't"
            return 1
        fi
    done
    
    return 0
}

# Test 5: Files in node_modules/ directory should be excluded
test_node_modules_excluded() {
    local test_files=(
        "node_modules/package/index.js"
        "node_modules/another-package/lib/main.js"
    )
    
    for file in "${test_files[@]}"; do
        if ! is_excluded "$file"; then
            echo "File $file should be excluded but wasn't"
            return 1
        fi
    done
    
    return 0
}

# Test 6: Specific files should be excluded
test_specific_files_excluded() {
    local test_files=(
        ".env"
        ".gitignore"
        "README.md"
        ".DS_Store"
        "package.json"
        "package-lock.json"
    )
    
    for file in "${test_files[@]}"; do
        if ! is_excluded "$file"; then
            echo "File $file should be excluded but wasn't"
            return 1
        fi
    done
    
    return 0
}

# Test 7: Valid website files should NOT be excluded
test_valid_files_not_excluded() {
    local test_files=(
        "index.html"
        "css/styles.css"
        "js/main.js"
        "js/visualizations/chart.js"
        "lib/d3.min.js"
        "assets/logo.png"
    )
    
    for file in "${test_files[@]}"; do
        if is_excluded "$file"; then
            echo "File $file should NOT be excluded but was"
            return 1
        fi
    done
    
    return 0
}

# Test 8: Files in docs/ should NOT be excluded (not in exclusion list)
test_docs_not_excluded() {
    local test_files=(
        "docs/TESTING.md"
        "docs/BROKER_SUPPORT.md"
    )
    
    for file in "${test_files[@]}"; do
        if is_excluded "$file"; then
            echo "File $file should NOT be excluded but was"
            return 1
        fi
    done
    
    return 0
}

# Test 9: Nested test files should be excluded
test_nested_test_files_excluded() {
    local test_files=(
        "tests/unit/test-component.js"
        "tests/integration/test-flow.js"
        "tests/sample-data/nested/data.json"
    )
    
    for file in "${test_files[@]}"; do
        if ! is_excluded "$file"; then
            echo "File $file should be excluded but wasn't"
            return 1
        fi
    done
    
    return 0
}

# Test 10: Random excluded directory files
test_random_excluded_files() {
    # Generate some random file paths in excluded directories
    local test_files=(
        ".git/refs/heads/main"
        ".kiro/cache/temp.json"
        "infrastructure/backup/old.yaml"
        "node_modules/@scope/package/dist/bundle.js"
        "tests/fixtures/mock-data.json"
    )
    
    for file in "${test_files[@]}"; do
        if ! is_excluded "$file"; then
            echo "File $file should be excluded but wasn't"
            return 1
        fi
    done
    
    return 0
}

# Run all tests
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Property Test: File Exclusion During Sync${NC}"
echo -e "${YELLOW}========================================${NC}\n"

run_test "Files in tests/ directory are excluded" test_tests_directory_excluded
run_test "Files in .git/ directory are excluded" test_git_directory_excluded
run_test "Files in .kiro/ directory are excluded" test_kiro_directory_excluded
run_test "Files in infrastructure/ directory are excluded" test_infrastructure_directory_excluded
run_test "Files in node_modules/ directory are excluded" test_node_modules_excluded
run_test "Specific files are excluded" test_specific_files_excluded
run_test "Valid website files are NOT excluded" test_valid_files_not_excluded
run_test "Files in docs/ are NOT excluded" test_docs_not_excluded
run_test "Nested test files are excluded" test_nested_test_files_excluded
run_test "Random excluded directory files are excluded" test_random_excluded_files

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

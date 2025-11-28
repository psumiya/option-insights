# Infrastructure Tests

Automated tests for the infrastructure deployment system.

## Overview

These tests validate the CloudFormation template and deployment scripts without creating AWS resources.

## Running Tests

### Run All Tests

```bash
cd infrastructure/tests
./run-all-tests.sh
```

### Run Individual Tests

```bash
./test-template-validation.sh      # Validate CloudFormation template syntax
./test-env-loading.sh               # Test environment variable loading
./test-file-exclusion.sh            # Test file exclusion logic
./test-cache-invalidation.sh        # Test cache invalidation commands
./test-parameter-propagation.sh     # Test parameter propagation
```

## What Gets Tested

1. **CloudFormation Template Validation** - Validates template syntax using AWS CLI
2. **Environment Variable Loading** - Tests .env file parsing and validation
3. **File Exclusion** - Verifies excluded files aren't synced to S3
4. **Cache Invalidation** - Tests CloudFront invalidation command structure
5. **Parameter Propagation** - Verifies parameters are correctly used in template

## Requirements

- **Bash** - All tests are shell scripts
- **AWS CLI** (optional) - Required for template validation test only

## Safety

✅ **All tests are safe** - No AWS resources are created, no costs incurred.

Tests validate configuration and logic without making actual AWS API calls (except template validation which is read-only).

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run Infrastructure Tests
  run: |
    cd infrastructure/tests
    ./run-all-tests.sh
```

## Test Output

Tests use color-coded output:
- 🟢 Green: Test passed
- 🔴 Red: Test failed
- 🟡 Yellow: Informational message

Each test provides a summary of tests run, passed, and failed.

## Manual Deployment Testing

For real deployment validation:

1. Deploy to a dev environment using `./infrastructure/scripts/deploy-dev.sh`
2. Verify the deployment manually (check website, CloudFront, etc.)
3. Deploy to production using `./infrastructure/scripts/deploy-prod.sh`

The automated tests validate configuration correctness, but manual testing validates the actual deployment.

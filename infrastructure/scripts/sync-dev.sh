#!/bin/bash

# Quick sync script for DEVELOPMENT environment
# This script syncs files to S3 and invalidates CloudFront cache without touching CloudFormation

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRASTRUCTURE_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$INFRASTRUCTURE_DIR")"

# Load development environment variables
ENV_FILE="${INFRASTRUCTURE_DIR}/.env.dev"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Quick Sync - DEV Environment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env.dev file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env.dev file not found at ${ENV_FILE}${NC}"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo -e "${GREEN}✓ Loaded development environment configuration${NC}"
echo -e "  Domain: ${SUBDOMAIN}.${DOMAIN_NAME}"
echo -e "  Stack: ${STACK_NAME}"
echo -e "  Region: ${AWS_REGION}"
echo ""

# Verify stack exists
echo -e "${BLUE}Verifying CloudFormation stack exists...${NC}"
if ! aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}" \
    > /dev/null 2>&1; then
    echo -e "${RED}✗ Stack ${STACK_NAME} does not exist${NC}"
    echo -e "${YELLOW}Run the full deployment script first: ./deploy-dev.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Stack ${STACK_NAME} exists${NC}"
echo ""

# Get S3 bucket name from stack outputs
echo -e "${BLUE}Getting S3 bucket name...${NC}"
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$BUCKET_NAME" ]; then
    echo -e "${RED}✗ Unable to retrieve S3 bucket name from stack${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Target bucket: ${BUCKET_NAME}${NC}"
echo ""

# Sync files to S3
echo -e "${BLUE}Syncing website files to S3...${NC}"
SYNC_OUTPUT=$(aws s3 sync "${PROJECT_ROOT}" "s3://${BUCKET_NAME}" \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}" \
    --exclude "tests/*" \
    --exclude "tests/sample-data/*" \
    --exclude ".git/*" \
    --exclude ".kiro/*" \
    --exclude ".vscode/*" \
    --exclude "infrastructure/*" \
    --exclude "node_modules/*" \
    --exclude ".env" \
    --exclude ".gitignore" \
    --exclude "README.md" \
    --exclude "LICENSE" \
    --exclude ".DS_Store" \
    --exclude "package.json" \
    --exclude "package-lock.json" \
    --delete 2>&1)

SYNC_EXIT_CODE=$?
echo "$SYNC_OUTPUT"

if [ $SYNC_EXIT_CODE -eq 0 ]; then
    echo ""
    # Check if any files were actually synced
    if [ -z "$SYNC_OUTPUT" ]; then
        echo -e "${YELLOW}✓ No files needed syncing - everything is up to date${NC}"
        SKIP_CACHE_INVALIDATION=true
    else
        echo -e "${GREEN}✓ Files synced successfully${NC}"
        SKIP_CACHE_INVALIDATION=false
    fi
else
    echo -e "${RED}✗ File sync failed${NC}"
    exit 1
fi

# Invalidate CloudFront cache only if files were synced
if [ "$SKIP_CACHE_INVALIDATION" = false ]; then
    # Get CloudFront distribution ID
    echo -e "${BLUE}Getting CloudFront distribution ID...${NC}"
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --profile "${AWS_PROFILE}" \
        --region "${AWS_REGION}" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text 2>/dev/null)

    if [ -z "$DISTRIBUTION_ID" ]; then
        echo -e "${RED}✗ Unable to retrieve CloudFront distribution ID${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Distribution ID: ${DISTRIBUTION_ID}${NC}"

    # Invalidate CloudFront cache
    echo -e "${BLUE}Invalidating CloudFront cache...${NC}"
    INVALIDATION_OUTPUT=$(aws cloudfront create-invalidation \
        --distribution-id "${DISTRIBUTION_ID}" \
        --paths "/*" \
        --profile "${AWS_PROFILE}" \
        2>&1)

    if [ $? -eq 0 ]; then
        INVALIDATION_ID=$(echo "$INVALIDATION_OUTPUT" | grep -o '"Id": "[^"]*"' | head -1 | cut -d'"' -f4)
        echo -e "${GREEN}✓ Cache invalidation created${NC}"
        echo -e "  Invalidation ID: ${INVALIDATION_ID}"
        echo ""
    else
        echo -e "${RED}✗ Cache invalidation failed${NC}"
        echo "$INVALIDATION_OUTPUT"
        exit 1
    fi
else
    echo -e "${YELLOW}Skipping CloudFront cache invalidation - no files were changed${NC}"
    echo ""
fi

# Get website URL
WEBSITE_URL=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text 2>/dev/null)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Sync Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Website URL:${NC} ${BLUE}${WEBSITE_URL}${NC}"
if [ "$SKIP_CACHE_INVALIDATION" = false ]; then
    echo -e "${YELLOW}Note: CloudFront cache invalidation is in progress${NC}"
    echo -e "${YELLOW}Changes may take a few minutes to appear${NC}"
else
    echo -e "${YELLOW}No cache invalidation needed - no files were changed${NC}"
fi
echo ""
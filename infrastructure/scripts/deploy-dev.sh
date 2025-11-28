#!/bin/bash

# One-shot deployment script for DEVELOPMENT environment
# This script deploys the static website to the development environment

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
echo -e "${BLUE}AWS Static Website Deployment - DEV${NC}"
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

# Execute the main deployment script
"${SCRIPT_DIR}/deploy-common.sh"

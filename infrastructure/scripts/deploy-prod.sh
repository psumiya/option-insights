#!/bin/bash

# One-shot deployment script for PRODUCTION environment
# This script deploys the static website to the production environment

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

# Load production environment variables
ENV_FILE="${INFRASTRUCTURE_DIR}/.env.production"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AWS Static Website Deployment - PRODUCTION${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Production safety check
echo -e "${YELLOW}⚠️  WARNING: You are about to deploy to PRODUCTION${NC}"
echo -e "${YELLOW}This will update the live production environment.${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

# Check if .env.production file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env.production file not found at ${ENV_FILE}${NC}"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo -e "${GREEN}✓ Loaded production environment configuration${NC}"
echo -e "  Domain: ${SUBDOMAIN}.${DOMAIN_NAME}"
echo -e "  Stack: ${STACK_NAME}"
echo -e "  Region: ${AWS_REGION}"
echo ""

# Execute the main deployment script
"${SCRIPT_DIR}/deploy-common.sh"

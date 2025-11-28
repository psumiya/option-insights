#!/bin/bash

# Deployment script for AWS static website infrastructure
# This script automates the deployment of CloudFormation stack and website files

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Error handler
error_handler() {
    local line_number=$1
    echo -e "\n${RED}✗ Error occurred in deployment script at line ${line_number}${NC}"
    echo -e "${YELLOW}Deployment failed. Please check the error messages above.${NC}"
    exit 1
}

# Set up error trap
trap 'error_handler ${LINENO}' ERR

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

# Function to validate environment variables
validate_env() {
    echo -e "${BLUE}Validating environment configuration...${NC}"
    
    # Define required environment variables
    local required_vars=(
        "DOMAIN_NAME"
        "SUBDOMAIN"
        "S3_BUCKET_NAME"
        "ENVIRONMENT"
        "AWS_REGION"
        "AWS_PROFILE"
        "STACK_NAME"
    )
    
    # Validate all required variables are present
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    # Display error if any variables are missing
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo -e "${RED}Error: Missing required environment variables:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "  - ${var}"
        done
        exit 1
    fi
    
    # Validate ENVIRONMENT value
    if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "dev" ]]; then
        echo -e "${RED}Error: ENVIRONMENT must be either 'production' or 'dev'${NC}"
        echo -e "  Current value: ${ENVIRONMENT}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Environment configuration validated${NC}"
    echo ""
}

# Function to validate CloudFormation template
validate_template() {
    echo -e "${BLUE}Validating CloudFormation template...${NC}"
    
    local template_file="${INFRASTRUCTURE_DIR}/templates/cloudformation.yaml"
    
    # Check if template file exists
    if [ ! -f "$template_file" ]; then
        echo -e "${RED}Error: CloudFormation template not found at ${template_file}${NC}"
        exit 1
    fi
    
    # Validate template using AWS CLI
    if aws cloudformation validate-template \
        --template-body "file://${template_file}" \
        --profile "${AWS_PROFILE}" \
        --region "${AWS_REGION}" \
        > /dev/null 2>&1; then
        echo -e "${GREEN}✓ CloudFormation template is valid${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ CloudFormation template validation failed${NC}"
        echo -e "${YELLOW}Running validation again to show errors:${NC}"
        aws cloudformation validate-template \
            --template-body "file://${template_file}" \
            --profile "${AWS_PROFILE}" \
            --region "${AWS_REGION}" 2>&1 || true
        exit 1
    fi
}

# Function to deploy CloudFormation stack
deploy_stack() {
    echo -e "${BLUE}Deploying CloudFormation stack...${NC}"
    
    local template_file="${INFRASTRUCTURE_DIR}/templates/cloudformation.yaml"
    
    # Check if stack exists
    local stack_exists=false
    if aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --profile "${AWS_PROFILE}" \
        --region "${AWS_REGION}" \
        > /dev/null 2>&1; then
        stack_exists=true
    fi
    
    # Build parameters
    local parameters="ParameterKey=DomainName,ParameterValue=${DOMAIN_NAME}"
    parameters="${parameters} ParameterKey=Subdomain,ParameterValue=${SUBDOMAIN}"
    parameters="${parameters} ParameterKey=BucketName,ParameterValue=${S3_BUCKET_NAME}"
    parameters="${parameters} ParameterKey=Environment,ParameterValue=${ENVIRONMENT}"
    
    if [ "$stack_exists" = true ]; then
        echo -e "${YELLOW}Stack ${STACK_NAME} already exists. Updating...${NC}"
        
        # Try to update the stack
        if aws cloudformation update-stack \
            --stack-name "${STACK_NAME}" \
            --template-body "file://${template_file}" \
            --parameters ${parameters} \
            --capabilities CAPABILITY_IAM \
            --profile "${AWS_PROFILE}" \
            --region "${AWS_REGION}" \
            > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Stack update initiated${NC}"
            echo ""
            return 0
        else
            # Check if the error is "No updates to be performed"
            local error_output=$(aws cloudformation update-stack \
                --stack-name "${STACK_NAME}" \
                --template-body "file://${template_file}" \
                --parameters ${parameters} \
                --capabilities CAPABILITY_IAM \
                --profile "${AWS_PROFILE}" \
                --region "${AWS_REGION}" 2>&1 || true)
            
            if echo "$error_output" | grep -q "No updates are to be performed"; then
                echo -e "${YELLOW}No updates needed - stack is already up to date${NC}"
                echo ""
                return 0
            else
                echo -e "${RED}✗ Stack update failed${NC}"
                echo "$error_output"
                exit 1
            fi
        fi
    else
        echo -e "${YELLOW}Creating new stack ${STACK_NAME}...${NC}"
        
        # Create the stack
        if aws cloudformation create-stack \
            --stack-name "${STACK_NAME}" \
            --template-body "file://${template_file}" \
            --parameters ${parameters} \
            --capabilities CAPABILITY_IAM \
            --profile "${AWS_PROFILE}" \
            --region "${AWS_REGION}" \
            > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Stack creation initiated${NC}"
            echo ""
            return 0
        else
            echo -e "${RED}✗ Stack creation failed${NC}"
            aws cloudformation create-stack \
                --stack-name "${STACK_NAME}" \
                --template-body "file://${template_file}" \
                --parameters ${parameters} \
                --capabilities CAPABILITY_IAM \
                --profile "${AWS_PROFILE}" \
                --region "${AWS_REGION}" 2>&1 || true
            exit 1
        fi
    fi
}

# Function to wait for stack operation to complete
wait_for_stack() {
    echo -e "${BLUE}Waiting for stack operation to complete...${NC}"
    
    local max_wait=1800  # 30 minutes
    local elapsed=0
    local sleep_interval=15
    
    while [ $elapsed -lt $max_wait ]; do
        # Get stack status
        local stack_status=$(aws cloudformation describe-stacks \
            --stack-name "${STACK_NAME}" \
            --profile "${AWS_PROFILE}" \
            --region "${AWS_REGION}" \
            --query 'Stacks[0].StackStatus' \
            --output text 2>/dev/null || echo "UNKNOWN")
        
        echo -e "${YELLOW}Current status: ${stack_status}${NC}"
        
        # Check for completion statuses
        case "$stack_status" in
            CREATE_COMPLETE|UPDATE_COMPLETE)
                echo -e "${GREEN}✓ Stack operation completed successfully${NC}"
                echo ""
                return 0
                ;;
            CREATE_FAILED|ROLLBACK_COMPLETE|ROLLBACK_FAILED|DELETE_COMPLETE|DELETE_FAILED|UPDATE_ROLLBACK_COMPLETE|UPDATE_ROLLBACK_FAILED)
                echo -e "${RED}✗ Stack operation failed with status: ${stack_status}${NC}"
                echo -e "${YELLOW}Fetching stack events for more details:${NC}"
                aws cloudformation describe-stack-events \
                    --stack-name "${STACK_NAME}" \
                    --profile "${AWS_PROFILE}" \
                    --region "${AWS_REGION}" \
                    --max-items 10 \
                    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[Timestamp,ResourceType,LogicalResourceId,ResourceStatusReason]' \
                    --output table 2>/dev/null || true
                exit 1
                ;;
            CREATE_IN_PROGRESS|UPDATE_IN_PROGRESS|UPDATE_COMPLETE_CLEANUP_IN_PROGRESS)
                # Continue waiting
                ;;
            UNKNOWN)
                echo -e "${RED}✗ Unable to get stack status${NC}"
                exit 1
                ;;
            *)
                echo -e "${YELLOW}Unexpected status: ${stack_status}${NC}"
                ;;
        esac
        
        sleep $sleep_interval
        elapsed=$((elapsed + sleep_interval))
    done
    
    echo -e "${RED}✗ Timeout waiting for stack operation (${max_wait} seconds)${NC}"
    exit 1
}

# Function to display ACM certificate validation instructions
display_cert_validation() {
    echo -e "${BLUE}Retrieving ACM certificate validation information...${NC}"
    
    # Get ACM certificate ARN from stack outputs
    local cert_arn=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --profile "${AWS_PROFILE}" \
        --region "${AWS_REGION}" \
        --query 'Stacks[0].Outputs[?OutputKey==`ACMCertificateArn`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ -z "$cert_arn" ]; then
        echo -e "${RED}✗ Unable to retrieve ACM certificate ARN${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Certificate ARN: ${cert_arn}${NC}"
    echo ""
    
    # Get certificate validation records
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}ACM Certificate DNS Validation${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo -e "${BLUE}To complete certificate validation, add the following DNS record:${NC}"
    echo ""
    
    # Fetch validation records
    local validation_records=$(aws acm describe-certificate \
        --certificate-arn "${cert_arn}" \
        --profile "${AWS_PROFILE}" \
        --region "${AWS_REGION}" \
        --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
        --output json 2>/dev/null)
    
    if [ -n "$validation_records" ] && [ "$validation_records" != "null" ]; then
        local record_name=$(echo "$validation_records" | grep -o '"Name": "[^"]*"' | cut -d'"' -f4)
        local record_value=$(echo "$validation_records" | grep -o '"Value": "[^"]*"' | cut -d'"' -f4)
        local record_type=$(echo "$validation_records" | grep -o '"Type": "[^"]*"' | cut -d'"' -f4)
        
        echo -e "  ${GREEN}Record Type:${NC} ${record_type}"
        echo -e "  ${GREEN}Record Name:${NC} ${record_name}"
        echo -e "  ${GREEN}Record Value:${NC} ${record_value}"
        echo ""
        echo -e "${YELLOW}Add this CNAME record to your DNS provider (Route 53 or domain registrar)${NC}"
        echo -e "${YELLOW}Note: If using Route 53, the record may be automatically created${NC}"
    else
        echo -e "${YELLOW}Validation records not yet available. They will appear shortly.${NC}"
        echo -e "${YELLOW}You can check the AWS Console for validation details.${NC}"
    fi
    
    echo ""
}

# Function to wait for ACM certificate validation
wait_for_cert_validation() {
    echo -e "${BLUE}Waiting for ACM certificate validation...${NC}"
    
    # Get ACM certificate ARN from stack outputs
    local cert_arn=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --profile "${AWS_PROFILE}" \
        --region "${AWS_REGION}" \
        --query 'Stacks[0].Outputs[?OutputKey==`ACMCertificateArn`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ -z "$cert_arn" ]; then
        echo -e "${RED}✗ Unable to retrieve ACM certificate ARN${NC}"
        exit 1
    fi
    
    local max_wait=1800  # 30 minutes
    local elapsed=0
    local sleep_interval=30
    
    while [ $elapsed -lt $max_wait ]; do
        # Get certificate status
        local cert_status=$(aws acm describe-certificate \
            --certificate-arn "${cert_arn}" \
            --profile "${AWS_PROFILE}" \
            --region "${AWS_REGION}" \
            --query 'Certificate.Status' \
            --output text 2>/dev/null || echo "UNKNOWN")
        
        echo -e "${YELLOW}Certificate status: ${cert_status}${NC}"
        
        case "$cert_status" in
            ISSUED)
                echo -e "${GREEN}✓ Certificate validated successfully${NC}"
                echo ""
                return 0
                ;;
            PENDING_VALIDATION)
                # Continue waiting
                ;;
            FAILED|EXPIRED|REVOKED|VALIDATION_TIMED_OUT)
                echo -e "${RED}✗ Certificate validation failed with status: ${cert_status}${NC}"
                exit 1
                ;;
            UNKNOWN)
                echo -e "${RED}✗ Unable to get certificate status${NC}"
                exit 1
                ;;
            *)
                echo -e "${YELLOW}Unexpected status: ${cert_status}${NC}"
                ;;
        esac
        
        # Check if we should continue waiting
        if [ $elapsed -ge 600 ]; then  # After 10 minutes
            echo -e "${YELLOW}Certificate validation is taking longer than expected.${NC}"
            echo -e "${YELLOW}This can take up to 30 minutes or more depending on DNS propagation.${NC}"
            echo ""
            read -p "Continue waiting? (y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${YELLOW}Exiting. You can check certificate status in AWS Console.${NC}"
                echo -e "${YELLOW}Once validated, run the script again to complete deployment.${NC}"
                exit 0
            fi
        fi
        
        sleep $sleep_interval
        elapsed=$((elapsed + sleep_interval))
    done
    
    echo -e "${RED}✗ Timeout waiting for certificate validation (${max_wait} seconds)${NC}"
    echo -e "${YELLOW}Certificate validation can take up to 48 hours in some cases.${NC}"
    echo -e "${YELLOW}Check the AWS Console for validation status.${NC}"
    exit 1
}

# Function to sync website files to S3
sync_files() {
    echo -e "${BLUE}Syncing website files to S3...${NC}"
    
    # Get S3 bucket name from stack outputs
    local bucket_name=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --profile "${AWS_PROFILE}" \
        --region "${AWS_REGION}" \
        --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ -z "$bucket_name" ]; then
        echo -e "${RED}✗ Unable to retrieve S3 bucket name${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Target bucket: ${bucket_name}${NC}"
    echo ""
    
    # Build AWS S3 sync command with exclusions
    echo -e "${YELLOW}Uploading files...${NC}"
    
    aws s3 sync "${PROJECT_ROOT}" "s3://${bucket_name}" \
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
        --delete
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Files synced successfully${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ File sync failed${NC}"
        exit 1
    fi
}

# Function to invalidate CloudFront cache
invalidate_cache() {
    echo -e "${BLUE}Invalidating CloudFront cache...${NC}"
    
    # Get CloudFront distribution ID from stack outputs
    local distribution_id=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --profile "${AWS_PROFILE}" \
        --region "${AWS_REGION}" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ -z "$distribution_id" ]; then
        echo -e "${RED}✗ Unable to retrieve CloudFront distribution ID${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Distribution ID: ${distribution_id}${NC}"
    
    # Create cache invalidation for all paths
    local invalidation_output=$(aws cloudfront create-invalidation \
        --distribution-id "${distribution_id}" \
        --paths "/*" \
        --profile "${AWS_PROFILE}" \
        2>&1)
    
    if [ $? -eq 0 ]; then
        local invalidation_id=$(echo "$invalidation_output" | grep -o '"Id": "[^"]*"' | head -1 | cut -d'"' -f4)
        echo -e "${GREEN}✓ Cache invalidation created${NC}"
        echo -e "  Invalidation ID: ${invalidation_id}"
        echo -e "  Status: In Progress"
        echo ""
        return 0
    else
        echo -e "${RED}✗ Cache invalidation failed${NC}"
        echo "$invalidation_output"
        exit 1
    fi
}

# Function to display deployment summary
display_summary() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Deployment Summary${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Get all stack outputs
    local outputs=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --profile "${AWS_PROFILE}" \
        --region "${AWS_REGION}" \
        --query 'Stacks[0].Outputs' \
        --output json 2>/dev/null)
    
    if [ -z "$outputs" ] || [ "$outputs" == "null" ]; then
        echo -e "${RED}✗ Unable to retrieve stack outputs${NC}"
        exit 1
    fi
    
    # Extract individual outputs
    local s3_bucket=$(echo "$outputs" | grep -A 1 '"OutputKey": "S3BucketName"' | grep '"OutputValue"' | cut -d'"' -f4)
    local cf_dist_id=$(echo "$outputs" | grep -A 1 '"OutputKey": "CloudFrontDistributionId"' | grep '"OutputValue"' | cut -d'"' -f4)
    local cf_domain=$(echo "$outputs" | grep -A 1 '"OutputKey": "CloudFrontDomainName"' | grep '"OutputValue"' | cut -d'"' -f4)
    local website_url=$(echo "$outputs" | grep -A 1 '"OutputKey": "WebsiteURL"' | grep '"OutputValue"' | cut -d'"' -f4)
    local cert_arn=$(echo "$outputs" | grep -A 1 '"OutputKey": "ACMCertificateArn"' | grep '"OutputValue"' | cut -d'"' -f4)
    
    # Get nameservers (array format)
    local nameservers=$(echo "$outputs" | grep -A 1 '"OutputKey": "Route53NameServers"' | grep '"OutputValue"' | cut -d'"' -f4)
    
    # Display outputs
    echo -e "${GREEN}Stack Name:${NC} ${STACK_NAME}"
    echo -e "${GREEN}Environment:${NC} ${ENVIRONMENT}"
    echo ""
    
    echo -e "${GREEN}S3 Bucket:${NC} ${s3_bucket}"
    echo -e "${GREEN}CloudFront Distribution ID:${NC} ${cf_dist_id}"
    echo -e "${GREEN}CloudFront Domain:${NC} ${cf_domain}"
    echo -e "${GREEN}ACM Certificate ARN:${NC} ${cert_arn}"
    echo ""
    
    echo -e "${GREEN}Website URL:${NC} ${BLUE}${website_url}${NC}"
    echo ""
    
    # Display nameservers
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}Next Steps: Configure Domain Nameservers${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo -e "To complete the deployment, update your domain's nameservers"
    echo -e "at your domain registrar with the following Route 53 nameservers:"
    echo ""
    
    # Parse nameservers from the comma-separated string
    IFS=',' read -ra NS_ARRAY <<< "$nameservers"
    for ns in "${NS_ARRAY[@]}"; do
        # Trim whitespace
        ns=$(echo "$ns" | xargs)
        echo -e "  ${GREEN}•${NC} ${ns}"
    done
    
    echo ""
    echo -e "${YELLOW}Important Notes:${NC}"
    echo -e "  • DNS propagation can take up to 48 hours"
    echo -e "  • You can check DNS propagation status using: dig ${SUBDOMAIN}.${DOMAIN_NAME}"
    echo -e "  • Once DNS propagates, your site will be available at: ${website_url}"
    echo ""
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Main script execution
main() {
    # Validate environment variables (loaded by calling script)
    validate_env
    
    # Validate CloudFormation template
    validate_template
    
    # Deploy CloudFormation stack
    deploy_stack
    
    # Wait for stack operation to complete
    wait_for_stack
    
    # Display certificate validation instructions
    display_cert_validation
    
    # Wait for certificate validation
    wait_for_cert_validation
    
    # Sync website files to S3
    sync_files
    
    # Invalidate CloudFront cache
    invalidate_cache
    
    # Display deployment summary
    display_summary
}

# Run main function
main "$@"

# AWS Infrastructure Deployment Guide

Deploy the Options Trading Journal as a static website using CloudFormation, S3, CloudFront, Route 53, and ACM.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment](#deployment)
- [ACM Certificate Validation](#acm-certificate-validation)
- [Domain Configuration](#domain-configuration)
- [Multi-Environment Setup](#multi-environment-setup)
- [Troubleshooting](#troubleshooting)
- [Rollback](#rollback)

## Prerequisites

**Required:**
- AWS CLI installed and configured (`aws configure`)
- AWS account with permissions for S3, CloudFront, Route 53, ACM, CloudFormation, IAM
- Registered domain name with access to DNS settings
- Bash shell environment

**Verify:**
```bash
aws --version
bash --version
```

## Environment Setup

1. **Create environment file:**
   ```bash
   cd infrastructure
   cp .env.example .env
   ```

2. **Configure variables in `.env`:**
   ```bash
   DOMAIN_NAME=example.com              # Root domain
   SUBDOMAIN=trading                    # Subdomain prefix
   S3_BUCKET_NAME=trading-example-com   # Globally unique bucket name
   ENVIRONMENT=production               # 'production' or 'dev'
   AWS_REGION=us-east-1                 # Must be us-east-1 for ACM
   AWS_PROFILE=default                  # AWS CLI profile
   STACK_NAME=static-website-trading    # CloudFormation stack name
   ```

3. **Verify:**
   ```bash
   grep -q "\.env" ../.gitignore && echo "✓ .env is ignored"
   ```


## Deployment

1. **Run deployment script:**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

2. **Script performs:**
   - Validates environment and CloudFormation template
   - Creates/updates CloudFormation stack (5-15 min)
   - Displays ACM certificate validation instructions
   - Waits for certificate validation
   - Syncs files to S3
   - Invalidates CloudFront cache
   - Shows deployment summary

3. **Verify deployment:**
   ```bash
   # After DNS propagates
   https://trading.example.com
   ```

## ACM Certificate Validation

**Process:**
1. Script displays CNAME record after stack creation:
   ```
   Record Type: CNAME
   Record Name: _abc123def456.trading.example.com
   Record Value: _xyz789uvw012.acm-validations.aws.
   ```

2. **Add CNAME record:**
   - **Route 53**: May be auto-created; verify in AWS Console
   - **Domain Registrar**: Add CNAME in DNS management panel

3. **Wait for validation:**
   - Script polls automatically (5-30 min typical)
   - Can take up to 48 hours in rare cases

**Troubleshooting:**
```bash
# Verify CNAME exists
dig _abc123def456.trading.example.com CNAME

# Check certificate status
aws acm describe-certificate --certificate-arn <arn> --region us-east-1
```


## Domain Configuration

**Update nameservers at your domain registrar:**

1. **Get Route 53 nameservers** (displayed by script):
   ```
   ns-123.awsdns-12.com
   ns-456.awsdns-45.net
   ns-789.awsdns-78.org
   ns-012.awsdns-01.co.uk
   ```

2. **Update at registrar:**
   - **GoDaddy**: My Products → Domains → Manage → Nameservers → Custom
   - **Namecheap**: Domain List → Manage → Nameservers → Custom DNS
   - **Google Domains**: DNS → Name servers → Use custom name servers
   - **Route 53**: Auto-configured

3. **Verify propagation:**
   ```bash
   dig NS example.com                    # Check nameservers
   dig trading.example.com               # Check subdomain
   ```

**DNS propagation:** 5 minutes to 48 hours. Access via CloudFront domain while waiting:
```
https://d1234567890abc.cloudfront.net
```

## Multi-Environment Setup

**Separate dev and production:**

```bash
# .env.production
SUBDOMAIN=trading
S3_BUCKET_NAME=trading-example-com-prod
ENVIRONMENT=production
STACK_NAME=static-website-trading-prod

# .env.dev
SUBDOMAIN=trading-dev
S3_BUCKET_NAME=trading-example-com-dev
ENVIRONMENT=dev
STACK_NAME=static-website-trading-dev
```

**Deploy:**
```bash
cp .env.dev .env && ./scripts/deploy.sh      # Dev
cp .env.production .env && ./scripts/deploy.sh  # Production
```

**Naming conventions:**
- Production: `trading.example.com`
- Development: `trading-dev.example.com`
- Staging: `trading-staging.example.com`


## Troubleshooting

### Environment Errors

**Missing .env file:**
```bash
cp .env.example .env  # Then configure values
```

**Missing variables:**
- Ensure all variables in `.env` have values
- No comments on same line as assignments

**Invalid ENVIRONMENT value:**
- Must be exactly `production` or `dev`

**Bucket name conflict:**
- S3 bucket names are globally unique
- Try: `trading-example-com-a1b2c3`

### CloudFormation Failures

**Check errors:**
```bash
# AWS Console: CloudFormation → Stacks → Events tab
# Or via CLI:
aws cloudformation describe-stack-events \
  --stack-name static-website-trading \
  --max-items 10
```

**Common causes:**
- Insufficient IAM permissions
- AWS service limits exceeded
- Invalid parameters
- Resource name conflicts

**Retry after failure:**
```bash
aws cloudformation delete-stack --stack-name static-website-trading
aws cloudformation wait stack-delete-complete --stack-name static-website-trading
./scripts/deploy.sh
```

### Certificate Issues

**Stuck in PENDING_VALIDATION:**
- Verify CNAME record is correct (exact match)
- Check DNS propagation: `dig _abc123.trading.example.com CNAME`
- Wait up to 48 hours

**Validation failed:**
- Delete stack and redeploy
- Verify DNS permissions
- Consider using Route 53 for DNS


### DNS Problems

**Subdomain not resolving:**
```bash
dig NS example.com                        # Verify nameservers
sudo dscacheutil -flushcache              # Clear DNS cache (macOS)
```

**Check propagation:**
- https://www.whatsmydns.net/
- https://dnschecker.org/

### S3 Sync Errors

**Access denied:**
- Verify AWS credentials have S3 permissions
- Check bucket exists: `aws s3 ls s3://bucket-name`

**Files not uploading:**
- Verify files aren't in excluded directories
- Check file permissions

### CloudFront Cache

**Changes not visible:**
```bash
# Force invalidation
aws cloudfront create-invalidation \
  --distribution-id <dist-id> \
  --paths "/*"

# Check status
aws cloudfront list-invalidations --distribution-id <dist-id>
```

**Browser cache:**
- Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)

### AWS CLI Issues

**No credentials:**
```bash
aws configure
```

**Invalid profile:**
```bash
cat ~/.aws/credentials              # List profiles
aws configure --profile my-profile  # Create profile
```


## Rollback

### File-Level Rollback

**S3 versioning is enabled. Restore previous versions:**

```bash
# List versions
aws s3api list-object-versions \
  --bucket your-bucket-name \
  --prefix index.html

# Restore specific version
aws s3api copy-object \
  --bucket your-bucket-name \
  --copy-source your-bucket-name/index.html?versionId=VERSION_ID \
  --key index.html

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id <dist-id> \
  --paths "/*"
```

### Stack-Level Rollback

**Cancel in-progress update:**
```bash
aws cloudformation cancel-update-stack --stack-name static-website-trading
```

**Continue failed rollback:**
```bash
aws cloudformation continue-update-rollback --stack-name static-website-trading
```

### Complete Rebuild

**Backup, delete, and redeploy:**

```bash
# 1. Backup
cp .env .env.backup
aws s3 sync s3://your-bucket-name ./backup-files/
aws cloudformation get-template --stack-name static-website-trading > backup-template.yaml

# 2. Delete
aws cloudformation delete-stack --stack-name static-website-trading
aws cloudformation wait stack-delete-complete --stack-name static-website-trading

# 3. Redeploy
./scripts/deploy.sh

# 4. Restore files
aws s3 sync ./backup-files/ s3://your-bucket-name/
aws cloudfront create-invalidation --distribution-id <new-dist-id> --paths "/*"

# 5. Update nameservers at registrar (new NS records)
```

**Best practices:**
- Test in dev before production
- Keep `.env` files backed up
- Version control CloudFormation templates
- Document all changes

---

## Resources

- [AWS CloudFormation](https://docs.aws.amazon.com/cloudformation/)
- [Amazon S3](https://docs.aws.amazon.com/s3/)
- [Amazon CloudFront](https://docs.aws.amazon.com/cloudfront/)
- [Amazon Route 53](https://docs.aws.amazon.com/route53/)
- [AWS Certificate Manager](https://docs.aws.amazon.com/acm/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)


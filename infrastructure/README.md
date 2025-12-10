# AWS Infrastructure Deployment Guide

Deploy the Options Trading Journal as a static website using CloudFormation, S3, CloudFront, Route 53, and ACM.

## Quick Start - Repeat Deployments

**Already set up? Choose your deployment method:**

### Full Deployment (Infrastructure + Files)
```bash
cd infrastructure

# Deploy to development
./scripts/deploy-dev.sh

# Deploy to production
./scripts/deploy-prod.sh
```

### Quick Sync (Files Only)
For when you only need to update website files without touching CloudFormation:

```bash
cd infrastructure

# Sync to development
./scripts/sync-dev.sh

# Sync to production
./scripts/sync-prod.sh
```

**When to use each:**
- **Full deployment**: First time setup, infrastructure changes, or when you get "no changes" errors
- **Quick sync**: Daily development, content updates, bug fixes

Both methods sync your latest files to S3 and invalidate the CloudFront cache. Changes are live in 1-2 minutes.

---

## Table of Contents

- [Quick Start - Repeat Deployments](#quick-start---repeat-deployments)
- [First Time Setup](#first-time-setup)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Initial Deployment](#initial-deployment)
  - [ACM Certificate Validation](#acm-certificate-validation)
  - [Domain Configuration](#domain-configuration)
- [Multi-Environment Setup](#multi-environment-setup)
- [Troubleshooting](#troubleshooting)
- [Rollback](#rollback)

---

## First Time Setup

### Prerequisites

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

### Environment Setup

Environment-specific configuration files are pre-configured:
- `.env.dev` - Development environment settings
- `.env.production` - Production environment settings

**Configure your domain and bucket names:**

Edit `.env.production` for production:
```bash
DOMAIN_NAME=example.com              # Root domain
SUBDOMAIN=trading                    # Subdomain prefix
S3_BUCKET_NAME=trading-example-com   # Globally unique bucket name
```

Edit `.env.dev` for development:
```bash
DOMAIN_NAME=example.com              # Root domain
SUBDOMAIN=trading-dev                # Subdomain prefix
S3_BUCKET_NAME=trading-example-com-dev   # Globally unique bucket name
```

### Initial Deployment

**One-shot deployment - choose your environment:**

**For Development:**
```bash
cd infrastructure
./scripts/deploy-dev.sh
```

**For Production:**
```bash
cd infrastructure
./scripts/deploy-prod.sh
```

The script will:
- Load environment-specific configuration
- Validate CloudFormation template
- Create/update CloudFormation stack (5-15 min)
  - For updates: creates change set and shows proposed changes
  - For new stacks: applies stack policy for resource protection
- Display ACM certificate validation instructions
- Wait for certificate validation
- Sync files to S3
- Invalidate CloudFront cache
- Show deployment summary

**Production Safety:** The production script includes a confirmation prompt before proceeding.

**Verify deployment:**
```bash
# After DNS propagates
https://trading.example.com        # Production
https://trading-dev.example.com    # Development

# Check security headers
curl -I https://trading-dev.example.com
```

**What gets created:**
- Main S3 bucket (with encryption and versioning)
- Logging S3 bucket (with 90-day retention)
- CloudFront distribution (with OAC and security headers)
- Route 53 hosted zone
- ACM certificate
- Stack policy (protects critical resources)

### ACM Certificate Validation

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


### Domain Configuration

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

Development and production environments are managed through separate configuration files and deployment scripts.

**Environment files:**
- `.env.dev` - Development configuration
- `.env.production` - Production configuration

**Deployment scripts:**
- `./scripts/deploy-dev.sh` - Deploy to development
- `./scripts/deploy-prod.sh` - Deploy to production

**Naming conventions:**
- Production: `trading.example.com`
- Development: `trading-dev.example.com`

Each environment maintains its own:
- CloudFormation stack
- S3 bucket
- CloudFront distribution
- ACM certificate
- Route 53 DNS records


## Troubleshooting

### Environment Errors

**Missing environment file:**
- Ensure `.env.dev` or `.env.production` exists
- Copy from `.env.example` if needed

**Missing variables:**
- Ensure all variables in environment files have values
- No comments on same line as assignments

**Invalid ENVIRONMENT value:**
- Must be exactly `production` or `dev`

**Bucket name conflict:**
- S3 bucket names are globally unique
- Try: `trading-example-com-a1b2c3`

### CloudFormation Failures

**"No changes" error:**
If you get "The submitted information didn't contain changes", your infrastructure is already up-to-date. Use the quick sync scripts instead:
```bash
./scripts/sync-dev.sh     # For development
./scripts/sync-prod.sh    # For production
```

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

## Security & Best Practices

**Recent Updates (Nov 2024):**
- Migrated from deprecated OAI to Origin Access Control (OAC)
- Added S3 encryption (SSE-S3), HTTPS-only enforcement, and access logging (90-day retention)
- Implemented CloudFront security headers (HSTS, XSS protection, frame options)
- Added change sets for safe updates and stack policies to protect critical resources

**Key Features:**
- **OAC**: Modern CloudFront-to-S3 auth supporting SSE-KMS and all regions
- **Encryption**: Server-side encryption at rest, HTTPS-only in transit
- **Logging**: Access logs in separate bucket with auto-cleanup
- **Headers**: HSTS, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- **Protection**: Stack policies prevent accidental deletion; change sets preview updates before applying

## Resources

- [AWS CloudFormation](https://docs.aws.amazon.com/cloudformation/)
- [Amazon S3](https://docs.aws.amazon.com/s3/)
- [Amazon CloudFront](https://docs.aws.amazon.com/cloudfront/)
- [Amazon Route 53](https://docs.aws.amazon.com/route53/)
- [AWS Certificate Manager](https://docs.aws.amazon.com/acm/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)
- [CloudFront Origin Access Control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)


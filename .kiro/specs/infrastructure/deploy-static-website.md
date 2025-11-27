# AWS Deployment Requirements

## Overview
Deploy the options trading journal as a static website using AWS S3 + CloudFront with custom subdomain routing.

## Deployment Configuration Decisions

Based on requirements gathering:
- **Route 53**: CloudFormation will create the hosted zone
- **Subdomain**: Parameterized via environment variable (e.g., `trading`, `journal`)
- **Domain Support**: Subdomain only (not root domain)
- **ACM Certificate**: CloudFormation will create and validate specific subdomain certificate (requires manual DNS validation step)
- **S3 Versioning**: Enabled for rollback capability
- **S3 Logging**: Disabled
- **CloudFront Logging**: Disabled
- **CloudFront Price Class**: Fixed to `PriceClass_All` (not parameterized)
- **Sample Data**: Excluded from production deployments (deployment script will explicitly include only necessary files)
- **Deployment Automation**: Single script that syncs files to S3 and invalidates CloudFront cache
- **Environments**: Support for 2 environments (dev and production) using separate buckets in the same AWS account

## Architecture Components

### 1. S3 Bucket
- **Purpose**: Host static website files (HTML, CSS, JS, assets)
- **Bucket Name**: Parameterized - should match subdomain name
- **Configuration**:
  - Enable static website hosting
  - Set index document: `index.html`
  - Set error document: `index.html` (for SPA-like behavior)
  - Block public access: OFF (CloudFront will access it)
  - Bucket policy: Allow CloudFront OAI (Origin Access Identity) to read objects
  - **Versioning**: Enabled for rollback capability
  - **Access Logging**: Disabled

### 2. CloudFront Distribution
- **Purpose**: CDN for fast global delivery, HTTPS support, custom domain
- **Configuration**:
  - Origin: S3 bucket (via OAI, not public URL)
  - Default root object: `index.html`
  - Viewer protocol policy: Redirect HTTP to HTTPS
  - Allowed HTTP methods: GET, HEAD, OPTIONS
  - Compress objects automatically: Yes
  - Price class: `PriceClass_All` (all edge locations)
  - Alternate domain names (CNAMEs): Parameterized subdomain
  - SSL certificate: ACM certificate for custom domain (must be in us-east-1)
  - Default TTL: 86400 (1 day) - adjust as needed
  - Custom error responses:
    - 403 → 200 with `/index.html` (for SPA routing)
    - 404 → 200 with `/index.html` (for SPA routing)
  - **Access Logging**: Disabled

### 3. Route 53 DNS
- **Purpose**: Route subdomain traffic to CloudFront
- **Configuration**:
  - Hosted zone: Created by CloudFormation (parameterized domain name)
  - Record type: A record (Alias)
  - Alias target: CloudFront distribution
  - Subdomain name: Parameterized
  - **Note**: After hosted zone creation, you'll need to update your domain registrar's nameservers to point to the Route 53 nameservers

### 4. ACM Certificate
- **Purpose**: Enable HTTPS for custom domain
- **Configuration**:
  - Region: us-east-1 (required for CloudFront)
  - Domain: Specific subdomain certificate (e.g., `trading.example.com`)
  - Validation: DNS validation via Route 53
  - **Note**: Certificate creation requires manual validation step - you'll need to add DNS records to validate domain ownership

## Parameters (Environment Variables / Config)

All sensitive and environment-specific values should be externalized:

```bash
# Domain Configuration
DOMAIN_NAME=example.com                    # Your root domain
SUBDOMAIN=trading                          # Subdomain prefix (e.g., 'trading' or 'trading-dev')
FULL_DOMAIN=${SUBDOMAIN}.${DOMAIN_NAME}   # e.g., trading.example.com

# AWS Configuration
AWS_REGION=us-east-1                       # Primary region (required for ACM certificates)
S3_BUCKET_NAME=${FULL_DOMAIN}             # Bucket name matches subdomain

# Environment
ENVIRONMENT=production                     # production or dev
```

## Deployment Steps

### Prerequisites
1. AWS account with appropriate permissions (CloudFormation, S3, CloudFront, Route53, ACM)
2. AWS CLI configured with credentials
3. Domain registered (you'll update nameservers after deployment)
4. Environment variables configured in `.env` file

### Deployment Process
1. **Deploy CloudFormation stack** - creates all infrastructure (S3, CloudFront, Route53, ACM)
2. **Validate ACM certificate** - add DNS validation records (manual step, guided by deployment script)
3. **Update domain nameservers** - point to Route 53 nameservers (manual step, one-time)
4. **Upload website files** - deployment script syncs files to S3 (excludes sample-data/)
5. **Invalidate CloudFront cache** - deployment script triggers cache invalidation
6. **Test deployment** - verify site is accessible via subdomain URL

### Deployment Automation
Per project standards:
- **CloudFormation** will be used for AWS infrastructure as code
- All infrastructure code will be in the `infrastructure/` directory
- Deployment scripts will be provided to deploy the CloudFormation template
- Infrastructure-specific README will document deployment process

## File Structure for Deployment

Files to be deployed (sample-data/ excluded):

```
/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── *.js
│   └── visualizations/
├── lib/
│   ├── d3.v7.min.js
│   ├── d3-sankey.min.js
│   └── tailwind.min.js
└── assets/
```

**Excluded from deployment**: `sample-data/`, `tests/`, `.git/`, `.kiro/`, `node_modules/`, `.env`

## Security Considerations

1. **S3 Bucket**:
   - Not publicly accessible (CloudFront OAI only)
   - No sensitive data in bucket (all params externalized)
   - Versioning enabled for rollback capability
   - Access logging disabled (cost optimization)

2. **CloudFront**:
   - Force HTTPS (redirect HTTP)
   - Use security headers (via Lambda@Edge if needed)
   - Enable AWS WAF if needed for additional protection
   - Access logging disabled (cost optimization)

3. **Secrets Management**:
   - Store parameters in AWS Systems Manager Parameter Store or Secrets Manager
   - Use environment variables for deployment scripts
   - Never commit sensitive values to git

## Cost Optimization

- Use CloudFront caching effectively (set appropriate TTLs)
- Compress assets before upload (gzip/brotli)
- Use appropriate CloudFront price class based on user geography
- Enable S3 lifecycle policies if needed
- Monitor usage with AWS Cost Explorer

## Monitoring & Maintenance

- CloudFront and S3 access logs disabled for cost optimization
- Optional: Set up CloudWatch alarms for:
  - 4xx/5xx error rates
  - Request counts
  - Data transfer anomalies
- Regular security audits
- Certificate renewal monitoring (ACM auto-renews, but monitor via AWS console)

## Rollback Strategy

1. Keep previous version in S3 (enable versioning)
2. CloudFront invalidation for immediate updates
3. Route 53 can quickly point to different distribution if needed
4. Maintain deployment scripts for quick redeployment

## Example Configuration File

Create a `.env.example` file (not committed with real values):

```bash
# AWS Deployment Configuration
# Copy to .env and fill in your values

# Domain Configuration
DOMAIN_NAME=example.com
SUBDOMAIN=trading              # Use 'trading' for production, 'trading-dev' for dev
ENVIRONMENT=production         # 'production' or 'dev'

# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default

# CloudFormation Stack Name (auto-generated from subdomain)
STACK_NAME=static-website-${SUBDOMAIN}
```

Add `.env` to `.gitignore` to prevent accidental commits.

## Implementation Plan

Per project standards, the following will be created in the `infrastructure/` directory:

1. **CloudFormation Template** (`infrastructure/cloudformation.yaml`):
   - Define all AWS resources (S3, CloudFront, Route53 Hosted Zone, ACM Certificate)
   - Use parameters for domain name and subdomain
   - Include outputs for:
     - S3 bucket name
     - CloudFront distribution ID and domain
     - Route 53 nameservers (for domain registrar update)
     - ACM certificate ARN and validation records
     - Website URL

2. **Deployment Script** (`infrastructure/deploy.sh`):
   - Load environment variables from `.env`
   - Validate CloudFormation template
   - Deploy/update stack with parameters
   - Wait for stack creation/update
   - Display ACM certificate validation instructions
   - Wait for certificate validation (with timeout)
   - Sync website files to S3 (explicitly include only necessary files, exclude sample-data/)
   - Invalidate CloudFront cache
   - Display deployment summary and next steps

3. **Infrastructure README** (`infrastructure/README.md`):
   - Prerequisites and setup instructions
   - Environment variable configuration guide
   - Step-by-step deployment process
   - ACM certificate validation instructions
   - Domain nameserver update instructions
   - Multi-environment setup (dev vs production)
   - Troubleshooting guide
   - Rollback procedures

4. **Parameter Configuration** (`.env` - gitignored):
   - Environment-specific values
   - Never committed to repository
   - Template provided as `.env.example`

## Next Steps

1. Create `infrastructure/` directory structure
2. Develop CloudFormation template with parameterized resources
3. Create deployment script for stack management
4. Document deployment process in infrastructure README
5. Test deployment in staging environment first

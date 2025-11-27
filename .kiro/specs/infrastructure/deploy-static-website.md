# AWS Deployment Requirements

## Overview
Deploy the options trading journal as a static website using AWS S3 + CloudFront with custom subdomain routing.

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

### 2. CloudFront Distribution
- **Purpose**: CDN for fast global delivery, HTTPS support, custom domain
- **Configuration**:
  - Origin: S3 bucket (via OAI, not public URL)
  - Default root object: `index.html`
  - Viewer protocol policy: Redirect HTTP to HTTPS
  - Allowed HTTP methods: GET, HEAD, OPTIONS
  - Compress objects automatically: Yes
  - Price class: Use all edge locations (or parameterize)
  - Alternate domain names (CNAMEs): Parameterized subdomain
  - SSL certificate: ACM certificate for custom domain (must be in us-east-1)
  - Default TTL: 86400 (1 day) - adjust as needed
  - Custom error responses:
    - 403 → 200 with `/index.html` (for SPA routing)
    - 404 → 200 with `/index.html` (for SPA routing)

### 3. Route 53 DNS
- **Purpose**: Route subdomain traffic to CloudFront
- **Configuration**:
  - Hosted zone: Existing domain (parameterized)
  - Record type: A record (Alias)
  - Alias target: CloudFront distribution
  - Subdomain name: Parameterized

### 4. ACM Certificate
- **Purpose**: Enable HTTPS for custom domain
- **Configuration**:
  - Region: us-east-1 (required for CloudFront)
  - Domain: Parameterized subdomain (e.g., `*.yourdomain.com` or specific subdomain)
  - Validation: DNS validation via Route 53

## Parameters (Environment Variables / Config)

All sensitive and environment-specific values should be externalized:

```bash
# Domain Configuration
DOMAIN_NAME=example.com                    # Your root domain
SUBDOMAIN=trading                          # Subdomain prefix
FULL_DOMAIN=${SUBDOMAIN}.${DOMAIN_NAME}   # e.g., trading.example.com

# AWS Configuration
AWS_REGION=us-east-1                       # Primary region
S3_BUCKET_NAME=${FULL_DOMAIN}             # Bucket name matches subdomain
CLOUDFRONT_PRICE_CLASS=PriceClass_All     # or PriceClass_100, PriceClass_200

# Optional
ENVIRONMENT=production                     # production, staging, dev
```

## Deployment Steps

### Prerequisites
1. AWS account with appropriate permissions
2. AWS CLI configured with credentials
3. Domain registered and Route 53 hosted zone created
4. ACM certificate requested and validated for subdomain

### Deployment Process
1. **Create S3 bucket** with parameterized name
2. **Configure bucket** for static website hosting
3. **Upload website files** to S3 bucket
4. **Create CloudFront OAI** for secure S3 access
5. **Update S3 bucket policy** to allow OAI access
6. **Create CloudFront distribution** with custom domain
7. **Create/update Route 53 record** pointing to CloudFront
8. **Test deployment** via subdomain URL

### Deployment Automation
Per project standards:
- **CloudFormation** will be used for AWS infrastructure as code
- All infrastructure code will be in the `infrastructure/` directory
- Deployment scripts will be provided to deploy the CloudFormation template
- Infrastructure-specific README will document deployment process

## File Structure for Deployment

```
/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── *.js
│   └── visualizations/
├── lib/
├── assets/
└── sample-data/ (optional - may exclude from production)
```

## Security Considerations

1. **S3 Bucket**:
   - Not publicly accessible (CloudFront OAI only)
   - No sensitive data in bucket (all params externalized)
   - Enable versioning for rollback capability
   - Enable server access logging

2. **CloudFront**:
   - Force HTTPS (redirect HTTP)
   - Use security headers (via Lambda@Edge if needed)
   - Enable AWS WAF if needed for additional protection
   - Enable access logging

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

- Enable CloudFront access logs
- Enable S3 access logs
- Set up CloudWatch alarms for:
  - 4xx/5xx error rates
  - Request counts
  - Data transfer anomalies
- Regular security audits
- Certificate renewal monitoring (ACM auto-renews, but monitor)

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

DOMAIN_NAME=example.com
SUBDOMAIN=trading
AWS_REGION=us-east-1
AWS_PROFILE=default
CLOUDFRONT_PRICE_CLASS=PriceClass_All
ENVIRONMENT=production
```

Add `.env` to `.gitignore` to prevent accidental commits.

## Implementation Plan

Per project standards, the following will be created in the `infrastructure/` directory:

1. **CloudFormation Template** (`infrastructure/cloudformation.yaml`):
   - Define all AWS resources (S3, CloudFront, Route53, ACM)
   - Use parameters for all environment-specific values
   - Include outputs for resource ARNs and URLs

2. **Deployment Script** (`infrastructure/deploy.sh`):
   - Validate CloudFormation template
   - Deploy/update stack with parameters
   - Handle stack creation vs. update
   - Upload website files to S3
   - Invalidate CloudFront cache

3. **Infrastructure README** (`infrastructure/README.md`):
   - Prerequisites and setup instructions
   - Parameter configuration guide
   - Deployment commands
   - Troubleshooting guide

4. **Parameter Configuration** (`.env` - gitignored):
   - Environment-specific values
   - Never committed to repository

## Next Steps

1. Create `infrastructure/` directory structure
2. Develop CloudFormation template with parameterized resources
3. Create deployment script for stack management
4. Document deployment process in infrastructure README
5. Test deployment in staging environment first

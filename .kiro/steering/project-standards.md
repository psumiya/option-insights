# Project Standards

This file contains standards and guidelines that Kiro will follow when working in this workspace.

## Code Style
- Write clean, readable code with meaningful variable names
- Add comments for complex logic
- Follow language-specific best practices

## Testing
- Ensure there is no regression when a change is proposed.
- Write tests for core functionality
- Focus on unit tests for critical business logic
- Keep tests maintainable and focused

## Documentation
- Document public APIs and interfaces
- Keep README files up to date
- Add inline comments where code intent isn't obvious
- Update documentation when any changes are made.
- Keep documentation pithy. Avoid verbosity.

## Git Practices
- Write clear, descriptive commit messages
- Keep commits focused on single changes
- Review changes before committing

## Infrastructure
- All infrastructure should be created in an infrastructure directory.
- For AWS infrastructure, use CloudFormation template for Infrastructure as Code.
- For any other infrastructure, use Terraform.
- Ensure no secrets are accidentally committed.
- Use parameters when creating Cloudformation templates.
- Provide a deployment script to deploy the Cloudformation template.
- Add a README specific to the deployment scripts in the infrastructure directory.
- When executing a changeset against production or applying any changes to production infrastructure, always prompt the user and ask for confirmation before proceeding.
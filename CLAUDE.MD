# Claude Code Development Guide

This document provides guidelines for AI assistants (like Claude Code) when working on this project.

## Project Overview

Telegram News Summarizer - An AWS Lambda-based serverless application that collects news from Telegram channels, generates AI-powered summaries using Claude AI, and publishes them to a Telegram channel.

## Core Development Principles

### SOLID Principles

This project strictly adheres to SOLID principles. All code changes must respect these principles:

#### 1. Single Responsibility Principle (SRP)
- Each class/module should have one, and only one, reason to change
- Keep services focused: `NewsSource` only collects news, `AIService` only generates content, `PublishingService` only publishes
- Avoid mixing concerns like data collection and transformation in the same class

#### 2. Open/Closed Principle (OCP)
- Classes should be open for extension but closed for modification
- Use abstract interfaces (`NewsSource`, `AIService`, `PublishingService`) to allow new implementations
- When adding new news sources or AI providers, extend via new implementations rather than modifying existing code

#### 3. Liskov Substitution Principle (LSP)
- Implementations of interfaces must be fully substitutable
- Any `NewsSource` implementation should work with the main orchestrator without special handling
- Respect interface contracts and method signatures

#### 4. Interface Segregation Principle (ISP)
- Keep interfaces focused and minimal
- Don't force classes to implement methods they don't need
- Split large interfaces into smaller, more specific ones if needed

#### 5. Dependency Inversion Principle (DIP)
- Depend on abstractions, not concretions
- Main orchestration logic depends on abstract interfaces (`NewsSource`, `AIService`, etc.), not concrete implementations
- Use dependency injection to provide concrete implementations

### Code Quality Standards

- **TypeScript**: Use strict TypeScript with proper typing, avoid `any`
- **Error Handling**: Implement comprehensive error handling with proper logging
- **Async/Await**: Prefer async/await over callbacks or raw promises
- **Immutability**: Prefer const over let, avoid mutating objects when possible
- **Functional Approach**: Prefer pure functions where applicable

## AWS Preferences

### Primary AWS Services

When implementing features, prefer these AWS services:

1. **Lambda**: Primary compute platform for serverless functions
2. **Bedrock**: Preferred AI service for Claude models (use Anthropic API as fallback)
3. **CloudWatch Logs**: All logging and monitoring
4. **CloudWatch Events/EventBridge**: Scheduling and event-driven triggers
5. **Systems Manager Parameter Store**: Configuration and non-sensitive secrets
6. **Secrets Manager**: Sensitive credentials (API keys, tokens)
7. **DynamoDB**: If replacing MongoDB, use DynamoDB as the AWS-native option
8. **S3**: For storing large files, backups, or artifacts
9. **SQS**: For message queuing if async processing is needed
10. **SNS**: For notifications and alerts

### AWS Best Practices

- **IAM Roles**: Use minimal required permissions, follow least privilege principle
- **VPC**: Use VPC for database connections when needed
- **Environment Variables**: Use Lambda environment variables for configuration
- **Layers**: Consider Lambda Layers for shared dependencies
- **Timeouts**: Set appropriate timeouts (current: 300s for news processing)
- **Memory**: Allocate appropriate memory (current: 512MB)
- **Cold Starts**: Be mindful of Lambda cold starts, keep dependencies minimal
- **Costs**: Monitor costs and optimize resource usage

### Serverless Framework

- Use Serverless Framework for deployment and infrastructure as code
- Keep `serverless.yml` clean and well-organized
- Use environment-specific configurations via stages
- Document all custom resources and plugins

## Project Structure

```
src/
├── services/         # Business logic services (NewsSource, AIService, etc.)
├── models/          # Data models and interfaces
├── config/          # Configuration loaders
└── handler.ts       # Lambda entry point
config/              # JSON configuration files
tests/               # Test files
```

## Code Modification Guidelines

### When Adding Features

1. **Check Existing Abstractions**: Use existing interfaces before creating new ones
2. **Follow Patterns**: Match existing code style and patterns
3. **Update Config**: Add new configuration options to `config/` files
4. **Add Tests**: Include unit tests for new functionality
5. **Update Documentation**: Update README.md and this file as needed

### When Refactoring

1. **Maintain SOLID**: Ensure refactoring improves SOLID compliance
2. **Don't Break Interfaces**: Maintain backward compatibility with abstractions
3. **Incremental Changes**: Make small, testable changes
4. **Preserve Behavior**: Ensure existing functionality remains unchanged

### When Fixing Bugs

1. **Root Cause**: Identify and fix the root cause, not symptoms
2. **Add Tests**: Add tests to prevent regression
3. **Logging**: Ensure proper error logging is in place
4. **Error Handling**: Improve error handling if it was the cause

## Technology Stack

- **Runtime**: Node.js (AWS Lambda)
- **Language**: TypeScript
- **AI**: AWS Bedrock (preferred for AWS integration), fallback to Claude AI (Anthropic API)
- **Database**: MongoDB (consider DynamoDB for full AWS integration)
- **Message Platform**: Telegram
- **Deployment**: Serverless Framework
- **Cloud Provider**: AWS

## Configuration Management

- **Environment Variables**: Use `.env` for local development
- **Lambda Environment**: Configure via `serverless.yml` for deployment
- **JSON Config**: Use `config/channels.json` and `config/prompts.json`
- **Secrets**: Store sensitive data in AWS Secrets Manager or SSM Parameter Store

## Testing Strategy

- **Unit Tests**: Test individual services and functions
- **Integration Tests**: Test service interactions
- **Mocking**: Mock external services (Telegram, Claude, MongoDB)
- **Coverage**: Aim for high test coverage on business logic

## Deployment

- **Stages**: Use `dev` and `prod` stages only
- **Regions**: Default to `us-east-1`, support multi-region if needed
- **CI/CD**: Consider GitHub Actions or AWS CodePipeline for automation
- **Rollback**: Ensure easy rollback capability via Serverless Framework

## Performance Considerations

- **Lambda Optimization**: Keep cold start time minimal
- **Database Queries**: Optimize MongoDB queries, add proper indexes
- **API Calls**: Minimize external API calls, implement caching where appropriate
- **Batching**: Process items in batches when possible
- **Timeouts**: Set appropriate timeouts for all external calls

## Security Guidelines

- **Credentials**: Never hardcode credentials, use environment variables
- **IAM**: Use minimal required IAM permissions
- **Validation**: Validate all external inputs
- **Encryption**: Use encryption at rest and in transit
- **Logging**: Don't log sensitive information
- **Dependencies**: Regularly update dependencies and scan for vulnerabilities

## Common Tasks

### Adding a New News Source

1. Create a new class implementing the `NewsSource` interface
2. Follow SOLID principles, especially SRP and DIP
3. Add configuration support in `config/channels.json`
4. Register the new source in `handler.ts`
5. Add tests for the new implementation

### Adding a New AI Provider

1. Create a new class implementing the `AIService` interface
2. Keep the interface contract identical
3. Add provider-specific configuration
4. Update environment variables in `.env` and `serverless.yml`
5. Ensure error handling matches existing patterns

### Migrating to DynamoDB

1. Create new `StorageService` interface
2. Implement `MongoDBStorage` for current implementation
3. Implement `DynamoDBStorage` for AWS-native solution
4. Use dependency injection to switch between implementations
5. Update `serverless.yml` to provision DynamoDB table
6. Add proper indexes and capacity planning

## Anti-Patterns to Avoid

- **Don't** violate SOLID principles for quick fixes
- **Don't** add AWS-specific code directly in business logic (use abstractions)
- **Don't** create tight coupling between services
- **Don't** use `any` type in TypeScript
- **Don't** ignore errors or use empty catch blocks
- **Don't** hardcode configuration values
- **Don't** mix concerns in a single class/function
- **Don't** create god objects or god functions
- **Don't** over-engineer simple solutions

## Questions to Ask Before Making Changes

1. Does this change follow SOLID principles?
2. Can this be solved with existing abstractions?
3. Is this the simplest solution that works?
4. Does this introduce tight coupling?
5. Is this testable?
6. Does this align with AWS best practices?
7. Will this work in a serverless/stateless environment?
8. Are there AWS-native services that could be used instead?

## Preferred Patterns

- **Dependency Injection**: Pass dependencies via constructor
- **Factory Pattern**: For creating service instances
- **Strategy Pattern**: For swappable implementations (NewsSource, AIService)
- **Repository Pattern**: For data access abstractions
- **Builder Pattern**: For complex object construction
- **Async/Await**: For asynchronous operations

## Language and Communication

- Generate summaries and posts in **Ukrainian language**
- Error messages and logs in **English**
- Code comments in **English**
- Configuration labels can be in **English**

## Future Considerations

- **Multi-Language Support**: Architecture should support adding other languages
- **Scaling**: Design for horizontal scaling (Lambda auto-scales)
- **Monitoring**: Add CloudWatch metrics and alarms
- **Cost Optimization**: Monitor and optimize AWS costs
- **Feature Flags**: Consider feature flag system for gradual rollouts
- **A/B Testing**: Support for testing different prompts/configurations

## Contact and Context

When working on this project:
- Assume AWS Lambda serverless environment
- Respect the SOLID architecture already in place
- Ask clarifying questions if requirements conflict with SOLID principles
- Suggest AWS-native solutions when alternatives are needed
- Keep the focus on maintainability and extensibility

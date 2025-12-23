<!--
Sync Impact Report:
Version: 1.0.0 (Initial Constitution)
Ratification Date: 2025-12-22
Last Amended: 2025-12-22

Modified Principles: N/A (Initial version)
Added Sections:
  - Core Principles (5 principles aligned with IGA prototype requirements)
  - Architecture Constraints
  - Development Workflow
  - Governance

Templates Status:
  ✅ plan-template.md - Constitution Check section will reference these principles
  ✅ spec-template.md - Aligns with modular, governance-first requirements
  ✅ tasks-template.md - Task categorization supports phased delivery and testing

Follow-up TODOs: None - all placeholders filled
-->

# Identity Governance Application Constitution

## Core Principles

### I. Governance First, Provisioning Later

**Rule**: All features MUST prioritize visibility and policy (read/review capabilities) before implementing automation (write/provisioning capabilities).

**Rationale**: Understanding "who has access to what" is foundational to identity governance. Access reviews, certification campaigns, and visibility dashboards must be functional before building automated provisioning flows. This de-risks the system by ensuring governance controls are in place before granting the system write permissions to downstream applications.

**Application**:
- New feature work starts with data collection and reporting
- Approval workflows and policy checks come before automated account operations
- UI displays access relationships before allowing modification
- Testing validates that policy violations are detected before remediation is automated

### II. Modular Service Architecture

**Rule**: The system MUST adopt a hub-and-spoke architecture with clearly defined, independently deployable services.

**Components**:
- **Identity Registry**: Central correlation engine mapping identities to accounts across systems
- **Connector Framework**: Abstraction layer translating generic commands to system-specific APIs (REST, LDAP, SCIM)
- **Governance Engine**: Policy enforcement, approval workflows, SoD (Segregation of Duties) checks, and access certifications
- **Provisioner**: Execution layer for create/modify/delete operations on target systems
- **Self-Service Portal**: End-user interface for access requests and approvals

**Rationale**: Modularity enables independent scaling, testing, and replacement of components. The hub-and-spoke model centralizes governance logic while allowing flexible connector development for diverse target systems.

### III. Single Authoritative Source for Identity Data

**Rule**: The system MUST identify and rely on one authoritative source of truth (e.g., HRIS) for core identity attributes.

**Requirements**:
- Clearly document which system is authoritative for employee records
- Identity Registry synchronizes FROM authoritative source (read-only relationship)
- Conflicts between sources must be resolved via documented precedence rules
- Changes to authoritative source trigger identity lifecycle events (Joiner-Mover-Leaver)

**Rationale**: Multiple conflicting sources of identity data lead to inconsistency, orphaned accounts, and compliance failures. A single source of truth ensures that identity lifecycle events (new hire, termination, role change) are reliably detected and processed.

### IV. Lifecycle Workflow Definition

**Rule**: All identity lifecycle scenarios (Joiner-Mover-Leaver) MUST be explicitly defined, documented, and testable.

**Required Workflows**:
- **Joiner**: New identity created → birthright access provisioned → approvals triggered for role-based access
- **Mover**: Role/department change detected → access recertification triggered → entitlements adjusted
- **Leaver**: Termination detected → immediate revocation of all access → account deactivation/deletion on defined schedule

**Testing Requirements**:
- Each workflow must have integration tests simulating the full lifecycle event
- Access changes must be auditable with before/after state captured
- Rollback procedures must be documented and tested

**Rationale**: Identity lifecycle events are the most critical and risky operations in IGA. Poorly defined workflows result in orphaned accounts, access creep, and compliance violations. Explicit definition ensures consistency and auditability.

### V. API-First Integration Pattern

**Rule**: All system integration points MUST expose REST APIs with standardized request/response schemas.

**Requirements**:
- Unified Identity Graph accessible via REST API
- Connector Framework exposes common interface (create/read/update/delete/search operations)
- All identity operations return standardized success/error responses
- API contracts documented using OpenAPI/Swagger specification

**Rationale**: API-first design enables integration with external HRIS, ITSM ticketing systems, and target applications. Standardized contracts reduce integration friction and enable external audit tools to query access state programmatically.

## Architecture Constraints

### Technology Stack

**Backend**: Microservices-based, language-agnostic per service (recommended: Node.js/Python for rapid prototyping)
**Database**: Support for graph relationships (e.g., Neo4j, PostgreSQL with graph extensions) to model complex access hierarchies
**API Layer**: REST with JSON payloads; OpenAPI specification required
**Connector Framework**: Plugin-based architecture allowing custom connector development
**Authentication**: Support for enterprise SSO (SAML/OIDC) for admin access
**Audit Logging**: All access changes must be logged immutably (append-only audit trail)

### Deployment Model

**Prototype Stage**: Monolith acceptable with clear service boundaries in code
**Production Target**: Containerized microservices (Docker/Kubernetes) with independent scaling
**Data Residency**: Must support on-premise deployment for sensitive identity data
**High Availability**: Not required for prototype; design with eventual HA migration in mind

### Security Requirements

**Principle of Least Privilege**: IGA system accounts must have minimum necessary permissions on target systems
**Credential Storage**: Connector credentials encrypted at rest; support for external secret management (e.g., HashiCorp Vault)
**Audit Completeness**: Every read/write operation logged with timestamp, actor, target, and outcome
**SoD Enforcement**: Policy engine must detect and block conflicting role assignments before provisioning

## Development Workflow

### Feature Development Stages

1. **Specification** (`/speckit.specify`): Define user stories with governance-first prioritization
2. **Planning** (`/speckit.plan`): Design data models, API contracts, and connector interfaces
3. **Task Generation** (`/speckit.tasks`): Break down into independently testable increments
4. **Implementation** (`/speckit.implement`): Execute tasks with continuous integration testing
5. **Review** (`/speckit.analyze`): Validate compliance with constitution principles

### Testing Requirements

**Contract Testing**: Required for all API endpoints and connector interfaces
**Integration Testing**: Required for lifecycle workflows (Joiner-Mover-Leaver)
**Policy Testing**: Governance engine rules must have test coverage for SoD violations, approval logic
**Connector Testing**: Mock target systems for testing without live credentials

### Code Review Standards

**Constitution Compliance**: Reviewers must verify adherence to Governance First principle
**API Contract Stability**: Breaking changes to published APIs require major version bump and migration guide
**Security Review**: Credential handling, audit logging, and privilege escalation paths must be reviewed
**Documentation**: Connector development guides and API documentation updated with each change

## Governance

### Amendment Process

1. Proposed amendments documented in issue/PR with rationale
2. Impact analysis on existing specifications and plans
3. Approval required from project lead or designated governance committee
4. Migration plan required for breaking changes to architecture principles
5. Version bump and amendment date updated in this document

### Versioning Policy

**MAJOR**: Removal or redefinition of core principles (e.g., changing from hub-and-spoke to federated model)
**MINOR**: Addition of new principles or substantial expansion of existing constraints
**PATCH**: Clarifications, examples, typo fixes, non-semantic improvements

### Compliance Review

**Frequency**: Constitution compliance reviewed during planning phase (`/speckit.plan`)
**Enforcement**: Features violating core principles require explicit justification in Complexity Tracking section of plan.md
**Escalation**: Repeated violations trigger architecture review meeting

### Runtime Guidance

For agent-specific development instructions, refer to `.claude/commands/speckit.*.md` command files.

**Version**: 1.0.0 | **Ratified**: 2025-12-22 | **Last Amended**: 2025-12-22

# Implementation Plan: IGA Core Data Model

**Branch**: `001-iga-core-data-model` | **Date**: 2025-12-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-iga-core-data-model/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement the core IGA (Identity Governance and Administration) data model to enable identity-to-account correlation, entitlement cataloging, access grant tracking, approval workflows, provisioning automation, and access certification. The system follows a governance-first approach with phased delivery (P1-P6) building from read-only inventory to full provisioning capabilities.

**Technical Approach**: Next.js Backend-for-Frontend (BFF) architecture with API Routes handling governance logic, TypeScript for type safety across UI and API, graph-capable database for modeling complex access relationships, and pluggable connector framework for target system integration (LDAP, SCIM, K8s, IaC).

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 14+ (App Router)

**Primary Dependencies**: Next.js (API Routes + React Server Components), NextAuth.js (Auth.js) for authentication, NEEDS CLARIFICATION (ORM choice: Prisma vs Drizzle), NEEDS CLARIFICATION (graph database: Neo4j vs PostgreSQL with graph extensions)

**Storage**: Graph-capable database for identity-account-entitlement relationships (see research.md for selection), separate audit log storage (append-only)

**Testing**: Vitest for unit tests, Playwright for E2E, contract testing for API Routes and connector interfaces

**Target Platform**: Node.js 20+ runtime, deployable to Vercel/self-hosted containers

**Project Type**: Web application (Next.js BFF pattern: unified frontend + API backend)

**Performance Goals**: Query response < 5s (SC-001), provisioning < 5m (SC-006), approval routing < 1m (SC-004), audit queries < 10s for 90-day history (SC-012)

**Constraints**: 50 concurrent access requests (SC-016), 20 concurrent certification reviews (SC-016), 10K identities + 50K accounts + 100K grants (SC-014)

**Scale/Scope**: Prototype supporting 6 phased user stories (P1-P6), 10 core entities, 34 functional requirements, initial connector support for LDAP, SCIM, and K8s RBAC (per coverage matrix phase_1_inventory)

**Architecture Pattern**: Backend-for-Frontend (BFF)
- **API Layer**: Next.js API Routes (`/app/api/**`) for REST endpoints
- **Security**: NextAuth.js for session management, Edge Middleware for route protection, API key validation for service-to-service calls
- **Connector Framework**: Pluggable adapter pattern implementing standardized contract (discover_accounts, discover_entitlements, discover_grants, grant_entitlement, revoke_entitlement per coverage-matrix.yaml connector_contracts)
- **Policy Engine**: NEEDS CLARIFICATION (OPA integration vs embedded policy evaluator for birthright rules and SoD checks)
- **Event Bus**: NEEDS CLARIFICATION (in-process event emitter vs external message queue for audit events)

**Technology Decisions Requiring Research** (Phase 0):
1. ORM selection (Prisma vs Drizzle) for type-safe database access with graph relationship support
2. Database choice (Neo4j vs PostgreSQL with pg_graphql/Apache AGE extension) for identity graph modeling
3. Policy engine integration strategy (embedded OPA WASM vs HTTP-based OPA server vs custom evaluator)
4. Event/audit storage pattern (same DB vs separate append-only store like EventStoreDB)
5. Connector framework architecture (TypeScript interfaces vs plugin system with runtime loading)
6. Time-bound grant enforcement mechanism (background job scheduler vs Next.js cron API vs external scheduler)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Governance First, Provisioning Later ✅ PASS

**Requirement**: All features MUST prioritize visibility and policy (read/review capabilities) before implementing automation (write/provisioning capabilities).

**Compliance**: Specification follows phased delivery (P1-P6) with governance-first progression:
- **P1 (Identity/Account Correlation)**: Read-only inventory and correlation - foundation
- **P2 (Entitlement Discovery)**: Cataloging and risk assessment - visibility
- **P3 (Grant Discovery)**: Access tracking - complete inventory
- **P4 (Access Request/Approval)**: Governance layer with approval workflows - policy controls before provisioning
- **P5 (Provisioning Execution)**: Automation layer (write operations) - only after governance established
- **P6 (Certification)**: Ongoing compliance - attestation after provisioning exists

**Evidence**: Spec lines 10-115 show clear priority separation. P1-P3 are discovery/read-only, P4 introduces approval gates, P5 adds provisioning. This matches Constitution Principle I requirements.

### Principle II: Modular Service Architecture ✅ PASS

**Requirement**: The system MUST adopt a hub-and-spoke architecture with clearly defined, independently deployable services.

**Compliance**: Technical approach uses Next.js BFF pattern with logical separation:
- **Identity Registry**: Core database + query API (Next.js API Routes `/api/identities`, `/api/accounts`, `/api/grants`)
- **Connector Framework**: Abstraction layer for target system integration (pluggable adapters per coverage-matrix.yaml connector_contracts)
- **Governance Engine**: Policy enforcement, approval workflows, SoD checks (API Routes `/api/access-requests`, `/api/certifications`)
- **Provisioner**: Execution layer for provisioning operations (connector contract: `grant_entitlement`, `revoke_entitlement`)
- **Self-Service Portal**: Next.js UI (Server Components + Client Components)

**Evidence**: While implemented as monolithic Next.js app for prototype, clear module boundaries exist via directory structure and API contracts. Services are logically separated and independently testable. Future extraction to microservices is feasible via API contracts (Phase 1 deliverable).

**Note**: Prototype accepts monolith with clear service boundaries per Constitution Architecture Constraints ("Prototype Stage: Monolith acceptable with clear service boundaries in code").

### Principle III: Single Authoritative Source for Identity Data ✅ PASS

**Requirement**: The system MUST identify and rely on one authoritative source of truth (e.g., HRIS) for core identity attributes.

**Compliance**:
- **Assumption 1** (spec.md:261): "Assumes at least one authoritative source (HRIS or CMDB) provides reliable identity data with unique employee IDs"
- **FR-003** (spec.md:137): "System MUST synchronize identities FROM authoritative sources on a configurable schedule" (read-only relationship)
- **FR-004** (spec.md:138): "System MUST detect and handle identity status changes (new hire, termination, role change) from authoritative sources"

**Evidence**: Specification explicitly defines authoritative source dependency and read-only synchronization pattern. No multi-source conflicts in scope.

### Principle IV: Lifecycle Workflow Definition ✅ PASS

**Requirement**: All identity lifecycle scenarios (Joiner-Mover-Leaver) MUST be explicitly defined, documented, and testable.

**Compliance**:
- **Joiner**: P1 acceptance scenario 4 (spec.md:23) - new employee triggers identity creation
- **Leaver**: P1 acceptance scenario 5 (spec.md:24) - termination triggers identity disable + account review flagging
- **Mover**: Implicit in FR-004 (spec.md:138) - "detect and handle identity status changes (role change)"

**Evidence**: Joiner and Leaver workflows are explicitly tested in P1 acceptance scenarios. Mover workflow requires elaboration in Phase 1 design (data-model.md state transitions).

**Action Required (Phase 1)**: Document Mover workflow state transitions in data-model.md (role/department change → access recertification trigger).

### Principle V: API-First Integration Pattern ✅ PASS

**Requirement**: All system integration points MUST expose REST APIs with standardized request/response schemas.

**Compliance**:
- **Architecture**: Next.js API Routes provide REST endpoints
- **Connector Contracts**: Standardized interface defined in coverage-matrix.yaml (lines 182-316): `discover_accounts`, `discover_entitlements`, `discover_grants`, `grant_entitlement`, `revoke_entitlement`, `get_task_status`
- **Response Schemas**: Common types defined (Account, Entitlement, Grant, Evidence) with standardized fields

**Evidence**: Coverage matrix provides canonical API shapes. Phase 1 deliverable includes OpenAPI specification for all endpoints (`/contracts/` directory).

**Action Required (Phase 1)**: Generate OpenAPI 3.x specification for:
- Identity Registry API (query endpoints)
- Governance Engine API (access requests, certifications)
- Connector Framework base contract (per coverage-matrix.yaml)

### Architecture Constraints Compliance

**Technology Stack** ✅ PASS:
- Backend: Next.js (Node.js-based, language-agnostic per service principle satisfied via future extraction)
- Database: Graph-capable (PostgreSQL with extensions OR Neo4j - to be decided in Phase 0)
- API Layer: REST with JSON payloads via Next.js API Routes
- Connector Framework: Plugin-based architecture (TypeScript interfaces)
- Authentication: NextAuth.js supports enterprise SSO (SAML/OIDC)
- Audit Logging: Append-only audit trail (FR-029: spec.md:184)

**Deployment Model** ✅ PASS:
- Prototype Stage: Next.js monolith with clear service boundaries (acceptable per Constitution)
- Production Target: Containerizable (Next.js supports Docker), microservices migration path via API contracts

**Security Requirements** ✅ PASS:
- Least Privilege: Connector credentials scoped per target (FR-020-024 provisioning requirements)
- Credential Storage: NEEDS CLARIFICATION (integration with OpenBao/HashiCorp Vault - Phase 0 research)
- Audit Completeness: FR-029 (100% event logging), FR-030 (evidence linking), FR-031 (query support)
- SoD Enforcement: FR-032, FR-033 (SoD policy definition and violation detection)

### Gate Evaluation: ✅ ALL GATES PASS

**Violations Requiring Justification**: NONE

**Proceed to Phase 0**: Constitution compliance verified. Begin research to resolve NEEDS CLARIFICATION items in Technical Context.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/                                    # Next.js App Router
├── api/                               # API Routes (REST endpoints)
│   ├── identities/
│   │   ├── route.ts                  # GET /api/identities, POST /api/identities
│   │   └── [id]/
│   │       ├── route.ts              # GET/PATCH/DELETE /api/identities/:id
│   │       └── accounts/route.ts     # GET /api/identities/:id/accounts
│   ├── accounts/
│   │   ├── route.ts                  # GET /api/accounts, POST /api/accounts
│   │   └── [id]/
│   │       ├── route.ts              # GET/PATCH/DELETE /api/accounts/:id
│   │       └── grants/route.ts       # GET /api/accounts/:id/grants
│   ├── entitlements/
│   │   ├── route.ts                  # GET /api/entitlements, POST /api/entitlements
│   │   └── [id]/route.ts             # GET/PATCH/DELETE /api/entitlements/:id
│   ├── grants/
│   │   ├── route.ts                  # GET /api/grants (access graph queries)
│   │   └── [id]/route.ts             # GET/PATCH/DELETE /api/grants/:id
│   ├── access-requests/
│   │   ├── route.ts                  # POST /api/access-requests (create request)
│   │   └── [id]/
│   │       ├── route.ts              # GET /api/access-requests/:id
│   │       └── approve/route.ts      # POST /api/access-requests/:id/approve
│   ├── certifications/
│   │   ├── campaigns/route.ts        # GET/POST /api/certifications/campaigns
│   │   └── campaigns/[id]/
│   │       ├── route.ts              # GET /api/certifications/campaigns/:id
│   │       └── reviews/route.ts      # GET/POST campaign reviews
│   ├── provisioning/
│   │   ├── tasks/route.ts            # GET provisioning tasks
│   │   └── tasks/[id]/route.ts       # GET task status, retry
│   ├── connectors/
│   │   ├── discovery/route.ts        # POST trigger discovery for target system
│   │   └── reconciliation/route.ts   # POST trigger reconciliation
│   └── audit/
│       └── events/route.ts            # GET /api/audit/events (query audit log)
├── (dashboard)/                       # Admin dashboard route group
│   ├── layout.tsx                    # Dashboard layout (nav, auth)
│   ├── page.tsx                      # Dashboard home (access overview)
│   ├── identities/
│   │   ├── page.tsx                  # Identity list + search
│   │   ├── [id]/page.tsx             # Identity detail + access graph
│   │   └── components/
│   │       ├── identity-table.tsx    # shadcn <Table> for identity list
│   │       └── identity-filters.tsx  # shadcn <Select> + <Input> for filtering
│   ├── access-requests/
│   │   ├── page.tsx                  # Pending approvals
│   │   ├── [id]/page.tsx             # Request detail
│   │   └── components/
│   │       ├── request-form.tsx      # shadcn <Form> with Zod validation
│   │       └── approval-dialog.tsx   # shadcn <Dialog> for approve/reject
│   └── certifications/
│       ├── page.tsx                  # Active campaigns
│       ├── [id]/page.tsx             # Campaign review UI
│       └── components/
│           ├── review-table.tsx      # Bulk certification UI with shadcn <Checkbox>
│           └── campaign-progress.tsx # shadcn <Progress> bar
├── (portal)/                          # Self-service portal route group
│   ├── layout.tsx                    # Portal layout
│   ├── my-access/page.tsx            # User's current access
│   ├── request/page.tsx              # Access request form
│   └── components/
│       ├── access-card.tsx           # shadcn <Card> for displaying grants
│       └── request-wizard.tsx        # Multi-step form with shadcn <Tabs>
└── layout.tsx                         # Root layout (Tailwind globals, theme provider)

lib/                                   # Shared utilities and core logic
├── db/
│   ├── schema.ts                     # Database schema (Prisma/Drizzle)
│   ├── client.ts                     # DB client singleton
│   └── migrations/                   # Schema migrations
├── models/                            # Domain models (TypeScript types + validation)
│   ├── identity.ts                   # Identity, IdentityAccountLink types
│   ├── account.ts                    # Account, System types
│   ├── entitlement.ts                # Entitlement types
│   ├── grant.ts                      # AccountEntitlementGrant types
│   ├── access-assignment.ts          # AccessAssignment (request/approval)
│   ├── certification.ts              # CertificationCampaign types
│   └── event.ts                      # Event (audit log) types
├── services/                          # Business logic services
│   ├── identity-registry/
│   │   ├── identity.service.ts       # Identity CRUD + sync from HRIS
│   │   ├── account.service.ts        # Account CRUD + correlation
│   │   └── correlation.service.ts    # Identity-account linking logic
│   ├── entitlement-catalog/
│   │   └── entitlement.service.ts    # Entitlement CRUD + risk scoring
│   ├── governance/
│   │   ├── access-request.service.ts # Request creation, approval routing
│   │   ├── certification.service.ts  # Campaign management
│   │   └── sod-policy.service.ts     # SoD violation detection
│   ├── provisioning/
│   │   └── provisioner.service.ts    # Grant/revoke orchestration
│   └── audit/
│       └── audit-log.service.ts      # Append-only event logging
├── connectors/                        # Connector framework
│   ├── base/
│   │   ├── connector.interface.ts    # Base contract (per coverage-matrix.yaml)
│   │   └── connector.types.ts        # Common types (Account, Entitlement, Grant)
│   ├── ldap/
│   │   └── ldap.connector.ts         # LDAP connector implementation
│   ├── scim/
│   │   └── scim.connector.ts         # SCIM connector implementation
│   ├── k8s/
│   │   └── k8s.connector.ts          # Kubernetes RBAC connector
│   └── registry.ts                   # Connector registry + factory
├── policy/                            # Policy engine integration
│   ├── evaluator.ts                  # Policy evaluation interface
│   ├── birthright-rules.ts           # Birthright policy logic
│   └── sod-rules.ts                  # SoD rule definitions
├── auth/                              # Authentication helpers
│   ├── auth.config.ts                # NextAuth.js configuration
│   └── middleware.ts                 # Auth middleware utilities
└── utils/
    ├── graph-query.ts                # Graph traversal helpers
    ├── validation.ts                 # Zod schemas for API validation
    └── utils.ts                      # cn() helper for Tailwind class merging

components/                            # shadcn/ui components (copy-paste from CLI)
├── ui/                                # Primitive UI components
│   ├── button.tsx                    # Button component (Radix UI based)
│   ├── card.tsx                      # Card layout component
│   ├── table.tsx                     # Table component with sorting
│   ├── form.tsx                      # Form with React Hook Form + Zod
│   ├── input.tsx                     # Text input component
│   ├── select.tsx                    # Select dropdown component
│   ├── dialog.tsx                    # Modal dialog component
│   ├── alert-dialog.tsx              # Confirmation dialog
│   ├── badge.tsx                     # Badge for status indicators
│   ├── tabs.tsx                      # Tab navigation component
│   ├── progress.tsx                  # Progress bar component
│   ├── checkbox.tsx                  # Checkbox component
│   ├── dropdown-menu.tsx             # Dropdown menu (user profile)
│   ├── command.tsx                   # Command palette/search
│   ├── popover.tsx                   # Popover component
│   ├── separator.tsx                 # Visual separator
│   ├── label.tsx                     # Form label component
│   ├── textarea.tsx                  # Multi-line text input
│   ├── calendar.tsx                  # Calendar component
│   └── date-picker.tsx               # Date picker for time-bound access
└── theme-provider.tsx                # Dark mode provider (optional Phase 2)

styles/
└── globals.css                       # Tailwind @layer directives + custom styles

tests/
├── unit/                              # Unit tests (Vitest)
│   ├── services/
│   ├── connectors/
│   └── policy/
├── integration/                       # Integration tests (Vitest + test DB)
│   ├── api/                          # API route tests
│   └── connectors/                   # Connector contract tests
└── e2e/                               # End-to-end tests (Playwright)
    ├── identity-correlation.spec.ts
    ├── access-request.spec.ts
    └── certification.spec.ts

public/                                # Static assets

prisma/                                # Prisma schema (Prisma selected)
└── schema.prisma

tailwind.config.ts                     # Tailwind CSS configuration
postcss.config.js                      # PostCSS configuration (Tailwind)
components.json                        # shadcn/ui CLI configuration
```

**Structure Decision**: Next.js App Router (web application) with Backend-for-Frontend (BFF) pattern. All API logic resides in `/app/api/**` route handlers. Shared business logic in `/lib/services/**` enables reuse across API routes and UI Server Components. Connector framework in `/lib/connectors/**` implements pluggable adapter pattern per coverage-matrix.yaml contracts. Clear separation between admin dashboard (`/(dashboard)`) and self-service portal (`/(portal)`) route groups.

**UI Architecture**: shadcn/ui components live in `/components/ui/` (copy-pasted from CLI, fully owned by project). Feature-specific components in route-level `components/` directories use shadcn primitives. Tailwind CSS utilities in `/styles/globals.css` with configuration in `tailwind.config.ts`. All components support TypeScript strict mode with full type safety.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - All Constitution principles compliant.

---

## Post-Phase 1 Constitution Check Re-evaluation

*Performed after design artifacts (data-model.md, contracts/, quickstart.md) generated.*

### ✅ ALL PRINCIPLES VALIDATED WITH DESIGN ARTIFACTS

### Principle I: Governance First, Provisioning Later

**Re-validation**: ✅ PASS

**Design Evidence**:
- **data-model.md**: Entity state machines show clear progression (Identity: STAGED → ACTIVE, Grant: PENDING → ACTIVE)
- **API Contracts**: identity-registry-api.yaml provides read-only queries (GET endpoints) before governance-api.yaml introduces write operations (POST /access-requests)
- **quickstart.md**: Phase-based development workflow explicitly sequences P1-P3 (discovery/read) before P4-P6 (governance/write)

**Compliance**: Design artifacts enforce governance-first progression through:
1. Data model state transitions prevent direct ACTIVE state (require approval gates)
2. API contract separation (Identity Registry = read, Governance API = write/approval)
3. Connector contract includes discovery methods before provisioning methods

### Principle II: Modular Service Architecture

**Re-validation**: ✅ PASS

**Design Evidence**:
- **Project Structure** (plan.md:156-282): Clear service boundaries via directory layout with separated modules for identity registry, governance, provisioning, and connectors
- **API Contracts**: Three separate OpenAPI specs enforce service boundaries
  - identity-registry-api.yaml (core CRUD)
  - governance-api.yaml (workflows)
  - connector-base-contract.yaml (target system integration)

**Compliance**: Logical service separation via Next.js route groups and lib/ module boundaries enables future microservices extraction.

### Principle III: Single Authoritative Source for Identity Data

**Re-validation**: ✅ PASS

**Design Evidence**:
- **data-model.md**: System.isAuthoritative boolean flag identifies HRIS/CMDB as source of truth
- **quickstart.md**: Identity Sync job synchronizes FROM authoritative source (read-only)
- **Identity Entity Schema** (data-model.md): identitySource field tracks origin, status transitions managed by sync job

**Compliance**: Data model enforces single authoritative source via isAuthoritative flag and unidirectional sync.

### Principle IV: Lifecycle Workflow Definition

**Re-validation**: ✅ PASS

**Design Evidence**:
- **data-model.md**: Identity state transitions documented (STAGED → ACTIVE → DISABLED → DELETED)
- **Mover Workflow** (data-model.md): Role change detection triggers access recertification
- **quickstart.md**: Identity Sync job detects Joiner-Mover-Leaver events via attribute change detection

**Compliance**: All three lifecycle scenarios (Joiner, Mover, Leaver) have explicit state transitions and testable workflows.

**Action Completed**: Mover workflow state transitions documented in data-model.md as required by initial Constitution Check.

### Principle V: API-First Integration Pattern

**Re-validation**: ✅ PASS

**Design Evidence**:
- **contracts/identity-registry-api.yaml**: Full OpenAPI 3.1 spec with schemas, endpoints, responses
- **contracts/governance-api.yaml**: Complete governance workflow API spec
- **contracts/connector-base-contract.yaml**: Standardized connector interface matching coverage-matrix.yaml contract definitions

**Compliance**: All three required OpenAPI specifications delivered:
1. ✅ Identity Registry API (query endpoints) - identity-registry-api.yaml
2. ✅ Governance Engine API (access requests, certifications) - governance-api.yaml
3. ✅ Connector Framework base contract - connector-base-contract.yaml

**Action Completed**: OpenAPI 3.x specifications generated as required by initial Constitution Check.

### Technology Stack Compliance

**Re-validation**: ✅ PASS

**Design Evidence (from research.md)**:
- ✅ Backend: Next.js (TypeScript, Node.js 20+)
- ✅ Database: PostgreSQL 16 with Apache AGE extension (graph-capable)
- ✅ API Layer: REST with JSON (OpenAPI specs generated)
- ✅ UI Framework: shadcn/ui + Tailwind CSS (copy-paste components, utility-first styling)
- ✅ Connector Framework: TypeScript interface-based (connector-base-contract.yaml)
- ✅ Authentication: NextAuth.js with SSO support
- ✅ Audit Logging: PostgreSQL audit schema with append-only constraints (data-model.md)

**All NEEDS CLARIFICATION items resolved**:
1. ✅ ORM: Prisma (research.md)
2. ✅ Database: PostgreSQL + Apache AGE (research.md)
3. ✅ Policy Engine: Hybrid embedded + OPA (research.md)
4. ✅ Audit Storage: Same PostgreSQL DB with dedicated schema (research.md)
5. ✅ Connector Framework: TypeScript interfaces + factory (research.md)
6. ✅ Time-bound Enforcement: Vercel Cron / node-cron (research.md)
7. ✅ Credential Storage: Env vars (prototype) → OpenBao (production) (research.md)
8. ✅ UI Components & Styling: shadcn/ui + Tailwind CSS (research.md)

---

## Phase 1 Deliverables: ✅ COMPLETE

**Generated Artifacts**:
- [x] **research.md**: 8 technology decisions resolved with rationale (Prisma, PostgreSQL+AGE, hybrid policy, same-DB audit, TypeScript interfaces, Vercel Cron, env var credentials, shadcn/ui + Tailwind CSS)
- [x] **data-model.md**: 10 core entities with Prisma schemas, relationships, state machines, validation rules, graph queries (Apache AGE Cypher examples)
- [x] **contracts/identity-registry-api.yaml**: OpenAPI 3.1 spec (46 endpoints, 30+ schemas)
- [x] **contracts/governance-api.yaml**: OpenAPI 3.1 spec (governance workflows)
- [x] **contracts/connector-base-contract.yaml**: OpenAPI 3.1 spec (standardized connector interface)
- [x] **quickstart.md**: Developer onboarding guide with setup instructions, architecture overview, API examples, troubleshooting

**Agent Context Updated**:
- [x] CLAUDE.md updated with technology stack (TypeScript, Next.js, Prisma, PostgreSQL)

---

## Next Phase: Phase 2 (Tasks Generation)

**Command**: `/speckit.tasks`

**Expected Output**: tasks.md with dependency-ordered implementation tasks based on:
- Phased delivery (P1 → P2 → P3 → P4 → P5 → P6)
- Data model entities (Prisma schema implementation)
- API contracts (route handler stubs)
- Connector framework (LDAP, SCIM, K8s adapters)
- Testing requirements (contract tests, integration tests, E2E tests)

**Note**: `/speckit.plan` command ends after Phase 1 design. Phase 2 task generation is a separate command per workflow definition.

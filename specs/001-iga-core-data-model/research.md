# Technical Research: IGA Core Data Model

**Feature**: IGA Core Data Model
**Branch**: `001-iga-core-data-model`
**Date**: 2025-12-23
**Phase**: Phase 0 (Research & Technology Selection)

## Purpose

This document resolves all "NEEDS CLARIFICATION" items identified in [plan.md](plan.md) Technical Context section. Each decision includes rationale, alternatives considered, and final selection.

---

## Research Items

### 1. ORM Selection: Prisma vs Drizzle

**Decision**: **Prisma**

**Rationale**:
- **Type Safety**: Both provide excellent TypeScript support, but Prisma's generated client offers better autocomplete and compile-time validation
- **Schema Definition**: Prisma Schema Language (PSL) is more declarative and easier to read than Drizzle's TypeScript-based schema
- **Migrations**: Prisma Migrate has robust migration tooling with automatic migration generation and migration history tracking
- **Graph Relationships**: Prisma supports relation queries with excellent ergonomics (`include`, `select`) which is critical for IGA's identity-account-entitlement graph
- **Ecosystem**: Larger community, better documentation, more Next.js integration examples
- **Admin Tools**: Prisma Studio provides built-in database GUI for development

**Alternatives Considered**:
- **Drizzle**: Lighter weight, SQL-like syntax, potentially better performance. Rejected because Prisma's DX (developer experience) advantages outweigh marginal performance differences for prototype phase. Graph relationship queries are more verbose in Drizzle.
- **TypeORM**: Mature but decorator-based approach is less idiomatic for modern TypeScript. Migration story is weaker than Prisma.

**Trade-offs Accepted**:
- Slightly larger bundle size (not an issue for Next.js API Routes)
- Schema defined in separate PSL file rather than TypeScript (acceptable for clearer schema visualization)

---

### 2. Database Selection: Neo4j vs PostgreSQL with Graph Extensions

**Decision**: **PostgreSQL 16+ with Apache AGE extension**

**Rationale**:
- **Unified Storage**: Single database handles both relational entities (Identity, Account, Entitlement) and graph queries (who-has-what traversals), reducing operational complexity
- **SQL Familiarity**: Team familiarity with PostgreSQL reduces learning curve vs Neo4j's Cypher query language
- **Prisma Compatibility**: Prisma has first-class PostgreSQL support; Neo4j support is limited to Prisma OGM (Object-Graph Mapper) which is less mature
- **Graph Queries**: Apache AGE (A Graph Extension) provides Cypher-compatible graph queries within PostgreSQL via foreign data wrapper
- **Cost**: PostgreSQL is OSS with no licensing concerns; Neo4j Community Edition has limitations (no clustering, limited scale)
- **Scalability**: PostgreSQL with proper indexing and partitioning meets prototype scale targets (10K identities, 50K accounts, 100K grants per SC-014)
- **Deployment**: PostgreSQL is widely supported (Vercel Postgres, Neon, Supabase, self-hosted); Neo4j requires specialized hosting

**Alternatives Considered**:
- **Neo4j**: Native graph database with superior graph query performance and built-in graph algorithms. Rejected due to operational complexity, Prisma integration limitations, and prototype deployment constraints. Consider for production if graph query performance becomes bottleneck.
- **PostgreSQL with pg_graphql**: GraphQL-focused extension; less mature than AGE for graph traversal queries.
- **PostgreSQL with recursive CTEs only**: Pure SQL approach without extensions. Rejected because complex graph queries (transitive grants, nested groups) become unwieldy without Cypher-like syntax.

**Implementation Notes**:
- Use Prisma for CRUD operations and simple relation queries
- Use Apache AGE (via raw SQL or pg-age Node.js client) for complex graph traversals:
  - Effective access calculation (transitive grants through nested groups)
  - SoD violation detection (find identities with conflicting entitlement pairs)
  - Access path queries ("why does identity X have entitlement Y?")
- Create PostgreSQL views or materialized views for frequently-accessed graph queries to optimize performance

**Trade-offs Accepted**:
- Dual-mode database access (Prisma for entities, AGE for graphs) adds complexity
- Graph query performance may not match native graph DB; mitigate with indexing and materialized views
- Apache AGE extension requires PostgreSQL 11+ and additional installation step

---

### 3. Policy Engine Integration: OPA vs Embedded Evaluator

**Decision**: **Hybrid Approach: Embedded evaluator for birthright rules, OPA HTTP integration for advanced policies**

**Rationale**:
- **Prototype Simplicity**: Embedded TypeScript evaluator for birthright rules ("dept=Finance → FinanceBaseRole") avoids external service dependency during MVP
- **Flexibility**: Simple rules (attribute-based birthright grants) can be implemented as TypeScript functions with Zod validation
- **Scalability Path**: OPA integration via HTTP API for complex policies (SoD rules, ABAC conditions, multi-step approval routing) provides production-ready policy management
- **Audit Trail**: All policy evaluations (embedded or OPA) emit audit events via FR-029 requirement
- **Developer Experience**: TypeScript-based rules are easier to debug and test during prototype phase

**Implementation Plan**:
1. **Phase 1 (P1-P3)**: Embedded evaluator only
   - Birthright rules: `lib/policy/birthright-rules.ts` exports rule functions
   - Simple SoD checks: hardcoded conflicting entitlement pairs in `lib/policy/sod-rules.ts`
2. **Phase 2 (P4-P6)**: Add OPA integration
   - OPA HTTP client in `lib/policy/opa-client.ts`
   - Policy bundles stored in `policies/` directory (Rego files)
   - OPA server deployment via Docker Compose for local dev, containerized for production

**Alternatives Considered**:
- **OPA only (HTTP-based)**: Rejected for prototype due to operational overhead (running OPA server, managing policy bundles). Suitable for production.
- **OPA WASM (embedded)**: Compile Rego policies to WASM and execute in-process. Rejected because WASM bundle management and versioning adds complexity vs TypeScript functions for simple rules. Consider for production if policy isolation is critical.
- **AWS Cedar**: Newer policy language with strong typing. Rejected due to immaturity of ecosystem and lack of TypeScript SDK maturity.

**Trade-offs Accepted**:
- Migrating from embedded evaluator to OPA requires policy rewriting (TypeScript → Rego)
- Hybrid approach means two policy execution paths to maintain and audit

---

### 4. Event/Audit Storage: Same DB vs Separate Append-Only Store

**Decision**: **Same PostgreSQL database with dedicated audit schema and time-series optimizations**

**Rationale**:
- **Operational Simplicity**: Single database reduces deployment complexity for prototype
- **Transaction Safety**: Audit events and entity changes occur in same transaction, ensuring consistency (e.g., grant creation + audit event are atomic)
- **Query Performance**: PostgreSQL with proper partitioning and indexing meets SC-012 requirement (audit queries < 10s for 90-day history)
- **Retention Management**: PostgreSQL table partitioning by time range (monthly partitions) enables efficient archival and deletion
- **Cost**: No additional infrastructure for separate event store

**Implementation Plan**:
1. **Schema Design**:
   - `audit` schema separate from `public` schema for entity tables
   - `audit.events` table with partitioning by `event_timestamp` (monthly partitions)
   - Indexed columns: `event_type`, `actor_identity_id`, `resource_id`, `event_timestamp`
2. **Append-Only Enforcement**:
   - No UPDATE or DELETE grants on `audit.events` table
   - PostgreSQL trigger prevents modifications (raises exception on UPDATE/DELETE)
   - Zod validation ensures `event_id` is immutable
3. **Retention Policy**:
   - FR-029 + Assumption 7: minimum 90-day retention
   - Archive partitions older than 90 days to cold storage (S3/file system) via scheduled job
   - Optionally retain partitions up to 1 year for compliance requirements

**Alternatives Considered**:
- **EventStoreDB**: Purpose-built event store with immutable event streams. Rejected due to operational complexity (separate database to manage) and prototype scope. Consider for production if event sourcing patterns are adopted or if audit immutability guarantees need cryptographic verification.
- **PostgreSQL with timescaledb extension**: Time-series database extension with better compression and partitioning for append-only workloads. Rejected because standard PostgreSQL partitioning is sufficient for prototype scale (90-day retention, estimated <10M events). Consider if audit volume exceeds 100M events.
- **Separate audit database (PostgreSQL)**: Rejected because cross-database transactions are complex and atomic guarantees between entity changes and audit events are critical.

**Trade-offs Accepted**:
- Audit table growth may impact main database performance; mitigate with aggressive partitioning and archival
- No built-in event stream capabilities (replay, projections); acceptable for audit log use case

---

### 5. Connector Framework Architecture: TypeScript Interfaces vs Plugin System

**Decision**: **TypeScript interfaces with factory pattern and directory-based registration**

**Rationale**:
- **Type Safety**: TypeScript interfaces enforce connector contract at compile time
- **Simplicity**: No dynamic plugin loading or runtime module resolution required for prototype
- **Discoverability**: All connectors defined in `lib/connectors/` directory; registry imports and registers them explicitly
- **Testing**: Contract testing via TypeScript interface ensures all connectors implement required methods
- **Coverage Matrix Alignment**: Connector interface matches `connector_contracts.base_contract` defined in coverage-matrix.yaml

**Implementation Plan**:
1. **Base Interface** (`lib/connectors/base/connector.interface.ts`):
   ```typescript
   export interface IConnector {
     discoverAccounts(req: DiscoverAccountsRequest): Promise<DiscoverAccountsResponse>;
     discoverEntitlements(req: DiscoverEntitlementsRequest): Promise<DiscoverEntitlementsResponse>;
     discoverGrants(req: DiscoverGrantsRequest): Promise<DiscoverGrantsResponse>;
     grantEntitlement(req: GrantEntitlementRequest): Promise<GrantEntitlementResponse>;
     revokeEntitlement(req: RevokeEntitlementRequest): Promise<RevokeEntitlementResponse>;
     getTaskStatus(req: GetTaskStatusRequest): Promise<GetTaskStatusResponse>;
   }
   ```
2. **Connector Implementations**:
   - `lib/connectors/ldap/ldap.connector.ts` implements `IConnector`
   - `lib/connectors/scim/scim.connector.ts` implements `IConnector`
   - `lib/connectors/k8s/k8s.connector.ts` implements `IConnector`
3. **Connector Registry** (`lib/connectors/registry.ts`):
   - Factory function `getConnector(systemId: string): IConnector`
   - Looks up `System.connector_family` and instantiates appropriate connector class
   - Caches connector instances per system

**Alternatives Considered**:
- **Dynamic Plugin Loading**: Runtime loading of connector modules via `import()` or Node.js `require()`. Rejected because prototype has fixed set of connectors (LDAP, SCIM, K8s per phase_1_inventory). Consider for production if third-party connector support is needed.
- **Decorator-based Plugin System**: Use TypeScript decorators to auto-register connectors. Rejected due to complexity and unclear benefits for prototype scope.

**Trade-offs Accepted**:
- Adding new connector requires code change (import in registry); acceptable for prototype
- No hot-reloading of connectors; requires application restart

---

### 6. Time-Bound Grant Enforcement: Background Job Scheduler vs Next.js Cron vs External Scheduler

**Decision**: **Vercel Cron (Next.js API Route with cron schedule) for Vercel deployments, node-cron for self-hosted**

**Rationale**:
- **Vercel Integration**: Vercel Cron provides zero-config cron jobs via Next.js API Routes with `export const config = { cron: '...' }`
- **Simplicity**: No external scheduler infrastructure (no Kubernetes CronJobs, no separate worker process)
- **Reliability**: Vercel Cron has built-in retry and monitoring; node-cron for self-hosted is lightweight and proven
- **Compliance**: SC-007 requires 1-hour expiry enforcement; hourly cron schedule is sufficient

**Implementation Plan**:
1. **Expiry Enforcement Job**:
   - Route: `app/api/cron/enforce-expiry/route.ts`
   - Vercel config: `export const config = { cron: '0 * * * *' }` (every hour at minute 0)
   - Self-hosted: `lib/jobs/enforce-expiry.job.ts` with node-cron scheduler in `lib/jobs/scheduler.ts`
2. **Logic**:
   - Query grants with `end_time < NOW() AND state = 'active'`
   - Update grant state to `expired`
   - Create revocation tasks for provisioner
   - Emit audit events
3. **Authentication**:
   - Vercel Cron: secured via `CRON_SECRET` environment variable (Vercel automatically provides this header)
   - Self-hosted: internal-only endpoint, no external exposure

**Additional Scheduled Jobs**:
- **Identity Sync from HRIS** (FR-003): `api/cron/sync-identities/route.ts` (every 15 minutes per SC-003)
- **Reconciliation** (FR-023): `api/cron/reconcile-grants/route.ts` (configurable, default: every 6 hours per defaults.reconciliation)
- **Audit Partition Archival**: `api/cron/archive-audit/route.ts` (daily)

**Alternatives Considered**:
- **AWS EventBridge/CloudWatch Events**: Cloud-native cron scheduler. Rejected because it couples deployment to AWS; Vercel Cron is platform-agnostic.
- **Bull/BullMQ Job Queue**: Redis-backed job queue with cron support. Rejected due to operational complexity (requires Redis) for simple hourly jobs. Consider if job volume increases or complex retry logic is needed.
- **GitHub Actions scheduled workflows**: Use GitHub Actions cron to trigger API endpoint. Rejected due to unreliability (GitHub Actions cron is not guaranteed to run on time, can delay up to 10+ minutes).

**Trade-offs Accepted**:
- Vercel Cron has maximum execution time of 60s (Hobby), 300s (Pro); mitigate by batching grant updates and using cursor-based pagination
- No job queue persistence; if job fails, retry happens on next cron trigger (acceptable for hourly enforcement)

---

### 7. Credential Storage for Connectors: Environment Variables vs OpenBao/Vault

**Decision**: **Environment variables for prototype, OpenBao integration prepared for production**

**Rationale**:
- **Prototype Pragmatism**: Environment variables (`.env.local`, Vercel Environment Variables) are sufficient for initial LDAP/SCIM/K8s connector credentials
- **Security Baseline**: Next.js API Routes run server-side; credentials never exposed to client
- **Production Path**: OpenBao (Vault fork) integration planned per coverage-matrix.yaml (connector family: `secrets_openbao`)
- **Constitution Compliance**: Meets "Credential Storage: encrypted at rest; support for external secret management" requirement by preparing integration path

**Implementation Plan**:
1. **Phase 1 (Prototype)**:
   - Store credentials in environment variables:
     - `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`
     - `SCIM_API_KEY`
     - `K8S_SERVICE_ACCOUNT_TOKEN`
   - Connectors read credentials via `process.env.LDAP_BIND_PASSWORD`
   - Vercel encrypts environment variables at rest
2. **Phase 2 (Production Preparation)**:
   - Create `lib/secrets/secrets-client.ts` abstraction:
     ```typescript
     export interface ISecretsClient {
       getSecret(path: string): Promise<string>;
     }
     export class EnvSecretsClient implements ISecretsClient { /* reads process.env */ }
     export class OpenBaoSecretsClient implements ISecretsClient { /* calls OpenBao API */ }
     ```
   - Connectors inject `ISecretsClient` via constructor
   - Toggle implementation via `SECRETS_PROVIDER` environment variable

**Alternatives Considered**:
- **HashiCorp Vault**: Industry standard for secrets management. Rejected because OpenBao is OSS fork after Vault license change to BSL; aligns with project's OSS-first approach.
- **AWS Secrets Manager**: Cloud-native secrets storage. Rejected to avoid cloud vendor lock-in.
- **Encrypted files**: Store credentials in encrypted JSON files committed to repo. Rejected due to poor key rotation story and higher risk of accidental exposure.

**Trade-offs Accepted**:
- Environment variables are static; credential rotation requires application restart (acceptable for prototype)
- No automatic secret rotation; manual process for prototype phase

---

### 8. UI Component Library & Styling: shadcn/ui + Tailwind CSS

**Decision**: **shadcn/ui (copy-paste components) + Tailwind CSS v3**

**Rationale**:
- **Next.js App Router Native**: shadcn/ui is built specifically for React Server Components and Next.js 14+ App Router patterns
- **Component Ownership**: Copy-paste approach gives full control over component code (no npm package lock-in), aligns with project philosophy of customization
- **Accessibility Built-in**: Built on Radix UI primitives with WCAG 2.1 Level AA compliance (critical for governance software used by compliance teams)
- **Performance**: Tailwind's JIT compiler with CSS purging ensures minimal bundle size (< 50KB gzipped CSS), supports SC-001 performance requirement
- **Developer Experience**: Utility-first CSS enables rapid prototyping, TypeScript autocomplete for both Tailwind classes and component props
- **IGA UI Requirements Fit**: Pre-built table, form, dialog, badge, select, tabs components match complex IGA admin dashboard requirements (identity lists, approval workflows, certification campaigns)
- **Ecosystem Integration**: Native React Hook Form support (pairs with Zod validation), seamless NextAuth.js integration for user menus
- **Zero Runtime CSS-in-JS**: Static CSS extraction (unlike Chakra UI or Emotion) = better performance on Vercel Edge

**Implementation Plan**:
1. **Install Dependencies**:
   ```bash
   npx shadcn-ui@latest init
   # Automatically configures Tailwind CSS, creates components directory, sets up theming system
   ```
2. **Core Components for Phase 1 (P1-P3 - Discovery)**:
   - `table` + `pagination` (identity/account/entitlement lists)
   - `card` + `separator` (access graph visualization layout)
   - `badge` (risk scores, status indicators, grant types)
   - `input` + `command` (search/filter UI with keyboard shortcuts)
   - `button` + `dropdown-menu` (actions, user profile menu with NextAuth.js)
3. **Governance Components for Phase 2 (P4-P6 - Workflows)**:
   - `form` + `textarea` + `label` (access request submission with Zod validation integration)
   - `dialog` + `alert-dialog` (approval workflows, confirmation modals, SoD violation warnings)
   - `tabs` + `progress` + `checkbox` (certification campaign review UI, bulk certify/revoke)
   - `calendar` + `date-picker` (time-bound access request expiry selection)
   - `select` + `popover` (entitlement catalog filtering by system/type/risk)
4. **Project Structure**:
   ```
   components/
   ├── ui/                    # shadcn/ui primitives (copied from CLI)
   │   ├── button.tsx
   │   ├── table.tsx
   │   ├── form.tsx
   │   ├── dialog.tsx
   │   └── ... (20+ components)
   └── theme-provider.tsx     # Dark mode support (optional for Phase 2)

   app/
   ├── (dashboard)/           # Admin UI
   │   ├── identities/
   │   │   └── components/
   │   │       ├── identity-table.tsx    # Uses shadcn <Table>
   │   │       └── identity-filters.tsx  # Uses shadcn <Select> + <Input>
   │   └── access-requests/
   │       └── components/
   │           ├── request-form.tsx      # Uses shadcn <Form> + Zod
   │           └── approval-dialog.tsx   # Uses shadcn <Dialog>
   └── (portal)/              # Self-service UI
       └── components/
           └── request-wizard.tsx        # Multi-step form with shadcn <Tabs>

   lib/
   └── utils.ts               # cn() utility for Tailwind class merging

   styles/
   └── globals.css            # Tailwind @layer directives + custom styles

   tailwind.config.ts         # Tailwind configuration (colors, fonts, spacing)
   components.json            # shadcn/ui CLI configuration
   ```

**Alternatives Considered**:
- **Material UI (MUI)**: Industry-standard React component library with comprehensive components. Rejected due to:
  - Heavy bundle size (300KB+ even with tree-shaking)
  - Harder customization (theme override complexity)
  - Slower DX with Next.js 14 App Router (not optimized for Server Components)
  - Runtime CSS-in-JS overhead (sx prop computes styles at runtime)
- **Ant Design**: Enterprise-focused component library popular in admin dashboards. Rejected because:
  - Opinionated design system (hard to customize for custom branding)
  - Larger bundle than shadcn/ui (~250KB minified)
  - Chinese-first documentation (though English available)
- **Chakra UI**: Developer-friendly component library with good accessibility. Rejected due to:
  - Runtime CSS-in-JS performance overhead (computes styles during render)
  - Incomplete Next.js 14 App Router support (Server Components integration issues)
  - Larger bundle size compared to shadcn/ui
- **Headless UI (Tailwind Labs)**: Unstyled accessible components. Rejected because:
  - Requires manual styling for every component (slows prototype iteration)
  - No pre-built complex components (tables, forms, date pickers) = more development time
  - shadcn/ui provides same accessibility with pre-styled components
- **Pure Tailwind CSS (no component library)**: Build all components from scratch. Rejected because:
  - Reinventing the wheel for complex UI (tables with sorting, modals with focus traps, forms with validation)
  - Slower time-to-market for Phase 1-6 UIs
  - Higher maintenance burden (accessibility bugs, browser compatibility)

**Trade-offs Accepted**:
- Component code lives in repository (increases codebase LOC) vs external npm package; acceptable because ownership enables IGA-specific UX customization (e.g., custom risk score badge colors, approval workflow stepper)
- Tailwind utility classes make JSX verbose (`className="flex items-center justify-between ..."`); mitigated by:
  - Extracting reusable components for repeated patterns
  - Using `@apply` directive in CSS for complex utility combinations
  - TypeScript autocomplete reduces class name typos
- Learning curve for Tailwind's utility-first approach (developers accustomed to semantic CSS); acceptable because:
  - Tailwind is industry standard (large community, extensive documentation)
  - Faster iteration once learned (no context switching between HTML and CSS files)

**Accessibility Compliance**:
- All shadcn/ui components meet WCAG 2.1 Level AA standards:
  - Keyboard navigation (Tab, Enter, Escape, Arrow keys)
  - Screen reader support (ARIA labels, roles, live regions)
  - Focus management (focus trap in modals, focus restoration)
  - Color contrast compliance (default Slate theme meets 4.5:1 ratio)
- Critical for IGA admin workflows where compliance and auditability are required by governance teams
- Supports high-contrast mode for accessibility settings (CSS media queries)

---

### 9. Policy Modeling: ABAC Removal from PolicyType Enum

**Decision**: **Remove ABAC from PolicyType enum; model ABAC-style policies as `policy_document` entitlements**

**Rationale**:
- **Evaluation Location Distinction**: IGA system evaluates BIRTHRIGHT and SOD policies proactively within the IGA engine. ABAC policies are runtime-evaluated by target systems (OPA bundles, AWS IAM policies, Azure RBAC policies), not by IGA.
- **Entity Modeling Clarity**: The Policy entity represents IGA-managed policies that produce grants via `GrantType.POLICY_DERIVED`. ABAC policies are provisioned as entitlement grants (like any other entitlement) to target systems where those systems perform runtime access control evaluation.
- **Separation of Concerns**:
  - **IGA-evaluated policies** (BIRTHRIGHT, SOD): Defined in Policy table, evaluated by IGA engine, produce AccountEntitlementGrant records with `GrantType.POLICY_DERIVED`
  - **Target-evaluated policies** (ABAC): Provisioned as Entitlement records with `entitlementType = 'policy_document'`, pushed to target systems (OPA, AWS, Azure), evaluated at runtime by those systems
- **Coverage Matrix Alignment**: `policy_document` entitlementType aligns with `policy_opa` connector family in coverage-matrix.yaml (OPA policy bundle provisioning)
- **Prevents Semantic Confusion**: Having ABAC in PolicyType created ambiguity about where policy evaluation happens and how policies map to grants

**Context**:
- **Original State**: PolicyType included `ABAC` alongside `BIRTHRIGHT` and `SOD`
- **Problem**: ABAC policies (like OPA Rego bundles or AWS IAM policies) are not evaluated by IGA; they're provisioned to target systems as entitlements where the target system evaluates them at runtime for access requests
- **Solution**: Model ABAC-style policies as entitlements (`Entitlement.entitlementType = 'policy_document'`) that get provisioned like any other entitlement

**Implementation Details**:

1. **ABAC Policy Modeling via policy_document Entitlements**:
   ```prisma
   // Target system: OPA-enabled service
   Entitlement {
     id: "ent_opa_read_documents"
     systemId: "sys_document_service"
     name: "OPA Policy: Read Documents"
     entitlementType: "policy_document"  // <-- ABAC policy modeled as entitlement type
     definition: {
       policy_id: "read_documents",
       policy_bundle: "base64_encoded_rego_bundle",
       policy_language: "rego",
       evaluation_endpoint: "/v1/data/authz/allow"
     }
   }

   // Granting this entitlement provisions the OPA policy to the target system
   AccountEntitlementGrant {
     accountId: "acc_service_account_123"
     entitlementId: "ent_opa_read_documents"
     grantType: "DIRECT"  // Direct grant, not POLICY_DERIVED
     state: "active"
   }
   ```

2. **Evaluation Semantics**:
   - **BIRTHRIGHT policies** (IGA-evaluated):
     - Defined in Policy table with `policyType = 'BIRTHRIGHT'`
     - IGA engine evaluates rules periodically (e.g., "dept=Finance → FinanceBaseRole")
     - Produces `AccountEntitlementGrant` records with `GrantType.POLICY_DERIVED`
   - **SOD policies** (IGA-evaluated):
     - Defined in Policy table with `policyType = 'SOD'`
     - IGA engine checks for conflicts during grant creation/approval
     - Blocks incompatible grants (e.g., "cannot have both PurchaseApprover + Vendor entitlements")
   - **ABAC policies** (target-evaluated):
     - Modeled as Entitlement with `entitlementType = 'policy_document'`
     - Provisioned to target system via connector (policy_opa family)
     - Target system evaluates policy at runtime for each access request (e.g., OPA evaluates "user.dept == 'Finance' AND resource.type == 'invoice'")

3. **Examples of ABAC → policy_document Mapping**:

   | ABAC Policy Example | IGA Data Model |
   |---------------------|----------------|
   | **OPA Policy Bundle** (Rego code for document access) | Entitlement with `entitlementType: 'policy_document'`, definition contains base64-encoded Rego bundle |
   | **AWS IAM Policy** (JSON policy for S3 access) | Entitlement with `entitlementType: 'policy_document'`, definition contains IAM policy JSON |
   | **Azure ABAC Role Assignment** (condition-based role assignment) | Entitlement with `entitlementType: 'role'`, but account-level attributes could reference policy_document for conditions |
   | **Kubernetes RBAC with OPA Gatekeeper** | Policy provisioned as ConfigMap via k8s connector; entitlement references ConfigMap |

4. **Decision Criteria: When to Use Policy Entity vs policy_document Entitlement**:

   | Criterion | Use Policy Entity (BIRTHRIGHT/SOD) | Use policy_document Entitlement |
   |-----------|-----------------------------------|--------------------------------|
   | **Evaluation Location** | IGA system evaluates proactively | Target system evaluates at runtime |
   | **Produces Grants?** | Yes (POLICY_DERIVED grants) | No (is itself a grant) |
   | **Audit Trail** | Policy evaluation events in IGA audit log | Target system logs access decisions (IGA logs provisioning) |
   | **Modification Frequency** | Changes trigger grant recalculation | Changes provisioned to target system |
   | **Example Use Cases** | "All Finance users get FinanceBaseRole", "Cannot have PurchaseApprover + Vendor" | OPA Rego bundles, AWS IAM policies, Azure conditions |

**Alternatives Considered**:
- **Keep ABAC in PolicyType with evaluation_location field**: Rejected because it conflates two different concepts (IGA-evaluated rules vs target-provisioned policies) in a single entity table. Leads to confusion about whether Policy entity produces grants or is itself provisioned as a grant.
- **Create separate AbacPolicy entity**: Rejected because ABAC policies are semantically entitlements (they're provisioned to accounts on target systems). Creating a parallel entity duplicates grant management logic.
- **Use Policy entity for all policy types but add is_iga_evaluated flag**: Rejected due to complexity in grant generation logic (conditional behavior based on flag) and unclear audit semantics.

**Trade-offs Accepted**:
- **Terminology Overload**: The word "policy" is used in two contexts:
  1. Policy entity (IGA-evaluated rules: BIRTHRIGHT, SOD)
  2. policy_document entitlementType (target-evaluated ABAC policies)
  - Mitigated by: Clear documentation, explicit distinction in data-model.md, consistent terminology in UI ("Birthright Rules" vs "Policy Documents")
- **No Unified Policy View**: Administrators cannot view "all policies" in a single page; BIRTHRIGHT/SOD policies are in Policy table, ABAC policies are in Entitlement table.
  - Mitigated by: UI can provide unified "Policy Management" page with tabs for "Birthright Rules", "SoD Rules", and "Policy Documents" (filtered Entitlement view)

**Constitution Compliance**:
- **Separation of Concerns**: Aligns with "Entities should model governance concepts, not implementation details" principle
- **Clarity**: Removes ambiguity from PolicyType enum definition
- **Auditability**: Both policy types (IGA-evaluated and target-evaluated) have clear audit trails (Policy evaluation events vs Entitlement provisioning events)

**Migration Notes**:
- If any ABAC policies existed in earlier prototypes, migration path:
  1. Export Policy records where `policyType = 'ABAC'`
  2. Create Entitlement records with `entitlementType = 'policy_document'`, copying policy definition to `Entitlement.definition`
  3. Create AccountEntitlementGrant records for accounts that had POLICY_DERIVED grants from ABAC policies, converting `grantType` to `DIRECT`
  4. Delete old ABAC Policy records

---

## Summary of Decisions

| Research Item | Decision | Rationale (One-Liner) |
|---------------|----------|----------------------|
| ORM | **Prisma** | Best TypeScript DX and graph relation queries for IGA data model |
| Database | **PostgreSQL + Apache AGE** | Unified storage for entities + graph queries, excellent Prisma support |
| Policy Engine | **Hybrid: Embedded evaluator + OPA HTTP** | Simple rules embedded, complex policies via OPA when needed |
| Audit Storage | **Same PostgreSQL DB (dedicated schema)** | Transactional consistency, sufficient performance with partitioning |
| Connector Framework | **TypeScript interfaces + factory** | Compile-time type safety, no runtime plugin complexity |
| Time-Bound Enforcement | **Vercel Cron / node-cron** | Zero-config for Vercel, lightweight for self-hosted |
| Credential Storage | **Env vars (prototype) → OpenBao (production)** | Pragmatic prototype path with clear production upgrade |
| UI Components & Styling | **shadcn/ui + Tailwind CSS** | Copy-paste ownership, Next.js 14 native, accessible, performant |
| Policy Modeling (ABAC) | **Remove ABAC from PolicyType; use policy_document entitlements** | Separates IGA-evaluated policies from target-evaluated policies |

---

## Technology Stack Finalized

**Updated Technical Context** (resolves all NEEDS CLARIFICATION):

**Language/Version**: TypeScript 5.x with Next.js 14+ (App Router)
**Primary Dependencies**: Next.js, NextAuth.js, **Prisma ORM**, **PostgreSQL 16 with Apache AGE**, **shadcn/ui + Tailwind CSS**
**Storage**: PostgreSQL with `public` schema (entities) + `audit` schema (events), time-series partitioning
**Testing**: Vitest (unit/integration), Playwright (E2E), contract tests for connectors
**Target Platform**: Node.js 20+, Vercel (primary) or self-hosted Docker
**UI Framework**: shadcn/ui components + Tailwind CSS v3 (utility-first styling)
**Policy Engine**: Embedded TypeScript evaluator (Phase 1) + OPA HTTP (Phase 2+)
**Event Bus**: In-process event emitter with PostgreSQL audit log persistence
**Connector Framework**: TypeScript interface-based with factory pattern
**Scheduled Jobs**: Vercel Cron (Vercel deployments) or node-cron (self-hosted)
**Credential Storage**: Environment variables (prototype), OpenBao integration prepared (production)

---

## Next Steps

- [x] Research complete (all NEEDS CLARIFICATION resolved)
- [ ] Phase 1: Generate `data-model.md` (database schema + entity design)
- [ ] Phase 1: Generate `contracts/` (OpenAPI spec for API Routes)
- [ ] Phase 1: Generate `quickstart.md` (developer onboarding)
- [ ] Phase 1: Update agent context with finalized technology stack
- [ ] Re-evaluate Constitution Check with design artifacts

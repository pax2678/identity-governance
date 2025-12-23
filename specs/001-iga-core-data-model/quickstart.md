# Quickstart Guide: IGA Core Data Model

**Feature**: IGA Core Data Model
**Branch**: `001-iga-core-data-model`
**Date**: 2025-12-23
**Phase**: Phase 1 (Design & Contracts)

## Purpose

This guide helps developers onboard to the IGA prototype project. Follow these steps to set up your local development environment and understand the codebase architecture.

---

## Prerequisites

- **Node.js**: 20.x or later ([download](https://nodejs.org/))
- **PostgreSQL**: 16+ with Apache AGE extension ([installation guide](#database-setup))
- **Git**: For version control
- **Code Editor**: VS Code recommended (with Prisma extension)

---

## Quick Setup (5 Minutes)

### 1. Clone Repository and Checkout Feature Branch

```bash
git clone <repository-url> identity-governance
cd identity-governance
git checkout 001-iga-core-data-model
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create `.env.local` file in project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/identity_governance?schema=public"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Connector Credentials (Phase 1: LDAP, SCIM, K8s)
LDAP_BIND_DN="cn=admin,dc=example,dc=com"
LDAP_BIND_PASSWORD="your-ldap-password"
SCIM_API_KEY="your-scim-api-key"
K8S_SERVICE_ACCOUNT_TOKEN="your-k8s-token"

# Feature Flags (optional)
ENABLE_OPA_INTEGRATION="false"  # Set true when OPA server is running
```

### 4. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL with Apache AGE extension
docker run -d \
  --name iga-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=identity_governance \
  -p 5432:5432 \
  apache/age-postgres:PG16_latest

# Wait for PostgreSQL to start (10 seconds)
sleep 10

# Enable AGE extension
docker exec -it iga-postgres psql -U postgres -d identity_governance -c "CREATE EXTENSION IF NOT EXISTS age;"
```

#### Option B: Local PostgreSQL Installation

1. Install PostgreSQL 16+ from [postgresql.org](https://www.postgresql.org/download/)
2. Install Apache AGE extension:

```bash
# Clone Apache AGE
git clone https://github.com/apache/age.git
cd age
git checkout release/PG16/1.5.0

# Build and install (requires PostgreSQL dev packages)
make PG_CONFIG=/path/to/pg_config
sudo make PG_CONFIG=/path/to/pg_config install

# Enable extension in database
psql -U postgres -d identity_governance -c "CREATE EXTENSION IF NOT EXISTS age;"
```

3. Create database:

```bash
createdb identity_governance
```

### 5. Run Database Migrations

```bash
# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev --name init
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure Overview

See [plan.md](plan.md#project-structure) for detailed directory tree. Key directories:

- **`app/`**: Next.js App Router (pages + API routes)
  - `app/api/`: REST API endpoints (Identity Registry, Governance, Connectors)
  - `app/(dashboard)/`: Admin dashboard UI
  - `app/(portal)/`: Self-service portal UI
- **`lib/`**: Shared business logic
  - `lib/db/`: Prisma schema and database client
  - `lib/models/`: Domain model TypeScript types (Zod validation)
  - `lib/services/`: Business logic services (identity, governance, provisioning)
  - `lib/connectors/`: Connector framework (LDAP, SCIM, K8s)
  - `lib/policy/`: Policy evaluation (embedded + OPA integration)
- **`tests/`**: Unit, integration, and E2E tests
- **`specs/001-iga-core-data-model/`**: Feature documentation
  - [spec.md](spec.md): Feature specification (user stories, requirements)
  - [plan.md](plan.md): Implementation plan (architecture, tech stack)
  - [research.md](research.md): Technology decision rationale
  - [data-model.md](data-model.md): Database schema and entity design
  - [contracts/](contracts/): OpenAPI specifications

---

## Development Workflow

### Phase-Based Development (Governance-First Approach)

The IGA prototype follows a phased delivery model (P1-P6) aligned with the [Constitution Principle I: Governance First, Provisioning Later](../../../.specify/memory/constitution.md#principle-i-governance-first-provisioning-later).

**Implementation Order**:

1. **P1 (Identity & Account Correlation)**: Read-only inventory [CURRENT PHASE]
   - Focus: Identity registry, account discovery, correlation
   - Entities: `Identity`, `Account`, `IdentityAccountLink`
   - API Routes: `/api/identities`, `/api/accounts`
   - Connectors: Discovery methods only (LDAP, SCIM, K8s)

2. **P2 (Entitlement Discovery)**: Cataloging and risk assessment
   - Focus: Entitlement catalog, risk scoring
   - Entities: `Entitlement`, `EntitlementHierarchy`
   - API Routes: `/api/entitlements`

3. **P3 (Grant Discovery)**: Access tracking
   - Focus: Grant discovery, effective access queries
   - Entities: `AccountEntitlementGrant`
   - API Routes: `/api/grants`
   - Graph Queries: Transitive access calculation (Apache AGE)

4. **P4 (Access Request/Approval)**: Governance layer
   - Focus: Request workflows, approval routing, SoD checks
   - Entities: `AccessAssignment`, `Policy` (SoD)
   - API Routes: `/api/access-requests`, `/api/policies`

5. **P5 (Provisioning)**: Automation layer
   - Focus: Grant/revoke execution, reconciliation
   - Connectors: Provisioning methods (grant_entitlement, revoke_entitlement)
   - Jobs: Expiry enforcement, reconciliation

6. **P6 (Certification)**: Ongoing compliance
   - Focus: Certification campaigns, attestation
   - Entities: `CertificationCampaign`, `CertificationReview`
   - API Routes: `/api/certifications`

### Running Tests

```bash
# Unit tests (Vitest)
npm run test

# Integration tests (requires test database)
npm run test:integration

# E2E tests (Playwright)
npm run test:e2e

# Contract tests (connector interface compliance)
npm run test:contracts
```

### Linting and Formatting

```bash
# ESLint
npm run lint

# Prettier
npm run format

# Type checking
npm run type-check
```

---

## Key Concepts

### 1. Identity-Account Correlation

**Problem**: Users have multiple accounts across systems (AD, AWS, SaaS apps). IGA must correlate these accounts to a single identity.

**Solution**: `IdentityAccountLink` entity with correlation keys (email, employeeId).

**Code Location**: [lib/services/identity-registry/correlation.service.ts](../../lib/services/identity-registry/correlation.service.ts)

**Example**:

```typescript
// Correlate accounts to identity by email
const accounts = await correlationService.correlateByEmail(identity.attributes.email);
// Create IdentityAccountLink records
for (const account of accounts) {
  await db.identityAccountLink.create({
    identityId: identity.id,
    accountId: account.id,
    relationType: 'PRIMARY',
    source: 'IMPORTED'
  });
}
```

### 2. Connector Framework

**Problem**: Target systems (LDAP, SCIM, K8s) have different APIs and data models.

**Solution**: Pluggable connector pattern implementing standardized contract (see [connector-base-contract.yaml](contracts/connector-base-contract.yaml)).

**Code Location**: [lib/connectors/base/connector.interface.ts](../../lib/connectors/base/connector.interface.ts)

**Connector Families** (from coverage-matrix.yaml):
- **LDAP**: OpenLDAP, FreeIPA (groups, roles, users)
- **SCIM**: SaaS apps (users, groups, roles)
- **idp_admin**: Keycloak, authentik (IdP users, OAuth clients, scopes)
- **k8s_api**: Kubernetes (service accounts, RBAC bindings)
- **iac_opentofu**: Cloud IAM via IaC (roles, policies)
- **policy_opa**: OPA (policy documents)
- **rebac_fga**: OpenFGA, SpiceDB (tuples, relations)

**Example**:

```typescript
import { IConnector } from '@/lib/connectors/base/connector.interface';
import { LdapConnector } from '@/lib/connectors/ldap/ldap.connector';

// Get connector for system
const connector: IConnector = await connectorRegistry.getConnector(systemId);

// Discover accounts
const response = await connector.discoverAccounts({
  system_id: systemId,
  account_type: 'ldap_user',
  page_size: 100
});

// Upsert accounts to database
for (const account of response.accounts) {
  await db.account.upsert({
    where: { systemId_nativeId: { systemId, nativeId: account.native_id } },
    create: { ...account, systemId },
    update: { status: account.status, lastSeenAt: new Date() }
  });
}
```

### 3. Graph Queries (Effective Access)

**Problem**: Users have transitive access via nested groups (e.g., user → GroupA → GroupB → Entitlement).

**Solution**: Apache AGE (graph database extension) for Cypher queries.

**Code Location**: [lib/utils/graph-query.ts](../../lib/utils/graph-query.ts)

**Example**:

```typescript
import { executeGraphQuery } from '@/lib/utils/graph-query';

// Find effective access for identity (including transitive grants)
const query = `
  MATCH path = (i:Identity {id: $identityId})
    -[:LINKS_TO]->(:Account)
    -[:HAS_GRANT]->(:Grant)
    -[:GRANTS]->(:Entitlement)
    -[:CHILD_OF*0..5]->(parent:Entitlement)
  RETURN DISTINCT parent, path
`;

const effectiveAccess = await executeGraphQuery(query, { identityId });
```

### 4. Policy Evaluation (SoD & Birthright)

**Problem**: Enforce Segregation of Duties (SoD) rules and auto-assign birthright access based on identity attributes.

**Solution**: Embedded TypeScript evaluator (Phase 1) + OPA integration (Phase 2).

**Code Location**: [lib/policy/sod-rules.ts](../../lib/policy/sod-rules.ts), [lib/policy/birthright-rules.ts](../../lib/policy/birthright-rules.ts)

**Example (Embedded SoD Check)**:

```typescript
import { checkSoDViolation } from '@/lib/policy/sod-rules';

// Check if granting entitlement would violate SoD policy
const violation = await checkSoDViolation(identityId, proposedEntitlementId);
if (violation) {
  throw new Error(`SoD violation: ${violation.policyId}`);
}
```

**Example (Birthright Rule)**:

```typescript
import { evaluateBirthrightRules } from '@/lib/policy/birthright-rules';

// Auto-assign entitlements based on identity attributes
const identity = await db.identity.findUnique({ where: { id: identityId } });
const entitlements = await evaluateBirthrightRules(identity);
// Create grants for birthright entitlements
for (const entitlement of entitlements) {
  await db.accountEntitlementGrant.create({
    accountId: primaryAccount.id,
    entitlementId: entitlement.id,
    grantType: 'DIRECT',
    state: 'ACTIVE'
  });
}
```

---

## API Endpoints Reference

See OpenAPI specifications in [contracts/](contracts/):

- **[identity-registry-api.yaml](contracts/identity-registry-api.yaml)**: Identity, Account, Entitlement, Grant CRUD + graph queries
- **[governance-api.yaml](contracts/governance-api.yaml)**: Access requests, certifications, provisioning tasks, SoD policies
- **[connector-base-contract.yaml](contracts/connector-base-contract.yaml)**: Connector interface contract

### Quick Examples

**List Identities**:
```bash
curl http://localhost:3000/api/identities?status=ACTIVE
```

**Get Effective Access for Identity**:
```bash
curl http://localhost:3000/api/identities/{id}/effective-access
```

**Create Access Request**:
```bash
curl -X POST http://localhost:3000/api/access-requests \
  -H "Content-Type: application/json" \
  -d '{
    "subjectId": "identity-uuid",
    "subjectType": "IDENTITY",
    "targetId": "entitlement-uuid",
    "targetType": "ENTITLEMENT",
    "action": "GRANT",
    "justification": "Need access for project XYZ"
  }'
```

**Approve Access Request**:
```bash
curl -X POST http://localhost:3000/api/access-requests/{id}/approve \
  -H "Content-Type: application/json" \
  -d '{ "decision": "APPROVED" }'
```

---

## Database Schema

See [data-model.md](data-model.md) for complete schema. Key entities:

- **`identities`**: Actors (human, service, agent, device)
- **`systems`**: Target applications (LDAP, SaaS, K8s, etc.)
- **`accounts`**: Identity presence in target system
- **`entitlements`**: Grantable capabilities (group, role, policy, license, etc.)
- **`identity_account_links`**: Correlation between identities and accounts
- **`account_entitlement_grants`**: Account possession of entitlement
- **`access_assignments`**: Governance wrapper (requests, approvals)
- **`audit.events`**: Append-only audit log

### Prisma Studio (Database GUI)

```bash
npx prisma studio
```

Open [http://localhost:5555](http://localhost:5555) to browse database.

---

## Scheduled Jobs (Vercel Cron)

See [research.md](research.md#6-time-bound-grant-enforcement-background-job-scheduler-vs-nextjs-cron-vs-external-scheduler) for scheduler decision.

**Jobs** (defined in `app/api/cron/`):

1. **Expiry Enforcement** (`/api/cron/enforce-expiry/route.ts`): Hourly (SC-007: 1-hour expiry enforcement)
   - Query grants with `endTime < NOW()` and `state = ACTIVE`
   - Update state to `EXPIRED`, create revocation tasks

2. **Identity Sync** (`/api/cron/sync-identities/route.ts`): Every 15 minutes (SC-003: <1 hour lag)
   - Fetch identity updates from HRIS/authoritative source
   - Detect Joiner-Mover-Leaver events

3. **Grant Reconciliation** (`/api/cron/reconcile-grants/route.ts`): Every 6 hours (default)
   - Discover grants in target systems
   - Detect drift (out-of-band grants, orphaned grants)

**Local Development**: Jobs run automatically via Vercel Cron config. For manual trigger:

```bash
curl -X POST http://localhost:3000/api/cron/enforce-expiry \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Troubleshooting

### Database Connection Issues

**Error**: `Can't reach database server`

**Solution**:
1. Verify PostgreSQL is running: `pg_isready`
2. Check `DATABASE_URL` in `.env.local`
3. Test connection: `psql $DATABASE_URL`

### Apache AGE Extension Not Found

**Error**: `extension "age" does not exist`

**Solution**:
```bash
# Enable extension in database
psql -U postgres -d identity_governance -c "CREATE EXTENSION IF NOT EXISTS age;"

# Verify
psql -U postgres -d identity_governance -c "SELECT extname FROM pg_extension WHERE extname = 'age';"
```

### Prisma Migration Errors

**Error**: `Migration failed to apply cleanly`

**Solution**:
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually rollback and re-apply
npx prisma migrate resolve --rolled-back <migration-name>
npx prisma migrate deploy
```

### Connector Authentication Failures

**Error**: `LDAP bind failed: Invalid credentials`

**Solution**:
1. Verify credentials in `.env.local` (check `LDAP_BIND_DN` and `LDAP_BIND_PASSWORD`)
2. Test connection manually: `ldapsearch -H ldap://host -D "$LDAP_BIND_DN" -w "$LDAP_BIND_PASSWORD"`
3. Check connector config in `systems` table

---

## Next Steps

1. **Read Feature Specification**: [spec.md](spec.md) for user stories and requirements
2. **Review Data Model**: [data-model.md](data-model.md) for entity relationships
3. **Explore API Contracts**: [contracts/](contracts/) for endpoint specifications
4. **Run Tests**: `npm run test` to verify setup
5. **Start Implementing P1**: Focus on identity registry and account discovery
6. **Join Team Standup**: [Calendar link or Slack channel]

---

## Resources

- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Prisma Documentation**: [prisma.io/docs](https://www.prisma.io/docs)
- **Apache AGE Documentation**: [age.apache.org](https://age.apache.org)
- **NextAuth.js Guide**: [next-auth.js.org](https://next-auth.js.org)
- **Coverage Matrix**: [.specify/memory/coverage-matrix.yaml](../../../.specify/memory/coverage-matrix.yaml)
- **Project Constitution**: [.specify/memory/constitution.md](../../../.specify/memory/constitution.md)

---

## Support

- **Slack Channel**: #iga-dev
- **Issue Tracker**: [GitHub Issues](https://github.com/org/identity-governance/issues)
- **Architecture Questions**: Tag @tech-lead in Slack
